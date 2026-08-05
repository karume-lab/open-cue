import { createMMKV } from "react-native-mmkv";
import { APP_STORAGE_ID } from "@/lib/constants";

export const storage = createMMKV({
  id: APP_STORAGE_ID,
});
