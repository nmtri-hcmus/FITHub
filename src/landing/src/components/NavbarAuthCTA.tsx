import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '../context/AuthContext';

const NavbarAuthCTAInner: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by rendering a hidden placeholder
  if (!mounted) {
    return <a href="/login" className="btn-primary !px-7 !py-3 !rounded-full !text-sm !shadow-none ml-1 opacity-0">Get Started</a>;
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center space-x-2 ml-1">
        <a href="/dashboard" className="text-sm font-medium text-text-muted hover:text-white transition-colors px-3 py-2">
          Dashboard
        </a>
        <button 
          onClick={() => {
            logout();
            window.location.href = '/';
          }}
          className="btn-primary !px-6 !py-2.5 !rounded-full !text-sm !shadow-none !bg-surface-alt !text-white hover:!bg-surface-edge"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <a href="/login" className="btn-primary !px-7 !py-3 !rounded-full !text-sm !shadow-none ml-1">
      Get Started
    </a>
  );
};

export const NavbarAuthCTA: React.FC = () => (
  <AuthProvider>
    <NavbarAuthCTAInner />
  </AuthProvider>
);
