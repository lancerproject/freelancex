import { ImageResponse } from "next/og";

// Default social / search preview image for the site (1200×630). Next.js wires
// this into the OpenGraph + Twitter tags automatically.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Xwork — Hire Freelancers & Find Freelance Jobs";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>
          Xwork
        </div>
        <div style={{ fontSize: 46, fontWeight: 700, marginTop: 16 }}>
          Hire the right talent. Get great work done.
        </div>
        <div style={{ fontSize: 30, marginTop: 24, opacity: 0.9 }}>
          A freelance marketplace for design, development, writing &amp;
          marketing. Post a job free — pay safely with escrow.
        </div>
        <div style={{ fontSize: 28, marginTop: 40, opacity: 0.85 }}>
          thexwork.com
        </div>
      </div>
    ),
    { ...size }
  );
}
