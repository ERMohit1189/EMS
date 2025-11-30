import { useEffect, useState } from 'react';
import { performanceMonitor } from '@/lib/performanceMonitor';

export default function GlobalPerformanceIndicator() {
  const [metrics, setMetrics] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      try {
        const perf = performanceMonitor.getMetrics();
        const assessment = performanceMonitor.getAssessment(perf);
        setMetrics({ ...perf, assessment });
        setVisible(true);
        // Auto-hide after 8 seconds
        const timer = setTimeout(() => setVisible(false), 8000);
        return () => clearTimeout(timer);
      } catch (e) {
        console.error('Performance indicator error:', e);
      }
    }, 100);
  }, []);

  if (!metrics || !visible) return null;

  const colorMap: any = {
    'Excellent': 'bg-green-100 border-green-300 text-green-800',
    'Good': 'bg-blue-100 border-blue-300 text-blue-800',
    'Fair': 'bg-yellow-100 border-yellow-300 text-yellow-800',
    'Poor': 'bg-red-100 border-red-300 text-red-800',
  };

  const color = colorMap[metrics.assessment.score] || colorMap['Fair'];

  return (
    <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-lg border ${color} text-sm font-medium shadow-lg max-w-xs`}>
      <div className="flex items-center gap-2">
        <span className="font-bold">⚡ Page Load:</span>
        <span>{metrics.pageLoadTime}ms</span>
        <span className="text-xs opacity-75">({metrics.assessment.score})</span>
        <button
          onClick={() => setVisible(false)}
          className="ml-2 text-xs opacity-50 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
