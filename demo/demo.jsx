import React from "react";
import { createRoot } from "react-dom/client";
import { IrisAssistant } from "../src/index.js";
import irisConfig from "./iris.config.js";

function DemoPage() {
  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          padding: "48px min(7vw, 88px)",
          color: "#111827",
          background:
            "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 42%, #eef2ff 100%)",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}
      >
        <section style={{ maxWidth: 760 }}>
          <p
            style={{
              margin: "0 0 12px",
              color: "#2563eb",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: "uppercase"
            }}
          >
            Local preview
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(36px, 7vw, 72px)",
              lineHeight: 1,
              letterSpacing: 0
            }}
          >
            Iris Assistant
          </h1>
          <p
            style={{
              maxWidth: 620,
              margin: "24px 0 0",
              color: "#374151",
              fontSize: 20,
              lineHeight: 1.6
            }}
          >
            This page mounts the packaged React component so you can inspect the
            floating assistant, open the chat, and try the demo replies.
          </p>
        </section>
      </main>
      <IrisAssistant config={irisConfig} />
    </>
  );
}

createRoot(document.getElementById("root")).render(<DemoPage />);
