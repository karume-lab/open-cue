import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";
import type React from "react";
import { createContext, useContext } from "react";
import migrations from "@/db/migrations/migrations"; // auto-generated
import * as schema from "@/db/schema";

export const db = drizzle(openDatabaseSync("cue.db"), { schema });

export type DrizzleDB = typeof db;

const DatabaseContext = createContext<DrizzleDB | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    console.error("Migration error:", error);
    throw error; // bubble to your error boundary
  }
  if (!success) return null; // migrations still running — swap for a splash/loader

  return (
    <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
  );
}

export function useDatabase(): DrizzleDB {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error("useDatabase must be used inside DatabaseProvider");
  return ctx;
}
