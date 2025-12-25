import { useEffect } from "react";

// Legacy lightweight Tour bridge: forward any 'start-tour' events to the new 'start-joyride' event
// and do not render any UI. This prevents duplicate/stacked tooltips when both tours exist.
export default function Tour() {
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const steps = e?.detail?.steps;
        window.dispatchEvent(new CustomEvent('start-joyride', { detail: { steps } }));
      } catch (err) {
        window.dispatchEvent(new CustomEvent('start-joyride'));
      }
    };
    window.addEventListener('start-tour', handler as EventListener);
    return () => window.removeEventListener('start-tour', handler as EventListener);
  }, []);

  return null;
}
