import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, type UserProfile } from '../lib/api';

export type UserRole = 'USER' | 'COACH' | 'ADMIN';

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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function profileToUser(profile: UserProfile): User {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.name,
    role: profile.role as UserRole,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('fithub_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Validate token by fetching the user's profile from the backend
    api.users.me()
      .then((profile) => {
        setUser(profileToUser(profile));
        setHasBiometrics(!!profile.biometrics);
        // Cache the profile locally so dashboard can read it immediately
        if (profile.biometrics) {
          localStorage.setItem('fithub_biometrics', JSON.stringify(profile.biometrics));
        }
      })
      .catch(() => {
        // Token is expired or invalid — clear it
        localStorage.removeItem('fithub_token');
        localStorage.removeItem('fithub_user');
        localStorage.removeItem('fithub_biometrics');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.auth.login(email, password);
    localStorage.setItem('fithub_token', response.accessToken);
    const newUser: User = {
      id: response.user.id,
      email: response.user.email,
      displayName: response.user.name,
      role: response.user.role as UserRole,
    };
    localStorage.setItem('fithub_user', JSON.stringify(newUser));
    setUser(newUser);

    // Check if this user already has biometrics
    try {
      const profile = await api.users.me();
      setHasBiometrics(!!profile.biometrics);
      if (profile.biometrics) {
        localStorage.setItem('fithub_biometrics', JSON.stringify(profile.biometrics));
      }
    } catch {
      // ignore — not critical
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.auth.register(email, password, name);
    localStorage.setItem('fithub_token', response.accessToken);
    const newUser: User = {
      id: response.user.id,
      email: response.user.email,
      displayName: response.user.name,
      role: response.user.role as UserRole,
    };
    localStorage.setItem('fithub_user', JSON.stringify(newUser));
    setUser(newUser);
    setHasBiometrics(false);
  };

  const logout = () => {
    setUser(null);
    setHasBiometrics(false);
    localStorage.removeItem('fithub_token');
    localStorage.removeItem('fithub_user');
    localStorage.removeItem('fithub_biometrics');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, hasBiometrics, login, register, logout }}>
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
