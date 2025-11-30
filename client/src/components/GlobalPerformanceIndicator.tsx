import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { performanceMonitor } from '@/lib/performanceMonitor';

export default function GlobalPerformanceIndicator() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    // Mark navigation start when location changes
    performanceMonitor.markNavigationStart();
    
    // Capture metrics after render completes
    setTimeout(() => {
      try {
        const perf = performanceMonitor.getMetrics();
        const assessment = performanceMonitor.getAssessment(perf);
        setMetrics({ ...perf, assessment });
        setIsExpanded(false); // Auto-collapse on new page
      } catch (e) {
        console.error('Performance indicator error:', e);
      }
    }, 50);
  }, [location]);

  // Auto-collapse after 5 seconds if expanded
  useEffect(() => {
    if (!isExpanded) return;
    
    const timer = setTimeout(() => {
      setIsExpanded(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [isExpanded]);

  if (!metrics) return null;

  const getTrafficLightColor = () => {
    const score = metrics.assessment.score;
    if (score === 'Excellent') return 'bg-green-500';
    if (score === 'Good') return 'bg-blue-500';
    if (score === 'Fair') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    const score = metrics.assessment.score;
    if (score === 'Excellent') return 'text-green-700';
    if (score === 'Good') return 'text-blue-700';
    if (score === 'Fair') return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <div
      className="fixed top-4 right-4 z-50"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      data-testid="performance-indicator"
    >
      {isExpanded ? (
        // Expanded View
        <div className="flex flex-col items-center gap-2 animate-in slide-in-from-right">
          {/* Traffic Signal Circle */}
          <div className={`w-12 h-12 rounded-full ${getTrafficLightColor()} shadow-lg border-4 border-white flex items-center justify-center`}>
            <span className="text-white text-xl font-bold">⚡</span>
          </div>
          
          {/* Load Time and Score */}
          <div className={`bg-white rounded-lg shadow-lg p-3 text-center border-l-4 ${getTrafficLightColor()} whitespace-nowrap`}>
            <p className={`text-sm font-bold ${getTextColor()}`}>{metrics.pageLoadTime}ms</p>
            <p className={`text-xs font-semibold ${getTextColor()}`}>{metrics.assessment.score}</p>
          </div>
        </div>
      ) : (
        // Collapsed View - Just the circle
        <div className={`w-12 h-12 rounded-full ${getTrafficLightColor()} shadow-lg border-4 border-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}>
          <span className="text-white text-xl font-bold">⚡</span>
        </div>
      )}
    </div>
  );
}
