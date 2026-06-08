import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogAlt = "Transcoder: adaptive video pipeline with AI captions";

// Glyph superset so the subsetted Google Font responses cover every character
// the image can render (avoids missing-glyph boxes if the copy ever changes).
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?'\"·-/&()";

async function loadGoogleFont(family: string, query: string) {
  const url = `https://fonts.googleapis.com/css2?family=${query}&text=${encodeURIComponent(GLYPHS)}`;
  const css = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
  const src = css.match(/src:\s*url\((.+?)\)\s*format/);
  if (!src) throw new Error(`Could not load font: ${family}`);
  return (await fetch(src[1])).arrayBuffer();
}

export async function renderOgImage() {
  const [serif, serifItalic, mono] = await Promise.all([
    loadGoogleFont("Instrument Serif", "Instrument+Serif"),
    loadGoogleFont("Instrument Serif", "Instrument+Serif:ital@1"),
    loadGoogleFont("JetBrains Mono", "JetBrains+Mono:wght@500"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "76px",
          backgroundColor: "#0b0b0c",
          backgroundImage: "radial-gradient(circle at 88% 0%, rgba(205,251,70,0.18), rgba(205,251,70,0) 55%)",
        }}
      >
        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "54px",
              height: "54px",
              borderRadius: "12px",
              border: "1px solid #26262b",
              background: "#131316",
            }}
          >
            <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: "#cdfb46" }} />
          </div>
          <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: "28px", color: "#ededec", letterSpacing: "-0.01em" }}>
            <span>transcoder</span>
            <span style={{ color: "#cdfb46" }}>.</span>
          </div>
        </div>

        {/* headline — mirrors the hero, serif with an italic lime accent */}
        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Instrument Serif", fontSize: "82px", lineHeight: 1.0, letterSpacing: "-0.015em" }}>
          <div style={{ display: "flex", color: "#ededec" }}>
            <span>Upload a video.</span>
          </div>
          <div style={{ display: "flex" }}>
            <span style={{ color: "#ededec", marginRight: "0.3em" }}>Get a</span>
            <span style={{ fontFamily: "Instrument Serif Italic", fontStyle: "italic", color: "#cdfb46" }}>streaming-ready</span>
          </div>
          <div style={{ display: "flex", color: "#ededec" }}>
            <span>pipeline back.</span>
          </div>
        </div>

        {/* subtitle + footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          <div style={{ display: "flex", maxWidth: "820px", fontFamily: "JetBrains Mono", fontSize: "25px", lineHeight: 1.4, color: "#9a9a9f" }}>
            <span>Adaptive HLS from 144p to 4K, AI captions, signed global delivery.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontFamily: "JetBrains Mono", fontSize: "23px", color: "#9a9a9f" }}>
            <div style={{ width: "9px", height: "9px", borderRadius: "3px", background: "#cdfb46" }} />
            <span>transcode.pixly.sh</span>
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "JetBrains Mono", data: mono, weight: 500, style: "normal" },
        { name: "Instrument Serif", data: serif, weight: 400, style: "normal" },
        { name: "Instrument Serif Italic", data: serifItalic, weight: 400, style: "italic" },
      ],
    },
  );
}
