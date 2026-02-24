import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Picture Pros AI — Pro Sports Portraits from Any Photo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e1b4b 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 20px",
            borderRadius: "999px",
            border: "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.1)",
            marginBottom: "24px",
          }}
        >
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399" }} />
          <span style={{ color: "#818cf8", fontSize: "16px", fontWeight: 700 }}>AI-Powered Sports Portraits</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "64px", fontWeight: 900, color: "white", letterSpacing: "-2px", lineHeight: 1.1 }}>
            Picture Pros
          </span>
          <span
            style={{
              fontSize: "64px",
              fontWeight: 900,
              letterSpacing: "-2px",
              lineHeight: 1.1,
              background: "linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            AI
          </span>
        </div>
        <p style={{ fontSize: "24px", color: "#94a3b8", marginTop: "20px", maxWidth: "700px", textAlign: "center", lineHeight: 1.5 }}>
          Turn any photo into a professional sports portrait in seconds
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "32px",
            padding: "14px 32px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            boxShadow: "0 20px 40px rgba(99,102,241,0.3)",
          }}
        >
          <span style={{ color: "white", fontSize: "20px", fontWeight: 800, letterSpacing: "1px" }}>TRY IT FREE</span>
        </div>
        <p style={{ position: "absolute", bottom: "24px", fontSize: "16px", color: "#475569", fontWeight: 700 }}>
          picturepros.ai
        </p>
      </div>
    ),
    { ...size }
  );
}
