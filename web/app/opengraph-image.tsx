import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Transcoder: adaptive video pipeline with AI captions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0c",
          padding: "72px",
          fontFamily: "monospace",
        }}
      >
        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              border: "1px solid #26262b",
              background: "#131316",
            }}
          >
            <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#cdfb46" }} />
          </div>
          <div style={{ fontSize: "30px", color: "#ededec", letterSpacing: "-0.02em" }}>
            transcoder<span style={{ color: "#cdfb46" }}>.</span>
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ fontSize: "68px", color: "#ededec", lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: "900px" }}>
            Adaptive video pipeline with <span style={{ color: "#cdfb46" }}>AI captions</span>
          </div>
          <div style={{ fontSize: "30px", color: "#9a9a9f", lineHeight: 1.3, maxWidth: "880px" }}>
            Upload once. Adaptive HLS from 144p to 4K, auto captions, global CDN delivery.
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "24px", color: "#9a9a9f" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: "#cdfb46" }} />
          transcode.pixly.sh
        </div>
      </div>
    ),
    { ...size },
  );
}
