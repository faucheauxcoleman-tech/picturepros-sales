import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Picture Pros AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public/assets/logo/PP LOGO AI.png"));
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

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
          background: "#020617",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <img src={logoBase64} width={500} height={125} style={{ objectFit: "contain" }} />
        <p
          style={{
            fontSize: "28px",
            color: "#64748b",
            marginTop: "24px",
            fontWeight: 500,
          }}
        >
          AI-Powered Sports Portraits
        </p>
      </div>
    ),
    { ...size }
  );
}
