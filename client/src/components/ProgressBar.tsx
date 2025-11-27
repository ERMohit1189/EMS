import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressBarProps {
  isLoading: boolean;
}

export function ProgressBar({ isLoading }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }

    setProgress(10);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 90) return prev + Math.random() * 30;
        return prev;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1">
      <Progress value={progress} className="h-full rounded-none bg-gray-100" />
    </div>
  );
}
