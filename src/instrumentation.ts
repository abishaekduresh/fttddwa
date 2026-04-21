/**
 * Next.js instrumentation hook — runs once at server startup before any route.
 * Sets the process timezone to IST so all new Date() calls are IST-aware.
 */
export async function register() {
  process.env.TZ = process.env.TIMEZONE || "Asia/Kolkata";
}
