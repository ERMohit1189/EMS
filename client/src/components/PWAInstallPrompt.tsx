import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pwaEnabled, setPwaEnabled] = useState(false);

  // Check if PWA is enabled in localStorage (can be enabled in production settings)
  const isDev = import.meta.env.DEV;
  const isPwaEnabledInProduction = typeof window !== 'undefined' ? localStorage.getItem('pwaEnabled') === 'true' : false;

  useEffect(() => {
    // Check if PWA is allowed (dev mode OR explicitly enabled)
    const allowPWA = isDev || isPwaEnabledInProduction;
    setPwaEnabled(allowPWA);

    // If PWA is not allowed, don't set up listeners
    if (!allowPWA) {
      return;
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isDev, isPwaEnabledInProduction]);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setShowPrompt(false);
      setInstallPrompt(null);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!pwaEnabled || isInstalled || !showPrompt || !installPrompt) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-50 border-l-4 border-l-emerald-600">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900">Install App</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600"
            data-testid="button-dismiss-pwa-prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Install EOMS (Enterprise Operations Management System) on your device for offline access and faster loading.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            data-testid="button-install-pwa"
          >
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1"
            data-testid="button-cancel-pwa"
          >
            Not Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
