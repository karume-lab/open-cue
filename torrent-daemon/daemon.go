package daemon

import (
	"errors"
	"sync"

	"github.com/anacrolix/torrent"
)

var (
	client *torrent.Client
	mu     sync.RWMutex
)

// Start initializes the torrent client.
func Start(storagePath string) error {
	mu.Lock()
	defer mu.Unlock()

	if client != nil {
		return nil // already started
	}

	config := torrent.NewDefaultClientConfig()
	config.DataDir = storagePath
	// Optimize for fast startup and sequential downloading
	config.NoDHT = false 
	config.Seed = false

	var err error
	client, err = torrent.NewClient(config)
	return err
}

// Stop gracefully shuts down the torrent client.
func Stop() {
	mu.Lock()
	defer mu.Unlock()

	if client != nil {
		client.Close()
		client = nil
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

// Pause pauses the download.
func Pause(infoHashHex string) error {
	mu.RLock()
	defer mu.RUnlock()

	if client == nil {
		return errors.New("torrent client not started")
	}

	for _, t := range client.Torrents() {
		if t.InfoHash().HexString() == infoHashHex {
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
			t.DownloadAll()
			return nil
		}
	}
	return errors.New("torrent not found")
}
