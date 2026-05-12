import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:8083",
  "http://localhost:19006",
];

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  headers.set("Access-Control-Allow-Origin", allowed);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const response = NextResponse.next();
  const headers = corsHeaders(origin);
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
