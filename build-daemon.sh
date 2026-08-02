#!/bin/bash
set -e

echo "Building Go Torrent Daemon..."

# Check if gomobile is installed
if ! command -v gomobile &> /dev/null; then
    echo "gomobile not found. Please install it:"
    echo "go install golang.org/x/mobile/cmd/gomobile@latest"
    echo "gomobile init"
    exit 1
fi

cd torrent-daemon

echo "Downloading dependencies..."
go mod tidy
go get -tool golang.org/x/mobile/cmd/gobind
go get golang.org/x/mobile/bind

echo "Compiling for Android (AAR)..."
mkdir -p ../modules/torrent-daemon/android/libs
gomobile bind -target=android -androidapi 23 -o ../modules/torrent-daemon/android/libs/daemon.aar ./

if [ "$(uname -s)" = "Darwin" ]; then
    echo "Compiling for iOS (Framework)..."
    mkdir -p ../modules/torrent-daemon/ios
    gomobile bind -target=ios -o ../modules/torrent-daemon/ios/Daemon.xcframework ./
else
    echo "Skipping iOS compilation (macOS with Xcode required)"
fi

echo "Done! The libraries have been copied to the modules/torrent-daemon directory."
