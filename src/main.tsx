import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { getBasePath } from "./lib/basePath";
import { shouldSkipReactMount } from "./lib/pagesAssetGuard";
import "./styles/global.css";

if (!shouldSkipReactMount()) {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter basename={getBasePath()}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
