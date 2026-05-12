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
import { configureTokens } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import {
  clearStoredPhone,
  clearStoredRefreshToken,
  getStoredPhone,
  getStoredRefreshToken,
  setStoredPhone,
  setStoredRefreshToken,
} from "./storage";
import type { User } from "@/lib/types";

type AuthState = {
  status: "loading" | "unauthenticated" | "authenticated";
  user: User | null;
  storedPhone: string | null;
};

type AuthContextValue = AuthState & {
  loginWithOtp: (
    phone: string,
    code: string
  ) => Promise<{ isNewUser: boolean; hasPinSet: boolean }>;
  loginWithPin: (phone: string, pin: string) => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  forgetPhone: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    storedPhone: null,
  });

  const logout = useCallback(async () => {
    const refreshToken = refreshTokenRef.current;
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore — local state is what matters
      }
    }
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    await clearStoredRefreshToken();
    setState((s) => ({ status: "unauthenticated", user: null, storedPhone: s.storedPhone }));
  }, []);

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
        setState((s) => ({ status: "unauthenticated", user: null, storedPhone: s.storedPhone }));
      },
    });
  }, []);

  // Bootstrap on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedToken, storedPhone] = await Promise.all([
        getStoredRefreshToken(),
        getStoredPhone(),
      ]);
      if (cancelled) return;

      if (!storedToken) {
        setState({ status: "unauthenticated", user: null, storedPhone });
        return;
      }

      refreshTokenRef.current = storedToken;
      // Force a refresh to validate the token + fetch profile.
      try {
        // Trigger refresh by calling /me which auto-refreshes on 401.
        const { user } = await authApi.me();
        if (cancelled) return;
        setState({ status: "authenticated", user, storedPhone });
      } catch {
        if (cancelled) return;
        refreshTokenRef.current = null;
        await clearStoredRefreshToken();
        setState({ status: "unauthenticated", user: null, storedPhone });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback(
    async (accessToken: string, refreshToken: string, user: User) => {
      accessTokenRef.current = accessToken;
      refreshTokenRef.current = refreshToken;
      await setStoredRefreshToken(refreshToken);
      await setStoredPhone(user.phone);
      setState({ status: "authenticated", user, storedPhone: user.phone });
    },
    []
  );

  const loginWithOtp = useCallback(
    async (phone: string, code: string) => {
      const res = await authApi.verifyOtp(phone, code);
      await setSession(res.accessToken, res.refreshToken, res.user);
      return { isNewUser: res.isNewUser, hasPinSet: res.hasPinSet };
    },
    [setSession]
  );

  const loginWithPin = useCallback(
    async (phone: string, pin: string) => {
      const res = await authApi.loginPin(phone, pin);
      await setSession(res.accessToken, res.refreshToken, res.user);
    },
    [setSession]
  );

  const setupPin = useCallback(async (pin: string) => {
    await authApi.setupPin(pin);
  }, []);

  const forgetPhone = useCallback(async () => {
    await clearStoredPhone();
    setState((s) => ({ ...s, storedPhone: null }));
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
      loginWithOtp,
      loginWithPin,
      setupPin,
      logout,
      forgetPhone,
      refreshMe,
      setUser,
    }),
    [state, loginWithOtp, loginWithPin, setupPin, logout, forgetPhone, refreshMe, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
