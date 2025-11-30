import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { performanceMonitor } from '@/lib/performanceMonitor';

export default function GlobalPerformanceIndicator() {
  const [metrics, setMetrics] = useState<any>(null);
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
    
    // Capture metrics after page fully displays (including loading time)
    setTimeout(() => {
      try {
        const perf = performanceMonitor.getMetrics();
        const assessment = performanceMonitor.getAssessment(perf);
        setMetrics({ ...perf, assessment });
      } catch (e) {
        console.error('Performance indicator error:', e);
      }
    }, 300); // Wait 300ms to capture full page display time including all loading
  }, [location]);

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

  if (!metrics || metrics.assessment.score === 'Fair') return null;

  const getTrafficLightColor = () => {
    const score = metrics.assessment.score;
    if (score === 'Excellent') return 'bg-green-500';
    if (score === 'Good') return 'bg-blue-500';
    if (score === 'Fair') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div
      ref={dragRef}
      className={`fixed z-50 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      data-testid="performance-indicator"
      title={`Page fully displayed in ${metrics.pageLoadTime}ms`}
    >
      {/* Traffic Signal Circle with Full Display Load Time */}
      <div className={`w-10 h-10 rounded-full ${getTrafficLightColor()} shadow-lg border-2 border-white flex items-center justify-center hover:scale-110 transition-all duration-300`}>
        <span className="text-white text-xs font-bold">{metrics.pageLoadTime}ms</span>
      </div>
    </div>
  );
}
