import type { SQLiteDatabase } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDatabase } from "@/db/DatabaseProvider";

interface SQLiteDatabaseWithListener extends SQLiteDatabase {
  addUpdateListener?: (callback: (params: { tableName: string }) => void) => {
    remove: () => void;
  };
}

export function useLiveQuery<T>(
  queryFn: () => Promise<T>,
  watchTables: string[] = ["movies"],
): { data: T | undefined; isLoading: boolean } {
  const db = useDatabase();
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const dataRef = useRef<T | undefined>(undefined);

  const run = useCallback(async () => {
    try {
      const result = await queryFn();
      // Simple JSON stringify diff — cheap for small result sets
      if (JSON.stringify(result) !== JSON.stringify(dataRef.current)) {
        dataRef.current = result;
        setData(result);
      }
    } catch (error) {
      console.error("Error running query:", error);
    } finally {
      setIsLoading(false);
    }
  }, [queryFn]);

  useEffect(() => {
    run();

    // expo-sqlite's update listener — fires on every DB write
    const client = db.$client as SQLiteDatabaseWithListener;
    if (client.addUpdateListener) {
      const sub = client.addUpdateListener(
        ({ tableName }: { tableName: string }) => {
          if (watchTables.includes(tableName)) run();
        },
      );
      return () => sub.remove();
    }
  }, [run, watchTables, db.$client]);

  return { data, isLoading };
}
