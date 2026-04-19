"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { useEffect, useState } from "react";
import { ExternalLink, FileCode2 } from "lucide-react";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-32 text-slate-400">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
        <p className="text-sm">Loading API Explorer...</p>
      </div>
    </div>
  ),
});

export default function ApiDocsPage() {
  const [specUrl, setSpecUrl] = useState("");

  useEffect(() => {
    // Build the absolute URL for the spec endpoint
    setSpecUrl(`${window.location.origin}/api/docs`);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Documentation</h1>
          <p className="text-slate-500 text-sm">
            Interactive REST API explorer — try endpoints directly from here
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline text-xs"
          >
            <FileCode2 size={14} /> OpenAPI JSON
          </a>
          <a
            href="/api/docs/yaml"
            className="btn btn-outline text-xs"
          >
            <ExternalLink size={14} /> Download YAML
          </a>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
        <span className="font-medium mt-0.5">Tip:</span>
        <span>
          To test protected endpoints, log in first (
          <code className="bg-blue-100 px-1 rounded text-xs">POST /api/auth/login</code>
          ). The session cookie will be sent automatically with subsequent requests from the same browser tab.
        </span>
      </div>

      {/* Swagger UI */}
      <div className="card overflow-hidden swagger-wrapper">
        {specUrl && (
          <SwaggerUI
            url={specUrl}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            displayRequestDuration
            tryItOutEnabled
            filter
            requestInterceptor={(req) => {
              // Ensure cookies are sent with cross-origin requests in dev
              req.credentials = "include";
              return req;
            }}
          />
        )}
      </div>

      {/* Swagger UI style overrides scoped to this page */}
      <style jsx global>{`
        .swagger-wrapper .swagger-ui .topbar {
          display: none;
        }
        .swagger-wrapper .swagger-ui .info {
          margin: 20px 0 10px;
        }
        .swagger-wrapper .swagger-ui .info .title {
          font-size: 1.5rem;
          font-family: Inter, sans-serif;
          color: #0f172a;
        }
        .swagger-wrapper .swagger-ui .info .description p {
          font-size: 0.875rem;
          color: #64748b;
        }
        .swagger-wrapper .swagger-ui .opblock-tag {
          font-family: Inter, sans-serif;
          font-size: 0.95rem;
          color: #1e40af;
          border-color: #e2e8f0;
        }
        .swagger-wrapper .swagger-ui .opblock .opblock-summary-operation-id,
        .swagger-wrapper .swagger-ui .opblock .opblock-summary-path,
        .swagger-wrapper .swagger-ui .opblock .opblock-summary-description {
          font-family: Inter, sans-serif;
        }
        .swagger-wrapper .swagger-ui .btn.execute {
          background-color: #2563eb;
          border-color: #2563eb;
        }
        .swagger-wrapper .swagger-ui .btn.execute:hover {
          background-color: #1d4ed8;
        }
        .swagger-wrapper .swagger-ui select,
        .swagger-wrapper .swagger-ui input[type="text"],
        .swagger-wrapper .swagger-ui textarea {
          font-family: Inter, sans-serif;
          font-size: 0.875rem;
        }
        .swagger-wrapper .swagger-ui .wrapper {
          padding: 0 20px 20px;
        }
      `}</style>
    </div>
  );
}
