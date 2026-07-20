import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — AI Career Agent`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SPARKLE_PATH =
  "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0a",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#fafafa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="42"
              height="42"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0a0a0a"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={SPARKLE_PATH} />
            </svg>
          </div>
          <div style={{ fontSize: 44, fontWeight: 600, color: "#fafafa" }}>
            {siteConfig.name}
          </div>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 600,
            color: "#fafafa",
            lineHeight: 1.15,
            maxWidth: "920px",
          }}
        >
          Your AI Career Agent, not another job board.
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#a3a3a3",
            marginTop: "28px",
            maxWidth: "820px",
          }}
        >
          Resume intelligence, career strategy, and job-search execution —
          powered by AI that works for you.
        </div>
      </div>
    ),
    { ...size },
  );
}
