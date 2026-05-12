import { NextResponse } from "next/server";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function error(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { success: false, error: { code: code ?? "ERROR", message } },
    { status }
  );
}

export function unauthorized(message = "Unauthorized") {
  return error(message, 401, "UNAUTHORIZED");
}

export function notFound(message = "Not found") {
  return error(message, 404, "NOT_FOUND");
}

export function validationError(message: string) {
  return error(message, 400, "VALIDATION_ERROR");
}
