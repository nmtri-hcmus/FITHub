import React from 'react';
import { useAuth, AuthProvider } from '../context/AuthContext';

interface AuthGuardedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  targetPath: string;
  className?: string;
  children: React.ReactNode;
}

const AuthGuardedButtonInner: React.FC<AuthGuardedButtonProps> = ({ 
  targetPath, 
  className = '', 
  children,
  ...props 
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (isLoading) return;

    if (!isAuthenticated) {
      sessionStorage.setItem('fithub_redirect_target', targetPath);
      window.location.href = '/login';
    } else {
      window.location.href = targetPath;
    }
  };

  return (
    <button 
      onClick={handleClick}
      className={className}
      disabled={isLoading}
      {...props}
    >
      {children}
    </button>
  );
};

export const AuthGuardedButton: React.FC<AuthGuardedButtonProps> = (props) => (
  <AuthProvider>
    <AuthGuardedButtonInner {...props} />
  </AuthProvider>
);
