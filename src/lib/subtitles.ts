import { File } from "expo-file-system";

export type SubtitleFormat = "srt" | "vtt";

export interface SubtitleCue {
  index: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

const SRT_TIME_RE =
  /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;

// WebVTT allows omitting the hours, and uses a dot for milliseconds.
const VTT_TIME_RE =
  /^(?:(\d{1,2}):)?(\d{2}):(\d{2})[.](\d{1,3})\s*-->\s*(?:(?:(\d{1,2}):)?(\d{2}):(\d{2})[.](\d{1,3}))\s*.*$/;

const timestampToSeconds = (parts: number[]): number => {
  const [h = 0, m, s, ms] = parts;
  return h * 3600 + m * 60 + s + ms / 1000;
};

const stripTags = (text: string): string =>
  text
    .replace(/<[^>]+>/g, "")
    .replace(/\{\\[^}]*\}/g, "")
    .trim();

export const detectSubtitleFormat = (content: string): SubtitleFormat =>
  content.trimStart().toUpperCase().startsWith("WEBVTT") ? "vtt" : "srt";

const splitBlocks = (content: string): string[] => {
  const normalized = content.replace(/\r\n/g, "\n");
  const blocks = normalized.split(/\n{2,}/);
  const meaningful = blocks.filter((block) => {
    const trimmed = block.trim();
    if (!trimmed) return false;
    if (trimmed.toUpperCase().startsWith("WEBVTT")) return false;
    if (trimmed.startsWith("NOTE")) return false;
    return true;
  });
  return meaningful;
};

export const parseSubtitleCues = (
  content: string,
  format: SubtitleFormat = detectSubtitleFormat(content),
): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  const blocks = splitBlocks(content);
  let counter = 0;

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let timeIndex = 0;
    const re = format === "vtt" ? VTT_TIME_RE : SRT_TIME_RE;

    // SRT blocks start with a numeric index; VTT cues are identified purely by
    // their timestamp line. Find the first timestamp line either way.
    const matchIndex = lines.findIndex((line) => re.test(line));
    if (matchIndex === -1) continue;
    timeIndex = matchIndex;

    const match = lines[timeIndex].match(re);
    if (!match) continue;

    let start: number;
    let end: number;
    if (format === "vtt") {
      start = timestampToSeconds([
        Number(match[1] ?? 0),
        Number(match[2]),
        Number(match[3]),
        Number(match[4]),
      ]);
      end = timestampToSeconds([
        Number(match[5] ?? 0),
        Number(match[6]),
        Number(match[7]),
        Number(match[8]),
      ]);
    } else {
      start = timestampToSeconds([
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        Number(match[4]),
      ]);
      end = timestampToSeconds([
        Number(match[5]),
        Number(match[6]),
        Number(match[7]),
        Number(match[8]),
      ]);
    }

    // Cue payload = the lines after the timestamp line. Strip a stray SRT index
    // line when it appears *after* the timestamps (malformed files do this).
    const textLines = lines.slice(timeIndex + 1);
    const text = textLines.map(stripTags).filter(Boolean).join("\n").trim();
    if (!text || end <= start) continue;

    cues.push({ index: counter++, start, end, text });
  }

  return cues;
};

export const loadSubtitleCues = async (uri: string): Promise<SubtitleCue[]> => {
  try {
    const file = new File(uri);
    if (!file.exists) return [];
    const content = await file.text();
    return parseSubtitleCues(content);
  } catch (error) {
    console.error("Failed to load subtitle file:", error);
    return [];
  }
};

export const findActiveCue = (
  cues: SubtitleCue[],
  currentTime: number,
  delay: number,
): SubtitleCue | null => {
  if (cues.length === 0) return null;
  const adjusted = currentTime - delay;
  if (adjusted < 0) return null;
  // Cues are sorted by start time; walk backward for the last active one.
  for (let i = cues.length - 1; i >= 0; i--) {
    const cue = cues[i];
    if (adjusted >= cue.start) {
      return adjusted < cue.end ? cue : null;
    }
  }
  return null;
};
