import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REFRESH_TOKEN_KEY = "medhelp.refreshToken";
const IDENTIFIER_KEY = "medhelp.identifier";
const QUICK_PIN_KEY = "medhelp.quickUnlock.pin";
const QUICK_ASKED_KEY = "medhelp.quickUnlock.asked";
const QUICK_FINGERPRINT_KEY = "medhelp.quickUnlock.fingerprint";
const QUICK_FACE_KEY = "medhelp.quickUnlock.face";

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

// Quick unlock — PIN is stored as plain text in OS-protected secure storage
// (SecureStore on native, localStorage fallback on web). On native the OS
// keychain encrypts at rest; on web it's only as safe as the browser.

export async function getQuickPin(): Promise<string | null> {
  return store.getItemAsync(QUICK_PIN_KEY);
}
export async function setQuickPin(pin: string): Promise<void> {
  await store.setItemAsync(QUICK_PIN_KEY, pin);
}
export async function clearQuickPin(): Promise<void> {
  await store.deleteItemAsync(QUICK_PIN_KEY);
}

export async function getQuickAsked(): Promise<boolean> {
  return (await store.getItemAsync(QUICK_ASKED_KEY)) === "true";
}
export async function setQuickAsked(asked: boolean): Promise<void> {
  await store.setItemAsync(QUICK_ASKED_KEY, asked ? "true" : "false");
}

export async function getFingerprintEnabled(): Promise<boolean> {
  return (await store.getItemAsync(QUICK_FINGERPRINT_KEY)) === "true";
}
export async function setFingerprintEnabled(enabled: boolean): Promise<void> {
  await store.setItemAsync(QUICK_FINGERPRINT_KEY, enabled ? "true" : "false");
}

export async function getFaceEnabled(): Promise<boolean> {
  return (await store.getItemAsync(QUICK_FACE_KEY)) === "true";
}
export async function setFaceEnabled(enabled: boolean): Promise<void> {
  await store.setItemAsync(QUICK_FACE_KEY, enabled ? "true" : "false");
}

export async function clearQuickUnlock(): Promise<void> {
  await Promise.all([
    clearQuickPin(),
    store.deleteItemAsync(QUICK_FINGERPRINT_KEY),
    store.deleteItemAsync(QUICK_FACE_KEY),
    store.deleteItemAsync(QUICK_ASKED_KEY),
  ]);
}
