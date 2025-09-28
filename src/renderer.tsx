import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div style={{ padding: "1rem" }}>
      <h1>💖 Hello React + Electron + Vite!</h1>
      <p>This is your renderer process.</p>
    </div>
  );
}

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<App />);
