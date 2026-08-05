// Parses release-name quality/size tokens and derives magnet display names.

export const parseQuality = (name: string): string => {
  const match = name.match(/(480p|720p|1080p|2160p|4K)/i);
  return match ? match[1].toUpperCase() : "Unknown";
};

export const parseSizeBytes = (
  sizeBytes: string | number | undefined,
): number => {
  const parsed = Number(sizeBytes);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const pad2 = (n: number): string => String(n).padStart(2, "0");

const decodeMagnetName = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const displayNameFromMagnet = (
  magnet: string | undefined,
  fallback: string,
): string => {
  if (!magnet) return fallback;
  const match = magnet.match(/[?&]dn=([^&]+)/);
  if (!match) return fallback;
  return decodeMagnetName(match[1]);
};
