import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
}

export function PageLoader({ isLoading, message = 'Loading...', fullScreen = false }: PageLoaderProps) {
  if (!isLoading) return null;

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[998] flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-64">
      {content}
    </div>
  );
}
