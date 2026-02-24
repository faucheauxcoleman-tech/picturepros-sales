import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #22d3ee, #6366f1, #a855f7)",
          borderRadius: "8px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: "18px", fontWeight: 900, color: "white", letterSpacing: "-1px" }}>
          PP
        </span>
      </div>
    ),
    { ...size }
  );
}
