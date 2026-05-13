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
import { authApi, type Identifier } from "@/lib/api/endpoints";
import { cancelAll as cancelAllNotifications } from "@/lib/notifications";
import {
  clearStoredIdentifier,
  clearStoredRefreshToken,
  getStoredIdentifier,
  getStoredRefreshToken,
  setStoredIdentifier,
  setStoredRefreshToken,
  type StoredIdentifier,
} from "./storage";
import type { User } from "@/lib/types";

type AuthState = {
  status: "loading" | "unauthenticated" | "authenticated";
  user: User | null;
  storedIdentifier: StoredIdentifier | null;
};

type AuthContextValue = AuthState & {
  loginWithPassword: (id: Identifier, password: string) => Promise<void>;
  register: (id: Identifier, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgetIdentifier: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function identifierFromUser(user: User): StoredIdentifier | null {
  if (user.phone) return { method: "phone", value: user.phone };
  if (user.email) return { method: "email", value: user.email };
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    storedIdentifier: null,
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
    await cancelAllNotifications();
    setState((s) => ({
      status: "unauthenticated",
      user: null,
      storedIdentifier: s.storedIdentifier,
    }));
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
        setState((s) => ({
          status: "unauthenticated",
          user: null,
          storedIdentifier: s.storedIdentifier,
        }));
      },
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedToken, storedIdentifier] = await Promise.all([
        getStoredRefreshToken(),
        getStoredIdentifier(),
      ]);
      if (cancelled) return;

      if (!storedToken) {
        setState({ status: "unauthenticated", user: null, storedIdentifier });
        return;
      }

      refreshTokenRef.current = storedToken;
      try {
        const { user } = await authApi.me();
        if (cancelled) return;
        setState({
          status: "authenticated",
          user,
          storedIdentifier: identifierFromUser(user) ?? storedIdentifier,
        });
      } catch {
        if (cancelled) return;
        refreshTokenRef.current = null;
        await clearStoredRefreshToken();
        setState({ status: "unauthenticated", user: null, storedIdentifier });
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
      const id = identifierFromUser(user);
      if (id) await setStoredIdentifier(id);
      setState({ status: "authenticated", user, storedIdentifier: id });
    },
    []
  );

  const loginWithPassword = useCallback(
    async (id: Identifier, password: string) => {
      const res = await authApi.login(id, password);
      await setSession(res.accessToken, res.refreshToken, res.user);
    },
    [setSession]
  );

  const register = useCallback(
    async (id: Identifier, password: string) => {
      const res = await authApi.register(id, password);
      await setSession(res.accessToken, res.refreshToken, res.user);
    },
    [setSession]
  );

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
    }),
    [state, loginWithPassword, register, logout, forgetIdentifier, refreshMe, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
