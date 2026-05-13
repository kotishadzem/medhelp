import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { configureTokens } from "@/lib/api/client";
import { authApi, type Identifier } from "@/lib/api/endpoints";
import { cancelAll as cancelAllNotifications } from "@/lib/notifications";
import {
  clearQuickUnlock,
  clearStoredIdentifier,
  clearStoredRefreshToken,
  getFaceEnabled,
  getFingerprintEnabled,
  getQuickAsked,
  getQuickPin,
  getStoredIdentifier,
  getStoredRefreshToken,
  setFaceEnabled,
  setFingerprintEnabled,
  setQuickAsked,
  setQuickPin,
  setStoredIdentifier,
  setStoredRefreshToken,
  clearQuickPin,
  type StoredIdentifier,
} from "./storage";
import type { User } from "@/lib/types";

type AuthState = {
  status: "loading" | "unauthenticated" | "locked" | "authenticated";
  user: User | null;
  storedIdentifier: StoredIdentifier | null;
  needsQuickUnlockSetup: boolean;
  quickUnlockEnabled: boolean;
  fingerprintEnabled: boolean;
  faceEnabled: boolean;
};

type AuthContextValue = AuthState & {
  loginWithPassword: (id: Identifier, password: string) => Promise<void>;
  register: (id: Identifier, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgetIdentifier: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (user: User) => void;
  // Quick unlock primitives
  enableQuickUnlock: (pin: string) => Promise<void>;
  skipQuickUnlock: () => Promise<void>;
  disableQuickUnlock: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  approveUnlock: () => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  // Verification-aware setters
  setQuickPinValue: (pin: string) => Promise<void>;
  removeQuickPin: () => Promise<void>;
  setFingerprint: (enabled: boolean) => Promise<void>;
  setFace: (enabled: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function identifierFromUser(user: User): StoredIdentifier | null {
  if (user.phone) return { method: "phone", value: user.phone };
  if (user.email) return { method: "email", value: user.email };
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    storedIdentifier: null,
    needsQuickUnlockSetup: false,
    quickUnlockEnabled: false,
    fingerprintEnabled: false,
    faceEnabled: false,
  });

  const logout = useCallback(async () => {
    const refreshToken = refreshTokenRef.current;
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore
      }
    }
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    await clearStoredRefreshToken();
    await clearQuickUnlock();
    await cancelAllNotifications();
    queryClient.clear();
    setState((s) => ({
      status: "unauthenticated",
      user: null,
      storedIdentifier: s.storedIdentifier,
      needsQuickUnlockSetup: false,
      quickUnlockEnabled: false,
      fingerprintEnabled: false,
      faceEnabled: false,
    }));
  }, [queryClient]);

  useEffect(() => {
    configureTokens({
      getAccessToken: () => accessTokenRef.current,
      setAccessToken: (token) => {
        accessTokenRef.current = token;
      },
      getRefreshToken: async () => refreshTokenRef.current,
      setRefreshToken: async (token) => {
        refreshTokenRef.current = token;
        await setStoredRefreshToken(token);
      },
      onAuthFailure: async () => {
        accessTokenRef.current = null;
        refreshTokenRef.current = null;
        await clearStoredRefreshToken();
        await clearQuickUnlock();
        queryClient.clear();
        setState((s) => ({
          status: "unauthenticated",
          user: null,
          storedIdentifier: s.storedIdentifier,
          needsQuickUnlockSetup: false,
          quickUnlockEnabled: false,
          fingerprintEnabled: false,
          faceEnabled: false,
        }));
      },
    });
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedToken, storedIdentifier, quickPin, fingerprint, face] = await Promise.all([
        getStoredRefreshToken(),
        getStoredIdentifier(),
        getQuickPin(),
        getFingerprintEnabled(),
        getFaceEnabled(),
      ]);
      if (cancelled) return;

      const pinEnabled = !!quickPin;
      const anyQuick = pinEnabled || fingerprint || face;

      if (!storedToken) {
        setState({
          status: "unauthenticated",
          user: null,
          storedIdentifier,
          needsQuickUnlockSetup: false,
          quickUnlockEnabled: false,
          fingerprintEnabled: false,
          faceEnabled: false,
        });
        return;
      }

      refreshTokenRef.current = storedToken;

      if (anyQuick) {
        setState({
          status: "locked",
          user: null,
          storedIdentifier,
          needsQuickUnlockSetup: false,
          quickUnlockEnabled: pinEnabled,
          fingerprintEnabled: fingerprint,
          faceEnabled: face,
        });
        return;
      }

      try {
        const { user } = await authApi.me();
        if (cancelled) return;
        setState({
          status: "authenticated",
          user,
          storedIdentifier: identifierFromUser(user) ?? storedIdentifier,
          needsQuickUnlockSetup: false,
          quickUnlockEnabled: false,
          fingerprintEnabled: false,
          faceEnabled: false,
        });
      } catch {
        if (cancelled) return;
        refreshTokenRef.current = null;
        await clearStoredRefreshToken();
        setState({
          status: "unauthenticated",
          user: null,
          storedIdentifier,
          needsQuickUnlockSetup: false,
          quickUnlockEnabled: false,
          fingerprintEnabled: false,
          faceEnabled: false,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback(
    async (
      accessToken: string,
      refreshToken: string,
      user: User,
      opts: { promptQuickUnlock: boolean }
    ) => {
      queryClient.clear();
      accessTokenRef.current = accessToken;
      refreshTokenRef.current = refreshToken;
      await setStoredRefreshToken(refreshToken);
      const id = identifierFromUser(user);
      if (id) await setStoredIdentifier(id);

      const asked = await getQuickAsked();
      const pin = await getQuickPin();
      const fingerprint = await getFingerprintEnabled();
      const face = await getFaceEnabled();
      const shouldPrompt = opts.promptQuickUnlock && !asked && !pin && !fingerprint && !face;

      setState({
        status: "authenticated",
        user,
        storedIdentifier: id,
        needsQuickUnlockSetup: shouldPrompt,
        quickUnlockEnabled: !!pin,
        fingerprintEnabled: fingerprint,
        faceEnabled: face,
      });
    },
    [queryClient]
  );

  const loginWithPassword = useCallback(
    async (id: Identifier, password: string) => {
      const res = await authApi.login(id, password);
      await setSession(res.accessToken, res.refreshToken, res.user, {
        promptQuickUnlock: false,
      });
    },
    [setSession]
  );

  const register = useCallback(
    async (id: Identifier, password: string) => {
      const res = await authApi.register(id, password);
      await setSession(res.accessToken, res.refreshToken, res.user, {
        promptQuickUnlock: true,
      });
    },
    [setSession]
  );

  const enableQuickUnlock = useCallback(async (pin: string) => {
    await setQuickPin(pin);
    await setQuickAsked(true);
    setState((s) => ({
      ...s,
      needsQuickUnlockSetup: false,
      quickUnlockEnabled: true,
    }));
  }, []);

  const setQuickPinValue = useCallback(async (pin: string) => {
    await setQuickPin(pin);
    await setQuickAsked(true);
    setState((s) => ({ ...s, quickUnlockEnabled: true, needsQuickUnlockSetup: false }));
  }, []);

  const removeQuickPin = useCallback(async () => {
    await clearQuickPin();
    setState((s) => ({ ...s, quickUnlockEnabled: false }));
  }, []);

  const setFingerprint = useCallback(async (enabled: boolean) => {
    await setFingerprintEnabled(enabled);
    await setQuickAsked(true);
    setState((s) => ({ ...s, fingerprintEnabled: enabled, needsQuickUnlockSetup: false }));
  }, []);

  const setFace = useCallback(async (enabled: boolean) => {
    await setFaceEnabled(enabled);
    await setQuickAsked(true);
    setState((s) => ({ ...s, faceEnabled: enabled, needsQuickUnlockSetup: false }));
  }, []);

  const skipQuickUnlock = useCallback(async () => {
    await setQuickAsked(true);
    setState((s) => ({ ...s, needsQuickUnlockSetup: false }));
  }, []);

  const disableQuickUnlock = useCallback(async () => {
    await clearQuickUnlock();
    setState((s) => ({
      ...s,
      quickUnlockEnabled: false,
      fingerprintEnabled: false,
      faceEnabled: false,
    }));
  }, []);

  const unlockWithPin = useCallback(async (pin: string) => {
    const saved = await getQuickPin();
    if (!saved || saved !== pin) return false;
    try {
      const { user } = await authApi.me();
      setState((s) => ({
        ...s,
        status: "authenticated",
        user,
        storedIdentifier: identifierFromUser(user) ?? s.storedIdentifier,
      }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const approveUnlock = useCallback(async () => {
    const { user } = await authApi.me();
    setState((s) => ({
      ...s,
      status: "authenticated",
      user,
      storedIdentifier: identifierFromUser(user) ?? s.storedIdentifier,
    }));
  }, []);

  const changePin = useCallback(async (oldPin: string, newPin: string) => {
    const saved = await getQuickPin();
    if (!saved || saved !== oldPin) return false;
    await setQuickPin(newPin);
    return true;
  }, []);

  const forgetIdentifier = useCallback(async () => {
    await clearStoredIdentifier();
    setState((s) => ({ ...s, storedIdentifier: null }));
  }, []);

  const refreshMe = useCallback(async () => {
    const { user } = await authApi.me();
    setState((s) => ({ ...s, user, status: "authenticated" }));
  }, []);

  const setUser = useCallback((user: User) => {
    setState((s) => ({ ...s, user }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loginWithPassword,
      register,
      logout,
      forgetIdentifier,
      refreshMe,
      setUser,
      enableQuickUnlock,
      skipQuickUnlock,
      disableQuickUnlock,
      unlockWithPin,
      approveUnlock,
      changePin,
      setQuickPinValue,
      removeQuickPin,
      setFingerprint,
      setFace,
    }),
    [
      state,
      loginWithPassword,
      register,
      logout,
      forgetIdentifier,
      refreshMe,
      setUser,
      enableQuickUnlock,
      skipQuickUnlock,
      disableQuickUnlock,
      unlockWithPin,
      approveUnlock,
      changePin,
      setQuickPinValue,
      removeQuickPin,
      setFingerprint,
      setFace,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
