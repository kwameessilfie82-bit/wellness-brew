"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>Something went wrong</h1>
        <p style={{ color: "#666", maxWidth: "28rem", marginBottom: "1.5rem" }}>
          We hit an unexpected problem. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{ padding: "0.6rem 1.25rem", borderRadius: 8, border: 0, background: "#111", color: "#fff", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
