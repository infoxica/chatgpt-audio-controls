import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

// A browser action popup needs an intrinsic width before its first layout.
// Mobile hosts may not expose getViews; their viewport remains fluid.
try {
  const popup = chrome.extension?.getViews?.({ type: 'popup' }).includes(window);
  if (popup && !/Android|iPhone|iPad/i.test(navigator.userAgent)) document.documentElement.dataset.surface = 'toolbar-popup';
} catch { /* Full-page preview or a host without the extension API. */ }

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
