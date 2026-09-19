import { Platform } from "react-native";

// ─── Platform-aware API configuration ────────────────────────────────────────
// Android emulator uses 10.0.2.2 to reach host machine.
// iOS simulator uses localhost.
// Production uses the env-configured URL.
// ─────────────────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  // Allow override via env
  const envUrl = process.env.API_BASE_URL;
  if (envUrl) return envUrl;

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  // iOS simulator
  return "http://localhost:8000";
}

export const API_BASE_URL = getBaseUrl();

export const API_TIMEOUT_MS = 15_000;

export const APP_CONFIG = {
  name: "Bench Dashboard",
  version: "1.0.0",
  buildNumber: 1,
} as const;
