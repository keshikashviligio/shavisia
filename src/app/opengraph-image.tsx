import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "shavisia.ge — მძღოლების შავი სია";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Satori's default font has no Georgian glyphs, so the image text stays Latin.
export default async function Image() {
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"));
  const turtle = `data:image/svg+xml;base64,${svg.toString("base64")}`;

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
          background: "#000000",
          color: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={turtle} alt="" width={280} height={280} />
        <div style={{ marginTop: 32, fontSize: 96, fontWeight: 700 }}>
          shavisia.ge
        </div>
      </div>
    ),
    size
  );
}
