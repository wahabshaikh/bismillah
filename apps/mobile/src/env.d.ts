/// <reference types="expo/types" />

// `EXPO_PUBLIC_*` variables are inlined at build time, and only when read with dot notation.
declare namespace __MetroModuleApi {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_API_URL?: string;
  }
}
