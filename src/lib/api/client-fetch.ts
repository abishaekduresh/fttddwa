"use client";

/**
 * apiFetch — drop-in replacement for fetch() in dashboard components.
 *
 * On a 401 response:
 *   1. Attempts a silent token refresh (/api/auth/refresh)
 *   2. If refresh succeeds, retries the original request once
 *   3. If still 401 (or refresh failed) → shows "Session expired" toast
 *      and hard-redirects to /login after 1.5 s
 *
 * Auth endpoints (/api/auth/*) are passed through as-is to avoid loops.
 */

let redirecting = false;

function expireSession() {
  if (redirecting || typeof window === "undefined") return;
  redirecting = true;

  // Dynamic import avoids SSR issues with react-hot-toast
  import("react-hot-toast")
    .then(({ default: toast }) => {
      toast.error("Session expired. Redirecting to sign in...", {
        id: "session-expired",
        duration: 4000,
      });
    })
    .catch(() => {});

  setTimeout(() => {
    window.location.href = "/login";
  }, 1500);
}

export async function apiFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // Always pass auth routes through — never retry/redirect on them
  if (url.startsWith("/api/auth/")) {
    return fetch(url, options);
  }

  const res = await fetch(url, options);
  if (res.status !== 401) return res;

  // First 401 — attempt silent refresh
  try {
    const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
    if (refreshRes.ok) {
      const retried = await fetch(url, options);
      if (retried.status !== 401) return retried;
    }
  } catch {
    // Network error during refresh — fall through to session expiry
  }

  // Refresh failed or retried request still 401
  expireSession();
  return res; // Return the 401 so callers can still inspect if needed
}
