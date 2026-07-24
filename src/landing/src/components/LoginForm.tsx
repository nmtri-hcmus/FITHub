import React, { useState } from 'react';
import { useAuth, AuthProvider } from '../context/AuthContext';

const LoginFormInner: React.FC = () => {
  const { login, register } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple mock logic
    const mockUser = {
      id: 'usr_123',
      email,
      displayName: email.split('@')[0],
      role: 'TRAINEE' as const
    };

    if (isLoginView) {
      login(mockUser);
      // Smart Post-Auth Redirect Logic for Login
      const target = sessionStorage.getItem('fithub_redirect_target');
      if (target) {
        sessionStorage.removeItem('fithub_redirect_target');
        window.location.href = target;
      } else {
        window.location.href = '/dashboard';
      }
    } else {
      register(mockUser);
      // Smart Post-Auth Redirect Logic for Register
      window.location.href = '/survey';
    }
  };

  return (
    <div className="w-full max-w-md bg-surface-alt rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <h2 className="text-3xl font-bold text-white mb-2 relative z-10">
        {isLoginView ? 'Welcome Back.' : 'Join FITHub.'}
      </h2>
      <p className="text-text-muted text-sm mb-8 relative z-10">
        {isLoginView ? 'Enter your details to proceed.' : 'Create an account to start your journey.'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
        {!isLoginView && (
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold tracking-wider text-text-subtle uppercase">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required={!isLoginView}
                className="w-full bg-surface/50 border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                placeholder="John"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold tracking-wider text-text-subtle uppercase">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required={!isLoginView}
                className="w-full bg-surface/50 border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                placeholder="Doe"
              />
            </div>
          </div>
        )}

        {!isLoginView && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-text-subtle uppercase">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                required={!isLoginView}
                className="w-full bg-surface/50 border border-surface-edge rounded-xl pl-9 pr-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                placeholder="unique_username"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-text-subtle uppercase">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-surface/50 border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
            placeholder="trainee@example.com"
          />
        </div>

        {!isLoginView && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-text-subtle uppercase">Phone Number <span className="normal-case opacity-60">(Optional)</span></label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-surface/50 border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        )}
        
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold tracking-wider text-text-subtle uppercase">Password</label>
            {isLoginView && (
              <a href="#" className="text-xs text-text-muted hover:text-white font-light underline underline-offset-2 transition-colors">
                Forgot password?
              </a>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-surface/50 border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
            placeholder="••••••••"
          />
        </div>

        {!isLoginView && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-text-subtle uppercase">Re-enter Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required={!isLoginView}
              className="w-full bg-surface/50 border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-primary text-surface font-semibold py-3.5 rounded-xl hover:bg-primary-light transition-colors mt-2"
        >
          {isLoginView ? 'Sign In' : 'Sign Up'}
        </button>

        <div className="flex items-center my-2">
          <div className="flex-1 border-t border-surface-edge"></div>
          <span className="px-4 text-xs text-text-subtle uppercase tracking-wider">or</span>
          <div className="flex-1 border-t border-surface-edge"></div>
        </div>

        <button type="button" className="w-full bg-surface border border-surface-edge text-white font-medium py-3 rounded-xl hover:bg-surface-alt transition-colors flex items-center justify-center">
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <button type="button" className="w-full bg-surface border border-surface-edge text-white font-medium py-3 rounded-xl hover:bg-surface-alt transition-colors flex items-center justify-center">
          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.365 21.436c-1.379.882-2.738.882-4.015 0-4.07-2.585-7.391-7.85-7.391-12.923 0-3.328 1.954-5.228 4.385-5.228 1.258 0 2.508.625 3.123.625.617 0 2.138-.724 3.654-.724 1.45 0 3.053.483 4.148 1.89-3.411 1.91-2.915 6.643.344 8.012-1.045 2.766-2.519 5.86-4.248 8.348zM15.426 3.15c.677-1.127 1.055-2.457.854-3.15-1.288.13-2.825.894-3.613 1.93-.655.842-1.12 2.195-.892 3.18 1.438.163 2.84-.716 3.651-1.96z"/>
          </svg>
          Continue with Apple
        </button>
      </form>

      <div className="mt-8 text-center relative z-10">
        <button 
          onClick={() => setIsLoginView(!isLoginView)}
          className="text-sm text-text-muted hover:text-white transition-colors"
        >
          {isLoginView ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};

export const LoginForm: React.FC = () => (
  <AuthProvider>
    <LoginFormInner />
  </AuthProvider>
);
