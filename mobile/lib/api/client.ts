import { API_URL } from "@/lib/config";
import type { ApiResponse, AuthTokens } from "@/lib/types";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type TokenProvider = {
  getAccessToken: () => string | null;
  setAccessToken: (token: string) => void;
  getRefreshToken: () => Promise<string | null>;
  setRefreshToken: (token: string) => Promise<void>;
  onAuthFailure: () => Promise<void>;
};

let tokens: TokenProvider | null = null;

export function configureTokens(provider: TokenProvider) {
  tokens = provider;
}

type RequestOpts = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

let refreshInflight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!tokens) return null;
  if (refreshInflight) return refreshInflight;

  refreshInflight = (async () => {
    const refreshToken = await tokens!.getRefreshToken();
    if (!refreshToken) return null;

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json = (await res.json()) as ApiResponse<AuthTokens>;
    if (!json.success) {
      await tokens!.onAuthFailure();
      return null;
    }
    tokens!.setAccessToken(json.data.accessToken);
    await tokens!.setRefreshToken(json.data.refreshToken);
    return json.data.accessToken;
  })();

  try {
    return await refreshInflight;
  } finally {
    refreshInflight = null;
  }
}

async function rawRequest<T>(path: string, opts: RequestOpts, accessToken: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new ApiError(json.error.message, json.error.code, res.status);
  }
  return json.data;
}

export async function apiRequest<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const requireAuth = opts.auth ?? true;
  let accessToken = requireAuth ? tokens?.getAccessToken() ?? null : null;

  try {
    return await rawRequest<T>(path, opts, accessToken);
  } catch (err) {
    if (requireAuth && err instanceof ApiError && err.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return rawRequest<T>(path, opts, newToken);
      }
    }
    throw err;
  }
}
