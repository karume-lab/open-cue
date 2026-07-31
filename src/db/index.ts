import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { Movie } from "./models/Movie";
import { Setting } from "./models/Setting";
import { schema } from "./schema";

const adapter = new SQLiteAdapter({
  schema,
  // (You might want to pass migrations here later)
  jsi: true /* JSI is recommended for React Native/Expo */,
  onSetUpError: (error) => {
    console.error("Database setup failed", error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Movie, Setting],
});

export { default as DatabaseProvider } from "@nozbe/watermelondb/DatabaseProvider";
