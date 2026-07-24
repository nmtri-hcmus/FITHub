import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserRole = 'TRAINEE' | 'COACH' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasBiometrics: boolean;
  login: (user: User) => void;
  logout: () => void;
  register: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    // Initialize mock state from localStorage
    const storedUser = localStorage.getItem('fithub_mock_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse mock user from localStorage', e);
      }
    }
    // Check if the user has completed the biometric survey
    setHasBiometrics(!!localStorage.getItem('fithub_mock_biometrics'));
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('fithub_mock_user', JSON.stringify(userData));
  };

  const register = (userData: User) => {
    setUser(userData);
    localStorage.setItem('fithub_mock_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fithub_mock_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, hasBiometrics, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
