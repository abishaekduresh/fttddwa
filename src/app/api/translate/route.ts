import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy API to circumvent CORS issues when calling Google Input Tools directly from the browser.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");

  if (!text) {
    return NextResponse.json({ success: false, message: "Text parameter is required" }, { status: 400 });
  }

  try {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ta-t-i0-und&num=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data[0] === "SUCCESS" && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
      return NextResponse.json({ 
        success: true, 
        tamil: data[1][0][1][0] 
      });
    }
    
    return NextResponse.json({ success: false, message: "Translation failed" }, { status: 500 });
  } catch (err) {
    console.error("Internal translation proxy error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
