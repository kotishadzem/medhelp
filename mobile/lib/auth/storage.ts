import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REFRESH_TOKEN_KEY = "medhelp.refreshToken";
const IDENTIFIER_KEY = "medhelp.identifier"; // JSON: { method: 'phone'|'email', value: string }
const BIOMETRIC_ENABLED_KEY = "medhelp.biometricEnabled";

const webStore = {
  getItemAsync: async (key: string) =>
    Platform.OS === "web" ? globalThis.localStorage?.getItem(key) ?? null : null,
  setItemAsync: async (key: string, value: string) => {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value);
  },
  deleteItemAsync: async (key: string) => {
    if (Platform.OS === "web") globalThis.localStorage?.removeItem(key);
  },
};

const store = Platform.OS === "web" ? webStore : SecureStore;

export type StoredIdentifier = { method: "phone" | "email"; value: string };

export async function getStoredRefreshToken(): Promise<string | null> {
  return store.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setStoredRefreshToken(token: string): Promise<void> {
  await store.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearStoredRefreshToken(): Promise<void> {
  await store.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function getStoredIdentifier(): Promise<StoredIdentifier | null> {
  const raw = await store.getItemAsync(IDENTIFIER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if ((parsed.method === "phone" || parsed.method === "email") && typeof parsed.value === "string") {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function setStoredIdentifier(id: StoredIdentifier): Promise<void> {
  await store.setItemAsync(IDENTIFIER_KEY, JSON.stringify(id));
}

export async function clearStoredIdentifier(): Promise<void> {
  await store.deleteItemAsync(IDENTIFIER_KEY);
}

export async function getBiometricEnabled(): Promise<boolean> {
  const v = await store.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return v === "true";
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await store.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? "true" : "false");
}
