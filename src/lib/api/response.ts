import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]> | string[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function ok<T>(data: T, message?: string, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function created<T>(data: T, message = "Created successfully"): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message }, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function error(message: string, status = 400, errors?: Record<string, string[]>): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, message, errors }, { status });
}

export function unauthorized(message = "Unauthorized"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, message }, { status: 401 });
}

export function forbidden(message = "Forbidden"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, message }, { status: 403 });
}

export function notFound(message = "Not found"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, message }, { status: 404 });
}

export function serverError(err?: unknown): NextResponse<ApiResponse> {
  const isDev = process.env.APP_ENV !== "production";

  // Always log the error to console on the server for debugging via logs
  if (err != null) {
    console.error("[ServerError]", err);
  }

  if (isDev && err != null) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error
      ? err.stack?.split("\n").slice(0, 6).map((l) => l.trim())
      : undefined;
    return NextResponse.json({ success: false, message, debug: { stack } }, { status: 500 });
  }

  return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
}

export function paginatedOk<T>(
  data: T[],
  pagination: ApiResponse["pagination"]
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({ success: true, data, pagination }, { status: 200 });
}
