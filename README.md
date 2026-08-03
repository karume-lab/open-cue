# CUE

A movie/TV streaming and download app for Android, built with Expo and React Native. It discovers titles via TMDB, finds torrents for them, and plays them live over a local streaming server backed by a native Go BitTorrent daemon — or downloads them for offline playback.

<div align="center">
  <img src="thanos.gif" alt="Thanos GIF">
</div>

## Features

- **Browse & discover** — discover movies/TV, search, filter by genre, ratings, and watch-in-progress progress bars
- **Live streaming** — stream a torrent straight from the swarm; playback starts while pieces download (local HTTP server with byte-range support)
- **Downloads** — background torrent downloads with progress notifications, concurrent downloads per title, and offline playback
- **Player** — full-screen landscape player with gestures (tap, double-tap to seek ±10s), subtitles, and hardware FFmpeg decoder fallback
- **Watch history, bookmarks & library** — persisted locally on-device
- **Offline mode** — filter to only what you've downloaded

---

## TMDB: Bring Your Own Key

**Cue does not ship with a TMDB API key — you must provide your own.** All metadata (posters, titles, ratings, search, discover) comes from [TMDB](https://www.themoviedb.org/). There's no backend or proxy: the app talks to `api.themoviedb.org` directly using your key, which is embedded into the build via an environment variable.

1. Create a free account and grab an API key at <https://www.themoviedb.org/settings/api>.
2. Copy the env template and fill it in:

   ```sh
   cp .env.example .env
   ```

3. Edit `.env`:

   ```sh
   EXPO_PUBLIC_TMDB_API_KEY=your_key_here   # no quotes
   ```

Only variables prefixed with `EXPO_PUBLIC_` are inlined into the JS bundle (see `.env.example` / `env.d.ts`). **Treat your key as a secret** — don't commit `.env`; it's gitignored.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  UI layer (React Native)                                     │
│  expo-router screens · features/ · @rn-primitives + uniwind  │
├──────────────────────────────────────────────────────────────┤
│  State & data                                                │
│  Zustand + MMKV (persisted) · TanStack Query · services/     │
├──────────────────────────────────────────────────────────────┤
│  JS <-> Native bridge (Expo Modules)                         │
│  TorrentDaemon module (modules/torrent-daemon)               │
├──────────────────────────────────────────────────────────────┤
│  Native daemon (Go, gomobile → daemon.aar)                   │
│  anacrolix/torrent · localhost streaming · downloads         │
└──────────────────────────────────────────────────────────────┘
```

### Frontend (`src/`)

- **`src/app/`** — file-based routing via `expo-router` (typed routes). Screens: `(tabs)` (discover, library, downloads, settings), `media/[type]/[id]` (details), `player/[type]/[id]` (player).
- **`src/features/`** — feature-first modules: `discover`, `media`, `player`, `downloads`, `library`, `settings`, `onboarding`, `shared`. Each owns its components, types, and data-fetching hooks.
- **`src/components/`** — `ui/` is a shadcn-style kit built on `@rn-primitives`; `core/` holds app-level components (e.g. `MovieCard`, `BrowseMoviesGrid`).
- **`src/services/`** — API and platform glue:
  - `tmdb.ts` — TMDB discovery/search/detail + torrent-source APIs
  - `torrents.ts` — torrent search (YTS for movies, ThePirateBay for TV, Nyaa for anime) and magnet building
  - `StreamService.ts` — manages the live-streaming daemon lifecycle
  - `DownloadService.ts` — download queueing, progress, file resolution
  - `NotificationService.ts` / `BackgroundTasks.ts` — foreground-service notifications and background 4K-release checks
  - `ExportService.ts` — export completed videos to the photo library
- **State** — Zustand stores persisted to `react-native-mmkv` (watch history, downloads, bookmarks, settings). API data is cached with TanStack Query.
- **UI styling** — [uniwind](https://github.com/uni-stack/uniwind) (Tailwind v4-style classes via `src/styles/global.css`) + `@rn-primitives`. Path aliases: `@/*` → `src/*`, `~/*` → project root (see `tsconfig.json` / `babel.config.js`).

### Native daemon (`torrent-daemon/`)

The core is a Go program (`daemon.go`) built on [`anacrolix/torrent`](https://github.com/anacrolix/torrent). It's compiled to a native Android library with `gomobile bind`, packaged as `daemon.aar`, and exposed to JS through the **`TorrentDaemon`** Expo module (`modules/torrent-daemon/`).

Key behaviors:

- **Live streaming** — `StreamTorrent` adds a magnet, waits for metadata, picks the largest video file, and serves it over a localhost HTTP server with byte-range support. Pieces are fetched sequentially ahead of the read position (`streamReadahead`), so the player starts almost immediately and buffers as it plays. `StreamService` wraps this on the JS side and returns a `http://127.0.0.1:<port>/stream/<hash>` URL for `react-native-video`.
- **Downloads** — torrents are written to the app's `documents/downloads` directory with mmap-backed storage, fast peer/hash tuning, and resume support.
- **Background work** — a foreground service (`TorrentDownloadService`) keeps downloads alive in the background and drives progress notifications.

### Video playback

`react-native-video` (ExoPlayer on Android) plays both live streams and local files. A patch adds the **Jellyfin `media3-ffmpeg-decoder`** extension so codecs the hardware decoder can't handle fall back to an FFmpeg software decoder.

---

## Prerequisites

| Tool | Version / Notes |
| --- | --- |
| [bun](https://bun.sh) | package manager & script runner |
| Node.js | 18+ (LTS recommended) |
| Android Studio / SDK | compile SDK / target SDK **35**, min SDK **24**, NDK **27.1** (defaults for Expo SDK 54), platform tools (`adb`) |
| JDK | 17+ |
| Go + `gomobile` | `go 1.25+`, then `go install golang.org/x/mobile/cmd/gomobile@latest && gomobile init` |
| TMDB API key | see [Bring Your Own Key](#tmdb-bring-your-own-key) |
| A device/emulator | arm64 (`arm64-v8a`) Android device or emulator (the release APK is arm64-only) |

---

## Setup

```sh
# 1. Clone
git clone <repository-url>
cd cue

# 2. Install JS dependencies
bun install

# 3. Provide your TMDB key
cp .env.example .env
# edit .env → EXPO_PUBLIC_TMDB_API_KEY=your_key_here

# 4. (First build only) compile the Go torrent daemon into a native AAR
bun run build:go
```

> The `daemon.aar` and the generated `android/`/`ios/` directories are gitignored and produced locally by `bun run build:go` and `expo prebuild` respectively.

---

## Running in development

```sh
bun run dev        # Expo dev client (Metro) — needs the native app installed first
bun run android    # prebuild + build & launch on a connected Android device
```

---

## Building the production APK

The release APK is tuned for size:

- **arm64-v8a only** (`buildArchs`) — modern phones/tablets; native libs are the biggest size driver
- **R8 minification** + **resource shrinking** — dead Java/Kotlin code and unused resources are stripped
- **Compressed native libs** (`useLegacyPackaging`) and **compressed JS bundle** — roughly halves on-disk APK size
- **Stripped Go daemon** (`-ldflags "-s -w"` in `build-daemon.sh`)

### Full build (Go daemon + APK)

```sh
bun run build
```

This runs the daemon build first (`build:go`), then `expo prebuild --clean` and the Android release build (`build:mobile`). Output:

```
android/app/build/outputs/apk/release/app-release.apk
```

### Build steps separately

```sh
bun run build:go        # rebuild torrent-daemon → modules/torrent-daemon/android/libs/daemon.aar
bun run build:mobile    # expo prebuild --clean && gradlew assembleRelease
```

### Install to a device

```sh
bun install-apk         # adb install the release APK
bun run build:install-apk   # build + install in one go
```

> **Note on signing.** The release APK is currently signed with the **debug keystore** (Expo template default) — fine for sideloading. For a store release, configure a real keystore (`android/app/build.gradle` signing config, or via EAS) and bump `versionCode` in `app.json`.

---

## package.json scripts

| Script | Description |
| --- | --- |
| `dev` | Start the Expo dev server with the dev client |
| `start` | Start the Expo dev server |
| `android` | `expo prebuild --clean` then build & run on an Android device |
| `ios` | `expo run:ios` (macOS + Xcode required) |
| `build:go` | Build the Go torrent daemon into `daemon.aar` (requires Go + `gomobile`) |
| `build:mobile` | `expo prebuild --clean` + Gradle `assembleRelease` → release APK |
| `build` | Full production build: `build:go` then `build:mobile` |
| `install-apk` | `adb install` the built release APK |
| `build:install-apk` | `build` + `install-apk` in one command |
| `doctor` | `expo-doctor` project health check |
| `update-packages` | `expo install --check` for out-of-date SDK packages |
| `reinstall-packages` | Wipe `node_modules`/`bun.lock` and reinstall |
| `lint` / `format` / `check` / `clean` | Biome lint/format (`clean` auto-fixes) |
| `typecheck` | TypeScript check (`tsc --noEmit`) |

---

## Project structure

```
cue/
├── app.json                 # Expo config (incl. expo-build-properties)
├── build-daemon.sh          # gomobile bind script for the Go daemon
├── torrent-daemon/          # Go BitTorrent daemon source (daemon.go, go.mod)
├── modules/
│   └── torrent-daemon/      # Expo native module wrapping daemon.aar
├── src/
│   ├── app/                 # expo-router screens
│   ├── components/          # ui/ (@rn-primitives kit) + core/
│   ├── features/            # feature-first modules
│   ├── services/            # tmdb, torrents, streaming, downloads, ...
│   ├── lib/                 # constants, utils
│   ├── stores/              # global stores
│   └── styles/              # global.css (uniwind theme)
└── package.json
```

---

## Legal Disclaimer

**Cue** is designed solely for providing access to publicly available content. It is not intended to support or promote piracy or copyright infringement. As the creator of this app, I hereby declare that I am not responsible for, and in no way associated with, any external links or the content they direct to.

It is essential to understand that all the content available through this app are found freely accessible on the internet and the app does not host any copyrighted content. I do not exercise control over the nature, content, or availability of the websites linked within the app.

If you have any concerns or objections regarding the content provided by this app, please contact the respective website owners, webmasters, or hosting providers. Thank you.
