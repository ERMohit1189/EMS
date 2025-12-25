import { createRoot } from "react-dom/client";
import App from "./App";
import { TooltipProvider } from '@/components/ui/tooltip';
import "./index.css";
import { Router } from "wouter";
// NOTE: prefer the richer Joyride implementation; keep lightweight Tour for fallback
import JoyrideTour from "@/components/JoyrideTour";

createRoot(document.getElementById("root")!).render(
  <Router>
    <JoyrideTour />
    <TooltipProvider delayDuration={0}>
      <App />
    </TooltipProvider>
  </Router>
);
