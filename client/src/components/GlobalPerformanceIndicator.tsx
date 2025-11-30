import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { performanceMonitor } from '@/lib/performanceMonitor';

export default function GlobalPerformanceIndicator() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [location] = useLocation();
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startMouseRef = useRef({ x: 0, y: 0 });

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('performanceIndicatorPosition');
    if (savedPosition) {
      try {
        setPosition(JSON.parse(savedPosition));
      } catch (e) {
        console.error('Error loading saved position:', e);
      }
    }
  }, []);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('performanceIndicatorPosition', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    // Mark navigation start when location changes
    performanceMonitor.markNavigationStart();
    
    // Capture metrics after render completes
    setTimeout(() => {
      try {
        const perf = performanceMonitor.getMetrics();
        const assessment = performanceMonitor.getAssessment(perf);
        setMetrics({ ...perf, assessment });
        setIsExpanded(false);
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

  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { x: position.x, y: position.y };
  };

  // Handle mouse move and mouse up for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startMouseRef.current.x;
      const deltaY = e.clientY - startMouseRef.current.y;
      
      setPosition({
        x: startPosRef.current.x + deltaX,
        y: startPosRef.current.y + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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
      ref={dragRef}
      className={`fixed z-50 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseEnter={() => !isDragging && setIsExpanded(true)}
      onMouseLeave={() => !isDragging && setIsExpanded(false)}
      onMouseDown={handleMouseDown}
      data-testid="performance-indicator"
    >
      {isExpanded ? (
        // Expanded View - Fade In
        <div 
          className="flex flex-col items-center gap-2 transition-opacity duration-300 opacity-100 pointer-events-none"
        >
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
        // Collapsed View - Just the circle (Fade Out)
        <div className={`w-12 h-12 rounded-full ${getTrafficLightColor()} shadow-lg border-4 border-white flex items-center justify-center hover:scale-110 transition-all duration-300 opacity-100`}>
          <span className="text-white text-xl font-bold">⚡</span>
        </div>
      )}
    </div>
  );
}
