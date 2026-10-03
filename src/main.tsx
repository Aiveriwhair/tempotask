import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { TimerProvider } from "./lib/TimerContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <TimerProvider>
        <App />
      </TimerProvider>
    </HashRouter>
  </React.StrictMode>,
);
