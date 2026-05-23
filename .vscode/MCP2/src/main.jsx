import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "../assets/mcp-implementation/mcp-effects.js";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
