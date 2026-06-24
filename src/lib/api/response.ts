import { NextResponse } from "next/server";

export type ApiSuccess<T> = { data: T; error: null };
export type ApiError = { data: null; error: string; code?: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null } satisfies ApiSuccess<T>, {
    status,
  });
}

export function err(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { data: null, error: message, code } satisfies ApiError,
    { status }
  );
}

export const Errors = {
  unauthorized: () => err("Unauthorized", 401, "UNAUTHORIZED"),
  forbidden: () => err("Forbidden", 403, "FORBIDDEN"),
  notFound: (entity = "Resource") =>
    err(`${entity} not found`, 404, "NOT_FOUND"),
  badRequest: (msg: string) => err(msg, 400, "BAD_REQUEST"),
  internal: (msg = "Internal server error") => err(msg, 500, "INTERNAL"),
};
