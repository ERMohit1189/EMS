import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-gradient-to-r from-gray-50 to-gray-100 py-1.5 px-2 sm:px-4 text-center text-[10px] sm:text-xs text-muted-foreground">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center gap-0.5">
          {/* Line 1: Branding and Description */}
          <div className="text-gray-900 leading-tight">
            <span className="font-semibold">EOMS</span> - Streamline operations with our comprehensive management platform
          </div>

          {/* Line 2: Copyright and Creator */}
          <div className="text-gray-700 leading-tight">
            © 2025 <a href="https://qaiinnovation.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Quantum AI Innovation</a> • All rights reserved
          </div>
        </div>
      </div>
    </footer>
  );
}
