import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backendUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://teamscoutai-474460553303.us-central1.run.app";
  try {
    const body = await req.text();

    const backendRes = await fetch(`${backendUrl}/api/consumer/portrait`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    let data;
    try {
      data = await backendRes.json();
    } catch {
      return NextResponse.json(
        { error: { message: `Backend returned non-JSON (${backendRes.status})` } },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("[api/generate] proxy error:", err);
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "Proxy error" } },
      { status: 502 }
    );
  }
}
