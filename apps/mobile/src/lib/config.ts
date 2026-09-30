import Constants from "expo-constants";
import { resolveApiUrl } from "./api-url.ts";

/** Origin of the API Worker. */
export const API_URL = resolveApiUrl(
  process.env.EXPO_PUBLIC_API_URL,
  Constants.expoConfig?.hostUri,
);
