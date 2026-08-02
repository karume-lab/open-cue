import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};

export const parseGenres = (raw: string): string[] => {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
};
