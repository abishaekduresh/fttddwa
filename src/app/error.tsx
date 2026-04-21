"use client";

import { useEffect } from "react";
import { DatabaseError } from "@/components/shared/database-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  // Check if it's a Prisma/Database connection error
  const isDatabaseError = 
    error.message?.toLowerCase().includes("prisma") || 
    error.message?.toLowerCase().includes("database") ||
    error.message?.toLowerCase().includes("connection") ||
    error.message?.toLowerCase().includes("fetch") ||
    error.digest?.startsWith("PRISMA_");

  if (isDatabaseError) {
    return <DatabaseError />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong!</h2>
        <p className="text-slate-600 mb-8">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={() => reset()}
          className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
