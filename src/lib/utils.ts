import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseGenres(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}
