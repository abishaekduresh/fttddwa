import { NextRequest, NextResponse } from "next/server";
import { consumePdfToken } from "@/lib/pdf-tokens";
import { generateIdCardPdf } from "@/lib/services/id-card-pdf";

/**
 * GET /members/id-card/pdf/[token]
 * 
 * Internal route for the public proxied PDF.
 * Validates a single-use token and generates the PDF.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const memberUuid = consumePdfToken(token);
  if (!memberUuid) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Link Expired | FTTDDWA</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary: #2563eb;
            --primary-hover: #1d4ed8;
            --error: #ef4444;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --bg: #f8fafc;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: radial-gradient(circle at top right, #e2e8f0, var(--bg));
            color: var(--text-main);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1.5rem;
          }
          .card {
            background: #ffffff;
            padding: 2.5rem 2rem;
            border-radius: 1.5rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
            max-width: 440px;
            width: 100%;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(8px);
          }
          .icon-box {
            width: 64px;
            height: 64px;
            background: #fef2f2;
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            color: var(--error);
          }
          h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-main);
            margin-bottom: 0.75rem;
            letter-spacing: -0.025em;
          }
          p {
            color: var(--text-muted);
            font-size: 0.9375rem;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--primary);
            color: #ffffff;
            padding: 0.75rem 1.75rem;
            border-radius: 0.75rem;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9375rem;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
          }
          .btn:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
          }
          @media (max-width: 480px) {
            .card { padding: 2rem 1.5rem; }
            h2 { font-size: 1.25rem; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h2>Link Expired or Already Used</h2>
          <p>This secure PDF link is single-use and valid for 10 minutes only. Please verify your details again to generate a new link.</p>
          <a href="/members/id-card" class="btn">Verify Again</a>
        </div>
      </body>
      </html>`,
      { status: 410, headers: { "Content-Type": "text/html" } }
    );
  }

  const pdfBuffer = await generateIdCardPdf(memberUuid);
  if (!pdfBuffer) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="member-id-card.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
