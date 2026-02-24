import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// StrictMode temporarily disabled for debugging socket event reception issues
// StrictMode causes intentional double-mounting in development which was creating
// console noise and potential timing issues with socket event listeners
// TODO: Re-enable StrictMode after socket issues are resolved
ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
