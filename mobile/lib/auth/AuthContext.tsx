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
  getBiometricEnabled,
  getQuickAsked,
  getQuickPin,
  getStoredIdentifier,
  getStoredRefreshToken,
  setBiometricEnabled,
  setQuickAsked,
  setQuickPin,
  setStoredIdentifier,
  setStoredRefreshToken,
  type StoredIdentifier,
} from "./storage";
import type { User } from "@/lib/types";

type AuthState = {
  status: "loading" | "unauthenticated" | "locked" | "authenticated";
  user: User | null;
  storedIdentifier: StoredIdentifier | null;
  // After a fresh registration, prompt the user to opt-in to quick sign-in.
  needsQuickUnlockSetup: boolean;
  // Whether the local quick-unlock PIN is currently set.
  quickUnlockEnabled: boolean;
  biometricEnabled: boolean;
};

type AuthContextValue = AuthState & {
  loginWithPassword: (id: Identifier, password: string) => Promise<void>;
  register: (id: Identifier, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgetIdentifier: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (user: User) => void;
  // Quick unlock
  enableQuickUnlock: (pin: string) => Promise<void>;
  setBiometric: (enabled: boolean) => Promise<void>;
  skipQuickUnlock: () => Promise<void>;
  disableQuickUnlock: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  approveUnlock: () => Promise<void>;
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
    biometricEnabled: false,
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
      biometricEnabled: false,
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
          biometricEnabled: false,
        }));
      },
    });
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedToken, storedIdentifier, quickPin, biometric] = await Promise.all([
        getStoredRefreshToken(),
        getStoredIdentifier(),
        getQuickPin(),
        getBiometricEnabled(),
      ]);
      if (cancelled) return;

      const quickUnlockEnabled = !!quickPin;

      if (!storedToken) {
        setState({
          status: "unauthenticated",
          user: null,
          storedIdentifier,
          needsQuickUnlockSetup: false,
          quickUnlockEnabled: false,
          biometricEnabled: false,
        });
        return;
      }

      refreshTokenRef.current = storedToken;

      if (quickUnlockEnabled) {
        // Don't fetch /me yet — show the lock screen and let user unlock.
        setState({
          status: "locked",
          user: null,
          storedIdentifier,
          needsQuickUnlockSetup: false,
          quickUnlockEnabled: true,
          biometricEnabled: biometric,
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
          biometricEnabled: biometric,
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
          biometricEnabled: false,
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

      // Determine if we should prompt for quick-unlock setup.
      const asked = await getQuickAsked();
      const hasPin = !!(await getQuickPin());
      const shouldPrompt = opts.promptQuickUnlock && !asked && !hasPin;
      const biometric = await getBiometricEnabled();

      setState({
        status: "authenticated",
        user,
        storedIdentifier: id,
        needsQuickUnlockSetup: shouldPrompt,
        quickUnlockEnabled: hasPin,
        biometricEnabled: biometric,
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
      // Brand-new account → prompt for quick-unlock.
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

  const setBiometric = useCallback(async (enabled: boolean) => {
    await setBiometricEnabled(enabled);
    setState((s) => ({ ...s, biometricEnabled: enabled }));
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
      biometricEnabled: false,
    }));
  }, []);

  const unlockWithPin = useCallback(async (pin: string) => {
    const saved = await getQuickPin();
    if (!saved || saved !== pin) return false;
    // Local check passed — promote to authenticated by fetching profile.
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

  // Promote a locked session to authenticated after the user proves identity
  // (e.g. via biometric — the caller has already run LocalAuthentication).
  const approveUnlock = useCallback(async () => {
    const { user } = await authApi.me();
    setState((s) => ({
      ...s,
      status: "authenticated",
      user,
      storedIdentifier: identifierFromUser(user) ?? s.storedIdentifier,
    }));
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
      setBiometric,
      skipQuickUnlock,
      disableQuickUnlock,
      unlockWithPin,
      approveUnlock,
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
      setBiometric,
      skipQuickUnlock,
      disableQuickUnlock,
      unlockWithPin,
      approveUnlock,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
