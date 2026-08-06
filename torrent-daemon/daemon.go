package daemon

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/storage"
	"golang.org/x/time/rate"
)

// metainfoTimeout is how long to wait for a magnet's metadata before giving up.
const metainfoTimeout = 60 * time.Second

// warmupBytes is how much of the start of a stream to fetch before returning
// the URL, so playback starts with little to no initial stall.
const warmupBytes = 512 * 1024

// warmupTimeout bounds how long we wait for the warm-up bytes.
const warmupTimeout = 15 * time.Second

// streamReadahead is how far ahead of the current read position the client
// keeps fetching while streaming, giving a comfortable playback buffer.
const streamReadahead = 20 * 1024 * 1024

var (
	client        *torrent.Client
	dataDir       string
	storageCloser func() error
	mu            sync.RWMutex
)

// ── Streaming ──────────────────────────────────────────────
// A live stream serves a torrent's video file over localhost HTTP. A
// torrent.Reader fetches pieces on demand, prioritizing the readahead window
// around the current position, so the player buffers while it plays.

var (
	streamsMu  sync.RWMutex
	streams    = map[string]*streamEntry{}
	streamAddr string
	streamSrv  *http.Server
	streamErr  error
	streamSet  bool
)

// streamEntry describes one active stream URL. The torrent.File it references
// is used to create a fresh, independent reader per HTTP request, because a
// torrent.Reader is not safe for concurrent use and video players issue
// overlapping byte-range requests.
type streamEntry struct {
	size int64
	file *torrent.File
	t    *torrent.Torrent
}

// fileInfo describes one file inside a torrent, used by ProbeTorrent so callers
// can enumerate a pack's contents and pick a specific file to stream/download.
type fileInfo struct {
	Index int    `json:"index"`
	Path  string `json:"path"`
	Size  int64  `json:"size"`
	Video bool   `json:"video"`
}

var streamVideoExts = map[string]bool{
	".mp4":  true,
	".mkv":  true,
	".avi":  true,
	".mov":  true,
	".webm": true,
	".m4v":  true,
	".flv":  true,
	".ts":   true,
}

func isVideoPath(path string) bool {
	return streamVideoExts[strings.ToLower(filepath.Ext(path))]
}

// startStreamServer binds a localhost HTTP server used to serve active
// streams. The port is ephemeral; the concrete URL is captured in streamAddr.
func startStreamServer() error {
	streamsMu.Lock()
	defer streamsMu.Unlock()
	if streamSet {
		return streamErr
	}
	streamSet = true

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		streamErr = err
		return err
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/stream/", handleStreamRequest)
	streamSrv = &http.Server{Handler: mux}
	streamAddr = fmt.Sprintf("http://127.0.0.1:%d/stream/", listener.Addr().(*net.TCPAddr).Port)
	streamErr = nil

	go func() {
		if serveErr := streamSrv.Serve(listener); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			log.Printf("torrent stream server: %v", serveErr)
		}
	}()
	return nil
}

func stopStreamServer() {
	streamsMu.Lock()
	defer streamsMu.Unlock()
	if streamSrv != nil {
		streamSrv.Close()
		streamSrv = nil
	}
	streamSet = false
	streamAddr = ""
	for hash, entry := range streams {
		entry.t.Drop()
		delete(streams, hash)
	}
}

// handleStreamRequest serves an active stream with byte-range support.
func handleStreamRequest(w http.ResponseWriter, r *http.Request) {
	hash := strings.TrimPrefix(r.URL.Path, "/stream/")
	hash = strings.Trim(hash, "/")

	streamsMu.RLock()
	entry := streams[hash]
	streamsMu.RUnlock()
	if entry == nil {
		http.NotFound(w, r)
		return
	}

	size := entry.size
	start := int64(0)
	end := size - 1

	if rng := r.Header.Get("Range"); rng != "" {
		// Only single byte ranges are handled; anything else is served whole.
		if strings.HasPrefix(rng, "bytes=") {
			parts := strings.SplitN(strings.TrimPrefix(rng, "bytes="), "-", 2)
			if s, err := strconv.ParseInt(strings.TrimSpace(parts[0]), 10, 64); err == nil {
				start = s
			}
			if len(parts) == 2 && parts[1] != "" {
				if e, err := strconv.ParseInt(strings.TrimSpace(parts[1]), 10, 64); err == nil {
					end = e
				}
			}
		}
		if start < 0 || start >= size {
			w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", size))
			http.Error(w, "requested range not satisfiable", http.StatusRequestedRangeNotSatisfiable)
			return
		}
		if end >= size {
			end = size - 1
		}
	} else {
		start = 0
		end = size - 1
	}

	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Content-Type", contentTypeFor(entry.file.DisplayPath()))
	w.Header().Set("Content-Length", strconv.FormatInt(end-start+1, 10))

	if start > 0 || end < size-1 {
		w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, size))
	}

	if r.Method == http.MethodHead {
		if start > 0 || end < size-1 {
			w.WriteHeader(http.StatusPartialContent)
		}
		return
	}

	if start > 0 || end < size-1 {
		w.WriteHeader(http.StatusPartialContent)
	}

	// Each request gets its own reader so concurrent byte-range requests cannot
	// interleave Seek/Read calls on a single shared position. Readers of the same
	// file are independent; the torrent's piece cache is shared, so pieces
	// fetched by one request still help the others.
	reader := entry.file.NewReader()
	reader.SetReadahead(streamReadahead)
	defer reader.Close()

	if _, err := reader.Seek(start, io.SeekStart); err != nil {
		return
	}

	buf := make([]byte, 64*1024)
	remaining := end - start + 1
	for remaining > 0 {
		chunk := buf
		if int64(len(chunk)) > remaining {
			chunk = buf[:remaining]
		}
		n, err := reader.ReadContext(r.Context(), chunk)
		if n > 0 {
			if _, werr := w.Write(chunk[:n]); werr != nil {
				return
			}
			remaining -= int64(n)
		}
		if err != nil {
			return
		}
	}
}

func contentTypeFor(name string) string {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".mp4", ".m4v", ".mov":
		return "video/mp4"
	case ".mkv":
		return "video/x-matroska"
	case ".webm":
		return "video/webm"
	case ".avi":
		return "video/x-msvideo"
	case ".ts":
		return "video/mp2t"
	case ".flv":
		return "video/x-flv"
	default:
		return "application/octet-stream"
	}
}

// ── LAN serving ──────────────────────────────────────────────
// When casting, the phone must serve video over the LAN so the Chromecast
// receiver can fetch it. A separate HTTP server binds to 0.0.0.0 with a
// per-session random token in every URL to prevent unauthorized access.
// The server handles both torrent streams (already in memory via the
// locked reader) and downloaded files (served from disk).

var (
	lanMu      sync.Mutex
	lanSrv     *http.Server
	lanAddr    string // e.g. "http://192.168.1.42:54321"
	lanToken   string // random per-session token
	lanActive  bool
	lanFileDir string // downloads root directory for file serving
)

// getLanIP enumerates network interfaces and returns the first non-loopback
// IPv4 address (typically the WiFi interface).
func getLanIP() string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return "127.0.0.1"
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "127.0.0.1"
}

func generateToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Fallback — token is only for basic protection, not security-critical
		return "fallback-token"
	}
	return fmt.Sprintf("%x", b)
}

// StartLANServing binds a public HTTP server on a random port for casting.
// The server requires a per-session token in every request path.
// fileDir is the downloads root for serving local files (may be empty).
func StartLANServing(fileDir string) error {
	lanMu.Lock()
	defer lanMu.Unlock()

	if lanActive {
		return nil
	}

	ip := getLanIP()
	listener, err := net.Listen("tcp", ip+":0")
	if err != nil {
		// Fallback to all interfaces if binding to specific IP fails
		listener, err = net.Listen("tcp", "0.0.0.0:0")
		if err != nil {
			return fmt.Errorf("lan server: %w", err)
		}
	}

	port := listener.Addr().(*net.TCPAddr).Port
	token := generateToken()

	mux := http.NewServeMux()
	mux.HandleFunc("/cast/stream/", handleLANServeStream)
	mux.HandleFunc("/cast/file/", handleLANServeFile)

	lanSrv = &http.Server{Handler: mux}
	lanAddr = fmt.Sprintf("http://%s:%d", ip, port)
	lanToken = token
	lanFileDir = fileDir
	lanActive = true

	go func() {
		if err := lanSrv.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("lan server: %v", err)
		}
	}()

	return nil
}

// StopLANServing tears down the public server and drops all active sessions.
func StopLANServing() {
	lanMu.Lock()
	defer lanMu.Unlock()

	if lanSrv != nil {
		lanSrv.Close()
		lanSrv = nil
	}
	lanActive = false
	lanAddr = ""
	lanToken = ""
	lanFileDir = ""
}

// GetLanStreamURL returns the full LAN URL for a torrent stream, including the
// session token. Returns "" if the LAN server is not active.
func GetLanStreamURL(infoHashHex string) string {
	lanMu.Lock()
	defer lanMu.Unlock()
	if !lanActive || lanAddr == "" {
		return ""
	}
	return fmt.Sprintf("%s/cast/stream/%s/%s", lanAddr, lanToken, infoHashHex)
}

// GetLanFileURL returns the full LAN URL for a local downloaded file.
func GetLanFileURL(filePath string) string {
	lanMu.Lock()
	defer lanMu.Unlock()
	if !lanActive || lanAddr == "" {
		return ""
	}
	encoded := url.PathEscape(filePath)
	return fmt.Sprintf("%s/cast/file/%s/%s", lanAddr, lanToken, encoded)
}

func handleLANServeStream(w http.ResponseWriter, r *http.Request) {
	// Path: /cast/stream/<token>/<hash>
	parts := strings.SplitN(strings.TrimPrefix(r.URL.Path, "/cast/stream/"), "/", 2)
	if len(parts) != 2 || parts[0] != lanToken {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	infoHash := parts[1]

	// CORS headers for Chromecast receiver
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Range")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Delegate to the existing stream handler by re-writing the path
	r.URL.Path = "/stream/" + infoHash
	handleStreamRequest(w, r)
}

func handleLANServeFile(w http.ResponseWriter, r *http.Request) {
	// Path: /cast/file/<token>/<encoded-path>
	rest := strings.TrimPrefix(r.URL.Path, "/cast/file/")
	parts := strings.SplitN(rest, "/", 2)
	if len(parts) != 2 || parts[0] != lanToken {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	rawPath, err := url.PathUnescape(parts[1])
	if err != nil {
		http.Error(w, "bad path", http.StatusBadRequest)
		return
	}

	// CORS headers for Chromecast receiver
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Range")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Serve the file from disk. Path traversal is limited to the downloads
	// directory by the caller (fileDir).
	http.ServeFile(w, r, rawPath)
}

// Start initializes the torrent client.
func Start(storagePath string) error {
	mu.Lock()
	defer mu.Unlock()

	if client != nil {
		return nil // already started
	}

	dataDir = storagePath
	config := torrent.NewDefaultClientConfig()
	config.DataDir = storagePath
	// Optimize for fast startup and sequential downloading
	config.NoDHT = false
	config.Seed = false

	// ── Speed tuning ──────────────────────────────────────────
	// BitTorrent already downloads pieces from many peers in parallel (the
	// equivalent of aria2c/IDM segmented downloads). The levers below widen
	// that parallelism and remove bottlenecks.
	//
	// More established/half-open connections per torrent means more peers
	// actively serving us pieces at once.
	config.EstablishedConnsPerTorrent = 150
	config.HalfOpenConnsPerTorrent = 50
	config.TotalHalfOpenConns = 250

	// Dial peers faster at start so the swarm fills quickly.
	config.DialRateLimiter = rate.NewLimiter(50, 50)

	// Hash verification is a common stall point on fast swarms; hash more
	// pieces concurrently.
	config.PieceHashersPerTorrent = 4

	// Allow a larger pipeline of unverified bytes so we keep requesting from
	// peers while earlier pieces are still being hashed.
	config.MaxUnverifiedBytes = 256 << 20

	// Keep aggressively discovering and keeping peers.
	config.TorrentPeersLowWater = 200
	config.TorrentPeersHighWater = 2000

	// Fixed listen port so incoming connections (and any port-forwarding)
	// are stable across restarts. Peers can then connect to us, not just us
	// to them.
	config.ListenPort = 42069

	// Write pieces straight into the mmap-backed page cache instead of doing
	// per-piece file seeks; noticeably faster on Android storage.
	mmapStorage := storage.NewMMap(storagePath)
	config.DefaultStorage = mmapStorage

	var err error
	client, err = torrent.NewClient(config)
	if err != nil {
		return err
	}

	// The client does not close a custom DefaultStorage, so close it here on
	// shutdown once the client is done with it.
	storageCloser = mmapStorage.Close

	return startStreamServer()
}

// Stop gracefully shuts down the torrent client and the stream server.
func Stop() {
	mu.Lock()
	defer mu.Unlock()

	stopStreamServer()

	if client != nil {
		client.Close()
		client = nil
	}

	if storageCloser != nil {
		storageCloser()
		storageCloser = nil
	}
}

// AddMagnet adds a torrent via magnet link and returns its InfoHash.
func AddMagnet(uri string) (string, error) {
	mu.RLock()
	defer mu.RUnlock()

	if client == nil {
		return "", errors.New("torrent client not started")
	}

	t, err := client.AddMagnet(uri)
	if err != nil {
		return "", err
	}

	// A fresh magnet has no metainfo yet. Calling DownloadAll (and NumPieces)
	// before it resolves panics on a nil Info, crashing the process. Wait for
	// the metadata to be fetched from peers/DHT/trackers before requesting all
	// pieces.
	select {
	case <-t.GotInfo():
	case <-time.After(metainfoTimeout):
		t.Drop()
		return "", errors.New("timed out waiting for torrent metadata")
	}

	// Start downloading immediately
	t.DownloadAll()

	hash := t.InfoHash().HexString()
	clearDownloadTarget(hash)

	return hash, nil
}

// ── Selective downloads ──────────────────────────────────────
// A season/series pack holds many episodes; AddMagnetFile pins the download to
// a single file's pieces. Progress is then reported relative to that file so
// the UI reflects the episode the user actually asked for, not the whole pack.

var (
	downloadTargetsMu sync.Mutex
	// downloadTargets maps an info hash to the set of file indices whose pieces
	// are being downloaded. Several files of the same pack (e.g. episodes 2, 5
	// and 7) share one torrent, so a set (not a single index) is required.
	downloadTargets = map[string]map[int]struct{}{}
)

func clearDownloadTarget(infoHashHex string) {
	downloadTargetsMu.Lock()
	delete(downloadTargets, infoHashHex)
	downloadTargetsMu.Unlock()
}

// downloadTargetIndices returns the torrent's enabled file indices. Callers
// must hold mu when calling this (it takes downloadTargetsMu itself).
func downloadTargetIndices(infoHashHex string) (indices []int, ok bool) {
	downloadTargetsMu.Lock()
	defer downloadTargetsMu.Unlock()
	set, exists := downloadTargets[infoHashHex]
	if !exists {
		return nil, false
	}
	indices = make([]int, 0, len(set))
	for index := range set {
		indices = append(indices, index)
	}
	return indices, true
}

// AddMagnetFiles adds a magnet but downloads only the pieces belonging to the
// given files (e.g. a few episodes out of a season pack). indices is a
// comma-separated list of file indices ("2,5,7"); gomobile cannot pass Go
// slices of int. Returns the torrent's InfoHash. Indices are unioned into the
// torrent's enabled-file set, so adding a second file of an already-selected
// pack keeps the first one downloading instead of clobbering it.
func AddMagnetFiles(uri string, indices string) (string, error) {
	mu.RLock()
	if client == nil {
		mu.RUnlock()
		return "", errors.New("torrent client not started")
	}
	clientRef := client
	mu.RUnlock()

	var selected []int
	if strings.TrimSpace(indices) != "" {
		for _, part := range strings.Split(indices, ",") {
			index, err := strconv.Atoi(strings.TrimSpace(part))
			if err != nil {
				return "", errors.New("invalid file index: " + part)
			}
			selected = append(selected, index)
		}
	}

	t, err := clientRef.AddMagnet(uri)
	if err != nil {
		return "", err
	}

	select {
	case <-t.GotInfo():
	case <-time.After(metainfoTimeout):
		t.Drop()
		return "", errors.New("timed out waiting for torrent metadata")
	}

	files := t.Files()
	hash := t.InfoHash().HexString()

	downloadTargetsMu.Lock()
	set, exists := downloadTargets[hash]
	if !exists {
		set = map[int]struct{}{}
		downloadTargets[hash] = set
	}
	for _, index := range selected {
		if index < 0 || index >= len(files) {
			downloadTargetsMu.Unlock()
			t.Drop()
			return "", errors.New("file index out of range")
		}
		set[index] = struct{}{}
	}
	targets := make([]int, 0, len(set))
	for index := range set {
		targets = append(targets, index)
	}
	downloadTargetsMu.Unlock()

	// Pin the download to the selected files' pieces.
	t.CancelPieces(0, t.NumPieces())
	for _, index := range targets {
		files[index].Download()
	}

	return hash, nil
}

// AddMagnetFile adds a magnet but downloads only the pieces belonging to the
// file at the given index (e.g. one episode out of a season pack). Returns the
// torrent's InfoHash.
func AddMagnetFile(uri string, index int) (string, error) {
	return AddMagnetFiles(uri, strconv.Itoa(index))
}

// SetFileEnabled adds (or removes) a single file from a torrent's enabled-file
// set without disturbing the other selected files, e.g. when the user pauses,
// resumes or deletes one episode of a multi-file download. Returns the number
// of enabled files remaining after the change.
func SetFileEnabled(infoHashHex string, index int, enabled bool) (int, error) {
	mu.RLock()
	if client == nil {
		mu.RUnlock()
		return 0, errors.New("torrent client not started")
	}
	clientRef := client
	mu.RUnlock()

	for _, t := range clientRef.Torrents() {
		if t.InfoHash().HexString() != infoHashHex {
			continue
		}
		if t.Info() == nil {
			return 0, errors.New("torrent metadata not resolved yet")
		}
		files := t.Files()
		if index < 0 || index >= len(files) {
			return 0, errors.New("file index out of range")
		}

		downloadTargetsMu.Lock()
		remaining := 0
		if enabled {
			set := downloadTargets[infoHashHex]
			if set == nil {
				set = map[int]struct{}{}
				downloadTargets[infoHashHex] = set
			}
			set[index] = struct{}{}
			remaining = len(set)
		} else if set := downloadTargets[infoHashHex]; set != nil {
			delete(set, index)
			remaining = len(set)
			if remaining == 0 {
				delete(downloadTargets, infoHashHex)
			}
		}
		downloadTargetsMu.Unlock()

		if enabled {
			files[index].Download()
		} else {
			files[index].SetPriority(torrent.PiecePriorityNone)
		}
		return remaining, nil
	}
	return 0, errors.New("torrent not found")
}

// GetFileProgress returns the download progress (0.0 to 1.0) of a single file
// within a torrent, so each episode of a multi-file download reports its own
// progress.
func GetFileProgress(infoHashHex string, index int) float64 {
	mu.RLock()
	defer mu.RUnlock()

	t := findTorrentLocked(infoHashHex)
	if t == nil || t.Info() == nil {
		return 0.0
	}
	files := t.Files()
	if index < 0 || index >= len(files) {
		return 0.0
	}
	f := files[index]
	if f.Length() == 0 {
		return 0.0
	}
	return float64(f.BytesCompleted()) / float64(f.Length())
}

// ProbeTorrent adds a magnet and returns a JSON description of its files
// without downloading anything, so callers can inspect a pack's contents
// before deciding which file to stream or download.
func ProbeTorrent(uri string) (string, error) {
	mu.RLock()
	if client == nil {
		mu.RUnlock()
		return "", errors.New("torrent client not started")
	}
	clientRef := client
	mu.RUnlock()

	t, err := clientRef.AddMagnet(uri)
	if err != nil {
		return "", err
	}

	select {
	case <-t.GotInfo():
	case <-time.After(metainfoTimeout):
		t.Drop()
		return "", errors.New("timed out waiting for torrent metadata")
	}

	return torrentFileInfoList(t)
}

func torrentFileInfoList(t *torrent.Torrent) (string, error) {
	if t.Info() == nil {
		return "", errors.New("torrent metadata unavailable")
	}
	files := t.Files()
	list := make([]fileInfo, 0, len(files))
	for i, f := range files {
		path := f.DisplayPath()
		list = append(list, fileInfo{
			Index: i,
			Path:  path,
			Size:  f.Length(),
			Video: isVideoPath(path),
		})
	}
	b, err := json.Marshal(list)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// GetProgress returns the download progress (0.0 to 1.0). For selective
// downloads (AddMagnetFile) progress is measured against the targeted file.
func GetProgress(infoHashHex string) float64 {
	mu.RLock()
	defer mu.RUnlock()

	if client == nil {
		return 0
	}

	for _, t := range client.Torrents() {
		if t.InfoHash().HexString() == infoHashHex {
			info := t.Info()
			if info == nil {
				return 0.0 // metadata not resolved yet
			}
			if indices, ok := downloadTargetIndices(infoHashHex); ok {
				files := t.Files()
				var completed, total int64
				for _, index := range indices {
					if index < 0 || index >= len(files) {
						continue
					}
					completed += files[index].BytesCompleted()
					total += files[index].Length()
				}
				if total == 0 {
					return 0.0
				}
				return float64(completed) / float64(total)
			}
			if info.TotalLength() == 0 {
				return 0.0
			}
			return float64(t.BytesCompleted()) / float64(info.TotalLength())
		}
	}

	return 0.0
}

// ── Transfer-rate sampling ──────────────────────────────────
// anacrolix exposes cumulative byte counters per torrent. Rates are derived by
// differencing those counters across calls; a per-hash sample table keeps the
// last seen counters so consecutive polls yield real, stable speeds.

type rateState struct {
	at time.Time
	dl int64
	ul int64
}

var (
	ratesMu  sync.Mutex
	rateSeen = map[string]*rateState{}
)

// sampleRates computes the download/upload rate in bytes/sec since the last
// call for a torrent, seeding the tracker on first sight.
func sampleRates(hash string, st torrent.TorrentStats) (dlSpeed, ulSpeed float64) {
	now := time.Now()
	dl := st.BytesReadUsefulData.Int64()
	ul := st.BytesWrittenData.Int64()

	ratesMu.Lock()
	defer ratesMu.Unlock()

	prev := rateSeen[hash]
	rateSeen[hash] = &rateState{at: now, dl: dl, ul: ul}
	if prev == nil {
		return 0, 0
	}

	dt := now.Sub(prev.at).Seconds()
	if dt <= 0 {
		return 0, 0
	}
	if dl >= prev.dl {
		dlSpeed = float64(dl-prev.dl) / dt
	}
	if ul >= prev.ul {
		ulSpeed = float64(ul-prev.ul) / dt
	}
	return dlSpeed, ulSpeed
}

func findTorrentLocked(infoHashHex string) *torrent.Torrent {
	if client == nil {
		return nil
	}
	for _, t := range client.Torrents() {
		if t.InfoHash().HexString() == infoHashHex {
			return t
		}
	}
	return nil
}

// GetDownloadSpeed returns the torrent's current download speed in bytes/sec.
func GetDownloadSpeed(infoHashHex string) float64 {
	mu.RLock()
	defer mu.RUnlock()

	t := findTorrentLocked(infoHashHex)
	if t == nil {
		return 0.0
	}
	dl, _ := sampleRates(infoHashHex, t.Stats())
	return dl
}

// GetUploadSpeed returns the torrent's current upload speed in bytes/sec.
func GetUploadSpeed(infoHashHex string) float64 {
	mu.RLock()
	defer mu.RUnlock()

	t := findTorrentLocked(infoHashHex)
	if t == nil {
		return 0.0
	}
	_, ul := sampleRates(infoHashHex, t.Stats())
	return ul
}

// GetTorrentStats returns a JSON blob with a torrent's live stats. A string
// return keeps the gomobile binding simple (nested structs don't bind well).
// Returns "{}" when the torrent is unknown or its metadata is unresolved.
func GetTorrentStats(infoHashHex string) string {
	mu.RLock()
	defer mu.RUnlock()

	t := findTorrentLocked(infoHashHex)
	if t == nil {
		return "{}"
	}
	info := t.Info()
	if info == nil {
		return "{}"
	}
	total := info.TotalLength()
	completed := t.BytesCompleted()
	// Selective downloads report stats for the targeted files only.
	if indices, ok := downloadTargetIndices(infoHashHex); ok {
		files := t.Files()
		var c, n int64
		for _, index := range indices {
			if index < 0 || index >= len(files) {
				continue
			}
			c += files[index].BytesCompleted()
			n += files[index].Length()
		}
		if n > 0 {
			total = n
			completed = c
		}
	}
	st := t.Stats()
	dl, ul := sampleRates(infoHashHex, st)
	progress := 0.0
	if total > 0 {
		progress = float64(completed) / float64(total)
	}
	return fmt.Sprintf(
		`{"progress":%f,"download_speed":%f,"upload_speed":%f,"bytes_completed":%d,"total_bytes":%d,"seeds":%d,"peers":%d}`,
		progress, dl, ul, completed, total, st.ConnectedSeeders, st.ActivePeers,
	)
}

// ── Per-file stats ──────────────────────────────────────────
// A multi-file download (several episodes of one pack) needs per-file progress
// and speed so each download entry reflects its own file, not the whole pack.
// Speeds are derived by differencing a file's completed bytes across polls.

var (
	fileRatesMu  sync.Mutex
	fileRateSeen = map[string]*rateState{} // "hash:index" -> last sample
)

func sampleFileRates(hash string, index int, completed int64) float64 {
	now := time.Now()
	key := fmt.Sprintf("%s:%d", hash, index)
	fileRatesMu.Lock()
	defer fileRatesMu.Unlock()
	prev := fileRateSeen[key]
	fileRateSeen[key] = &rateState{at: now, dl: completed, ul: 0}
	if prev == nil {
		return 0
	}
	dt := now.Sub(prev.at).Seconds()
	if dt <= 0 || completed < prev.dl {
		return 0
	}
	return float64(completed-prev.dl) / dt
}

// GetFileTorrentStats returns a JSON blob with the live stats of a single file
// within a torrent, so each episode of a multi-file download shows its own
// numbers. Returns "{}" when the torrent or file is unknown.
func GetFileTorrentStats(infoHashHex string, index int) string {
	mu.RLock()
	defer mu.RUnlock()

	t := findTorrentLocked(infoHashHex)
	if t == nil || t.Info() == nil {
		return "{}"
	}
	files := t.Files()
	if index < 0 || index >= len(files) {
		return "{}"
	}
	f := files[index]
	total := f.Length()
	completed := f.BytesCompleted()
	speed := sampleFileRates(infoHashHex, index, completed)
	progress := 0.0
	if total > 0 {
		progress = float64(completed) / float64(total)
	}
	st := t.Stats()
	return fmt.Sprintf(
		`{"progress":%f,"download_speed":%f,"upload_speed":0,"bytes_completed":%d,"total_bytes":%d,"seeds":%d,"peers":%d}`,
		progress, speed, completed, total, st.ConnectedSeeders, st.ActivePeers,
	)
}

// GetGlobalStats returns aggregate byte counters across every torrent, used by
// the storage UI to show real on-device usage instead of hardcoded numbers.
func GetGlobalStats() string {
	mu.RLock()
	defer mu.RUnlock()

	if client == nil {
		return "{}"
	}
	var completed, total, uploaded int64
	for _, t := range client.Torrents() {
		if t.Info() == nil {
			continue
		}
		total += t.Info().TotalLength()
		completed += t.BytesCompleted()
		stats := t.Stats()
		uploaded += stats.BytesWrittenData.Int64()
	}
	return fmt.Sprintf(
		`{"bytes_completed":%d,"total_bytes":%d,"uploaded_bytes":%d}`,
		completed, total, uploaded,
	)
}

// GetFiles returns the absolute on-disk paths of a torrent's files as a
// newline-joined string. (gomobile cannot bind a []string return type.)
// Requires that the torrent's metadata is resolved.
func GetFiles(infoHashHex string) string {
	mu.RLock()
	defer mu.RUnlock()

	if client == nil {
		return ""
	}

	for _, t := range client.Torrents() {
		if t.InfoHash().HexString() == infoHashHex {
			if t.Info() == nil {
				return ""
			}
			files := t.Files()
			var builder strings.Builder
			for i, f := range files {
				if i > 0 {
					builder.WriteString("\n")
				}
				builder.WriteString(filepath.Join(dataDir, f.Path()))
			}
			return builder.String()
		}
	}

	return ""
}

// DeleteTorrent drops a torrent from the client and removes its on-disk data
// directory, reclaiming storage. The directory is derived from the torrent's
// metainfo name scoped under the configured data dir, so it can't escape the
// storage root.
func DeleteTorrent(infoHashHex string) error {
	mu.RLock()
	if client == nil {
		mu.RUnlock()
		return errors.New("torrent client not started")
	}
	clientRef := client
	mu.RUnlock()

	for _, t := range clientRef.Torrents() {
		if t.InfoHash().HexString() != infoHashHex {
			continue
		}

		name := ""
		if info := t.Info(); info != nil {
			name = info.Name
		}

		// Stop streaming this torrent too, if it was being streamed.
		stopStreamingEntry(infoHashHex)
		clearDownloadTarget(infoHashHex)

		t.Drop()

		if name == "" || name == "." || name == ".." {
			return nil
		}
		dir := filepath.Join(dataDir, filepath.Base(name))
		return os.RemoveAll(dir)
	}

	return errors.New("torrent not found")
}

// Pause pauses the download.
func Pause(infoHashHex string) error {
	mu.RLock()
	defer mu.RUnlock()

	if client == nil {
		return errors.New("torrent client not started")
	}

	for _, t := range client.Torrents() {
		if t.InfoHash().HexString() == infoHashHex {
			if t.Info() == nil {
				return errors.New("torrent metadata not resolved yet")
			}
			// cancel pieces
			t.CancelPieces(0, t.NumPieces())
			return nil
		}
	}
	return errors.New("torrent not found")
}

// Resume resumes the download.
func Resume(infoHashHex string) error {
	mu.RLock()
	defer mu.RUnlock()

	if client == nil {
		return errors.New("torrent client not started")
	}

	for _, t := range client.Torrents() {
		if t.InfoHash().HexString() == infoHashHex {
			if t.Info() == nil {
				return errors.New("torrent metadata not resolved yet")
			}
			// A paused selective download must resume its selected files, not
			// the whole pack.
			if indices, ok := downloadTargetIndices(infoHashHex); ok {
				files := t.Files()
				t.CancelPieces(0, t.NumPieces())
				for _, index := range indices {
					if index >= 0 && index < len(files) {
						files[index].Download()
					}
				}
				return nil
			}
			t.DownloadAll()
			return nil
		}
	}
	return errors.New("torrent not found")
}

// StreamTorrent adds a torrent via magnet link and starts serving it over a
// localhost HTTP URL for live playback. The returned URL supports byte ranges;
// reads block until the requested bytes are available, so the player buffers
// while the daemon fetches pieces sequentially ahead of the read position.
func StreamTorrent(uri string) (string, error) {
	file, t, err := resolveStreamTarget(uri, nil)
	if err != nil {
		return "", err
	}
	return startStream(t, file)
}

// StreamTorrentFile is StreamTorrent but streams the file at the given index,
// so a season pack can serve one specific episode instead of the largest file.
func StreamTorrentFile(uri string, index int) (string, error) {
	file, t, err := resolveStreamTarget(uri, &index)
	if err != nil {
		return "", err
	}
	return startStream(t, file)
}

// resolveStreamTarget adds a magnet, waits for its metadata, and selects the
// video file to stream. When index is nil the largest video file is used;
// otherwise the file at that index must be a video.
func resolveStreamTarget(uri string, index *int) (*torrent.File, *torrent.Torrent, error) {
	mu.RLock()
	if client == nil {
		mu.RUnlock()
		return nil, nil, errors.New("torrent client not started")
	}
	clientRef := client
	mu.RUnlock()

	if streamAddr == "" {
		return nil, nil, errors.New("stream server not started")
	}

	t, err := clientRef.AddMagnet(uri)
	if err != nil {
		return nil, nil, err
	}

	select {
	case <-t.GotInfo():
	case <-time.After(metainfoTimeout):
		t.Drop()
		return nil, nil, errors.New("timed out waiting for torrent metadata")
	}

	if t.Info() == nil {
		t.Drop()
		return nil, nil, errors.New("torrent metadata unavailable")
	}

	var file *torrent.File
	if index != nil {
		files := t.Files()
		idx := *index
		if idx < 0 || idx >= len(files) {
			t.Drop()
			return nil, nil, errors.New("file index out of range")
		}
		if !isVideoPath(files[idx].DisplayPath()) {
			t.Drop()
			return nil, nil, errors.New("selected file is not a video")
		}
		file = files[idx]
	} else {
		file = largestVideoFile(t)
	}
	if file == nil {
		t.Drop()
		return nil, nil, errors.New("no video file found in torrent")
	}

	return file, t, nil
}

// startStream serves an already-selected file of a torrent that has its
// metadata resolved. Replacing an existing stream for the same torrent drops
// the old entry so switching episodes doesn't leak resources.
func startStream(t *torrent.Torrent, file *torrent.File) (string, error) {
	// Warm up the start of the file so playback begins without a long stall.
	// ReadContext lets the timeout cancel the warm-up if peers are slow. The
	// warm-up reader is throwaway: each HTTP request later creates its own
	// reader, so pieces fetched here only prime the shared piece cache.
	reader := file.NewReader()
	reader.SetReadahead(streamReadahead)
	defer reader.Close()

	ctx, cancel := context.WithTimeout(context.Background(), warmupTimeout)
	buf := make([]byte, 32*1024)
	remaining := int64(warmupBytes)
	for remaining > 0 {
		n, err := reader.ReadContext(ctx, buf)
		if n > 0 {
			remaining -= int64(n)
		}
		if err != nil {
			break
		}
	}
	cancel()

	hash := t.InfoHash().HexString()

	streamsMu.Lock()
	streams[hash] = &streamEntry{
		size: file.Length(),
		file: file,
		t:    t,
	}
	streamsMu.Unlock()

	return streamAddr + hash, nil
}

// StopStreaming stops serving a stream and drops the underlying torrent, so no
// further pieces are downloaded in the background.
func StopStreaming(infoHashHex string) error {
	streamsMu.Lock()
	defer streamsMu.Unlock()
	return stopStreamingEntryLocked(infoHashHex)
}

// stopStreamingEntry closes an active stream and drops its torrent, then
// removes the torrent's on-disk data so streaming doesn't leave orphaned files
// in the storage directory. In-flight HTTP requests hold their own readers;
// they fail on the next read once the torrent is dropped. Callers must hold
// streamsMu. A missing stream is not an error here, so cleanup during torrent
// deletion is best-effort.
func stopStreamingEntryLocked(infoHashHex string) error {
	entry := streams[infoHashHex]
	if entry == nil {
		return nil
	}

	name := ""
	if info := entry.t.Info(); info != nil {
		name = info.Name
	}

	entry.t.Drop()
	delete(streams, infoHashHex)

	// Remove on-disk data to match DeleteTorrent's cleanup.
	if name != "" && name != "." && name != ".." {
		dir := filepath.Join(dataDir, filepath.Base(name))
		os.RemoveAll(dir)
	}
	return nil
}

// stopStreamingEntry closes an active stream without requiring the caller to
// hold the streams lock.
func stopStreamingEntry(infoHashHex string) {
	streamsMu.Lock()
	defer streamsMu.Unlock()
	stopStreamingEntryLocked(infoHashHex)
}

/*
cleanupStreamingDirectories removes empty or inactive streaming directories
to prevent disk accumulation. This is called periodically by the background
task system to clean up orphaned stream data.
*/
func cleanupStreamingDirectories() error {
	streamsMu.RLock()
	defer streamsMu.RUnlock()

	// First, clean up directories for streams that are no longer active
	for _, entry := range streams {
		if entry == nil {
			continue
		}

		// Get the torrent name to identify the directory
		info := entry.t.Info()
		if info == nil || info.Name == "" || info.Name == "." || info.Name == ".." {
			continue
		}

		// Check if the stream directory exists
		dir := filepath.Join(dataDir, filepath.Base(info.Name))
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			// Directory doesn't exist, nothing to clean
			continue
		}

		// For active streams, we keep their directories but clean out any temp files
		// that might have accumulated during streaming
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}

		// Remove any .temp files and other temporary files that might have been created
		for _, entry := range entries {
			if strings.HasSuffix(entry.Name(), ".temp") || strings.HasSuffix(entry.Name(), ".part") {
				path := filepath.Join(dir, entry.Name())
				if err := os.RemoveAll(path); err != nil {
					log.Printf("Failed to cleanup temp file %s: %v", path, err)
				}
			}
		}
	}

	// Now clean up any directories that are no longer associated with any active stream
	// This finds orphaned directories that were left behind when streams ended
	streamDirs := make(map[string]string) // name -> directory path
	for _, entry := range streams {
		if entry == nil {
			continue
		}
		info := entry.t.Info()
		if info == nil || info.Name == "" || info.Name == "." || info.Name == ".." {
			continue
		}
		streamDirs[info.Name] = filepath.Join(dataDir, filepath.Base(info.Name))
	}

	// Walk through all directories in dataDir and remove those not in streamDirs
	if err := filepath.Walk(dataDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip directories that can't be read
		}
		if !info.IsDir() {
			return nil
		}

		// Skip special directories
		if path == dataDir {
			return filepath.SkipDir
		}

		// Get the base directory name
		dirName := filepath.Base(path)
		if dirName == "." || dirName == ".." {
			return filepath.SkipDir
		}

		// Check if this directory is in our active streams
		_, isActive := streamDirs[dirName]
		if isActive {
			return filepath.SkipDir // Skip active stream directories
		}

		// For orphaned directories, check if they're empty or just contain metadata
		// We need to check if this might be a streaming directory (torrent-based)
		// By checking for a .torrent file or typical streaming metadata files
		entries, err := os.ReadDir(path)
		if err != nil {
			return nil
		}

		// Count non-hidden files and directories
		fileCount := 0
		for _, entry := range entries {
			if !strings.HasPrefix(entry.Name(), ".") {
				fileCount++
			}
		}

		// If the directory has only hidden files or is empty, clean it up
		// This is more aggressive for streaming directories since they
		// don't contain permanent data
		if fileCount == 0 {
			if err := os.RemoveAll(path); err != nil {
				log.Printf("Failed to cleanup empty orphaned stream directory %s: %v", path, err)
			}
		}

		return filepath.SkipDir
	}); err != nil {
		return err
	}

	return nil
}

// largestVideoFile returns the biggest video file in a torrent, which is the
// most likely candidate for streaming (e.g. the movie or first episode).
func largestVideoFile(t *torrent.Torrent) *torrent.File {
	var best *torrent.File
	for _, f := range t.Files() {
		if !isVideoPath(f.DisplayPath()) {
			continue
		}
		if best == nil || f.Length() > best.Length() {
			best = f
		}
	}
	return best
}
