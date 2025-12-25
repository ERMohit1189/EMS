import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumb } from './Navigation';
import { Footer } from './Footer';
import { useState } from 'react';
// FabFaq (Quick FAQs) disabled until a stable implementation is available
// import FabFaq from '@/components/FabFaq';

interface LayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  setIsLoggedIn?: (value: boolean) => void;
}

export function Layout({ children, isLoggedIn, setIsLoggedIn }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - hidden on mobile, visible on md+ */}
      <div className="hidden md:block">
        <Sidebar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-background">
            <Sidebar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
          </div>
        </div>
      )}
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
        <Breadcrumb />
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          {children}
        </main>
        {/* <FabFaq /> -- disabled until Quick FAQs are reworked */}
        {/* Site footer */}
        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}
