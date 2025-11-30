import { Card, CardContent } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { performanceMonitor, PerformanceMetrics } from '@/lib/performanceMonitor';

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [score, setScore] = useState<any>(null);

  useEffect(() => {
    // Defer performance capture using requestIdleCallback for better performance
    const captureMetrics = () => {
      try {
        const perf = performanceMonitor.getMetrics();
        setMetrics(perf);
        const assessment = performanceMonitor.getAssessment(perf);
        setScore(assessment);
      } catch (error) {
        console.error('Error capturing performance metrics:', error);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => captureMetrics(), { timeout: 2000 });
    } else {
      setTimeout(captureMetrics, 1000);
    }
  }, []);

  if (!metrics || !score) return null;

  return (
    <Card className="border-l-4 border-l-blue-600 shadow-md bg-gradient-to-r from-blue-50 to-cyan-50" data-testid="card-performance-metrics">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center bg-opacity-10 ${score.color}`}>
                <Zap className={`h-6 w-6 ${score.color}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Page Load Performance</h3>
                <p className={`text-sm font-semibold ${score.color}`}>{score.score}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">{score.message}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-slate-600">Total Load Time</p>
                <p className="text-lg font-bold text-slate-900" data-testid="metric-page-load-time">{metrics.pageLoadTime}ms</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-slate-600">DOM Interactive</p>
                <p className="text-lg font-bold text-slate-900">{metrics.domInteractive}ms</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-slate-600">Resources Loaded</p>
                <p className="text-lg font-bold text-slate-900">{metrics.resourceCount}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-slate-600">Total Size</p>
                <p className="text-lg font-bold text-slate-900">{metrics.totalResourceSize}KB</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
