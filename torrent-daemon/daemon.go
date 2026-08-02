package daemon

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
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

// streamEntry holds the reader backing one active stream URL.
type streamEntry struct {
	reader *lockedReader
	size   int64
	file   *torrent.File
	t      *torrent.Torrent
}

// lockedReader serializes access to a torrent.Reader, which is not safe for
// concurrent use. Video players can issue overlapping range requests.
type lockedReader struct {
	mu sync.Mutex
	r  torrent.Reader
}

func (l *lockedReader) Read(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.r.Read(p)
}

func (l *lockedReader) ReadContext(ctx context.Context, p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.r.ReadContext(ctx, p)
}

func (l *lockedReader) Seek(off int64, whence int) (int64, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.r.Seek(off, whence)
}

func (l *lockedReader) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.r.Close()
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
		entry.reader.Close()
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

	if _, err := entry.reader.Seek(start, io.SeekStart); err != nil {
		return
	}

	buf := make([]byte, 64*1024)
	remaining := end - start + 1
	for remaining > 0 {
		chunk := buf
		if int64(len(chunk)) > remaining {
			chunk = buf[:remaining]
		}
		n, err := entry.reader.ReadContext(r.Context(), chunk)
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

	return t.InfoHash().HexString(), nil
}

// GetProgress returns the download progress (0.0 to 1.0).
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
			if info.TotalLength() == 0 {
				return 0.0
			}
			return float64(t.BytesCompleted()) / float64(info.TotalLength())
		}
	}

	return 0.0
}

// GetDownloadSpeed returns the download speed in bytes per second.
func GetDownloadSpeed(infoHashHex string) float64 {
	// In a real robust implementation, we'd track the rate over time.
	// For this prototype, we'll return a mock value or rely on the JS side
	// to calculate the derivative of progress over time, which is simpler!
	return 0.0
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
	mu.RLock()
	if client == nil {
		mu.RUnlock()
		return "", errors.New("torrent client not started")
	}
	clientRef := client
	mu.RUnlock()

	if streamAddr == "" {
		return "", errors.New("stream server not started")
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

	info := t.Info()
	if info == nil {
		t.Drop()
		return "", errors.New("torrent metadata unavailable")
	}

	file := largestVideoFile(t)
	if file == nil {
		t.Drop()
		return "", errors.New("no video file found in torrent")
	}

	reader := &lockedReader{r: file.NewReader()}
	reader.r.SetReadahead(streamReadahead)

	// Warm up the start of the file so playback begins without a long stall.
	// ReadContext lets the timeout cancel the warm-up if peers are slow.
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
		reader: reader,
		size:   file.Length(),
		file:   file,
		t:      t,
	}
	streamsMu.Unlock()

	return streamAddr + hash, nil
}

// StopStreaming stops serving a stream and drops the underlying torrent, so no
// further pieces are downloaded in the background.
func StopStreaming(infoHashHex string) error {
	streamsMu.Lock()
	defer streamsMu.Unlock()

	entry := streams[infoHashHex]
	if entry == nil {
		return errors.New("stream not found")
	}

	entry.reader.Close()
	entry.t.Drop()
	delete(streams, infoHashHex)
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
