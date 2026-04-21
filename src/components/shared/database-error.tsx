"use client";

import { Database, RefreshCcw, AlertTriangle } from "lucide-react";

export function DatabaseError() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-red-600 h-2 w-full" />
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-red-100 p-4 rounded-full">
                <Database className="h-10 w-10 text-red-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border-2 border-slate-50">
                <AlertTriangle className="h-5 w-5 text-amber-500 fill-amber-500" />
              </div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Database Connection Lost
            </h1>
            <p className="text-slate-600 mb-8 leading-relaxed">
              We're having trouble connecting to our database server. This might
              be due to scheduled maintenance or a temporary service outage.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-md shadow-primary/20"
              >
                <RefreshCcw className="h-4 w-4" />
                Try Again
              </button>
              
              <div className="pt-4 border-t border-slate-100 mt-6">
                <p className="text-xs text-slate-400 font-medium">
                  If the problem persists, please contact technical support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
