import { useState } from 'react';
import { X, Download, Chrome, Smartphone, Apple } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function PWAInstallGuide() {
  const [showGuide, setShowGuide] = useState(true);

  if (!showGuide) return null;

  return (
    <Card className="fixed bottom-4 left-4 w-96 shadow-2xl z-50 border-l-4 border-l-blue-600 max-h-96 overflow-y-auto">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Install EMS Portal</CardTitle>
          </div>
          <button
            onClick={() => setShowGuide(false)}
            className="text-slate-400 hover:text-slate-600"
            data-testid="button-close-pwa-guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Chrome/Edge Desktop */}
          <div className="border rounded-lg p-3 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <Chrome className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-sm">Chrome/Edge (Desktop)</span>
            </div>
            <ol className="text-xs text-slate-600 space-y-1 ml-6 list-decimal">
              <li>Refresh this page (Ctrl+R or Cmd+R)</li>
              <li>Look for <Badge variant="outline" className="text-xs">Install</Badge> in address bar</li>
              <li>Click and follow prompts</li>
            </ol>
          </div>

          {/* Android */}
          <div className="border rounded-lg p-3 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-sm">Android Phone</span>
            </div>
            <ol className="text-xs text-slate-600 space-y-1 ml-6 list-decimal">
              <li>Tap menu (⋮) in top-right</li>
              <li>Select <Badge variant="outline" className="text-xs">Install app</Badge></li>
              <li>Confirm installation</li>
            </ol>
          </div>

          {/* iOS */}
          <div className="border rounded-lg p-3 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <Apple className="h-4 w-4 text-slate-600" />
              <span className="font-semibold text-sm">iPhone/iPad</span>
            </div>
            <ol className="text-xs text-slate-600 space-y-1 ml-6 list-decimal">
              <li>Tap Share button</li>
              <li>Scroll and tap <Badge variant="outline" className="text-xs">Add to Home Screen</Badge></li>
              <li>Tap Add</li>
            </ol>
          </div>

          {/* Current URL */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-slate-600 font-semibold mb-1">App URL:</p>
            <p className="text-xs break-all font-mono bg-white p-2 rounded border border-blue-100">
              {window.location.href}
            </p>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('URL copied to clipboard!');
              }}
              size="sm"
              variant="outline"
              className="w-full mt-2 text-xs"
              data-testid="button-copy-url"
            >
              Copy URL
            </Button>
          </div>
        </div>

        <p className="text-xs text-slate-500 italic">
          💡 Tip: After installation, you can use the app offline with cached data!
        </p>
      </CardContent>
    </Card>
  );
}
