import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  getIdToken,
} from 'firebase/auth';
import type { AuthError, User } from 'firebase/auth';
import { auth, googleProvider, microsoftProvider } from './firebase';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

interface AuthProps {
  onAuthSuccess: (user: { username: string }) => void;
  onBackToHome: () => void;
}

/* ── Icons ──────────────────────────────────────────────── */
const BackArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, onBackToHome }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [error, setError]             = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword]     = useState('');

  // Signup
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail]       = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const syncWithBackend = async (firebaseUser: User) => {
    const idToken = await getIdToken(firebaseUser);
    try {
      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data));
        onAuthSuccess(data);
      } else {
        setError(data.error || 'Backend sync failed');
      }
    } catch {
      console.warn('Backend not responding, using frontend session only.');
      const userData = {
        username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      };
      localStorage.setItem('user', JSON.stringify(userData));
      onAuthSuccess(userData);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, loginIdentifier, loginPassword);
      await syncWithBackend(cred.user);
    } catch (err) {
      setError((err as AuthError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      await updateProfile(cred.user, { displayName: signupUsername });
      await syncWithBackend(cred.user);
    } catch (err) {
      setError((err as AuthError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuth = async (provider: typeof googleProvider) => {
    setError('');
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await syncWithBackend(result.user);
    } catch (err) {
      setError((err as AuthError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchView = (login: boolean) => {
    setIsLoginView(login);
    setError('');
  };

  return (
    <div className="auth-body">
      <div className="auth-wrapper">
        <div className="auth-card">
          {/* Back button */}
          <button className="auth-back-btn" onClick={onBackToHome}>
            <BackArrowIcon /> Back to Home
          </button>

          {/* Login View */}
          {isLoginView ? (
            <div id="login-view" className="auth-view active-view">
              <div className="auth-header">
                <h2>Welcome back</h2>
                <p>A safe space to share what's on your mind.</p>
              </div>

              <form id="login-form" onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="login-identifier">Email Address</label>
                  <input
                    type="email"
                    id="login-identifier"
                    placeholder="Enter your email"
                    required
                    value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)}
                    aria-required="true"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input
                    type="password"
                    id="login-password"
                    placeholder="Enter your password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    aria-required="true"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary form-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in…' : 'Log In'}
                </button>
              </form>

              <div className="auth-divider"><span>or continue with</span></div>

              <div className="oauth-buttons">
                <button
                  type="button"
                  className="btn-oauth"
                  onClick={() => handleOAuth(googleProvider)}
                  disabled={isSubmitting}
                >
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    className="oauth-icon"
                  />
                  Google
                </button>
                <button
                  type="button"
                  className="btn-oauth"
                  onClick={() => handleOAuth(microsoftProvider)}
                  disabled={isSubmitting}
                >
                  <img
                    src="https://www.svgrepo.com/show/475666/microsoft-color.svg"
                    alt="Microsoft"
                    className="oauth-icon"
                  />
                  Microsoft
                </button>
              </div>

              <p className="auth-switch">
                Don't have an account?{' '}
                <a href="#" onClick={e => { e.preventDefault(); switchView(false); }}>
                  Sign up
                </a>
              </p>
            </div>
          ) : (
            /* Signup View */
            <div id="signup-view" className="auth-view active-view">
              <div className="auth-header">
                <h2>Create an account</h2>
                <p>Start your journey to a clearer mind.</p>
              </div>

              <form id="signup-form" onSubmit={handleSignup}>
                <div className="form-group">
                  <label htmlFor="signup-username">Username</label>
                  <input
                    type="text"
                    id="signup-username"
                    placeholder="Choose a username"
                    required
                    value={signupUsername}
                    onChange={e => setSignupUsername(e.target.value)}
                    aria-required="true"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-email">Email Address</label>
                  <input
                    type="email"
                    id="signup-email"
                    placeholder="Enter your email"
                    required
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    aria-required="true"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-password">Password</label>
                  <input
                    type="password"
                    id="signup-password"
                    placeholder="Create a password (min. 6 chars)"
                    required
                    minLength={6}
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    aria-required="true"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary form-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating account…' : 'Sign Up'}
                </button>
              </form>

              <div className="auth-divider"><span>or continue with</span></div>

              <div className="oauth-buttons">
                <button
                  type="button"
                  className="btn-oauth"
                  onClick={() => handleOAuth(googleProvider)}
                  disabled={isSubmitting}
                >
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    className="oauth-icon"
                  />
                  Google
                </button>
                <button
                  type="button"
                  className="btn-oauth"
                  onClick={() => handleOAuth(microsoftProvider)}
                  disabled={isSubmitting}
                >
                  <img
                    src="https://www.svgrepo.com/show/475666/microsoft-color.svg"
                    alt="Microsoft"
                    className="oauth-icon"
                  />
                  Microsoft
                </button>
              </div>

              <p className="auth-switch">
                Already have an account?{' '}
                <a href="#" onClick={e => { e.preventDefault(); switchView(true); }}>
                  Log in
                </a>
              </p>
            </div>
          )}

          {/* Error message */}
          {error && <div className="auth-error" role="alert">{error}</div>}
        </div>
      </div>
    </div>
  );
};
