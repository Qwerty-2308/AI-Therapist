import { useState, useEffect } from 'react'
import './App.css'
import { Auth } from './Auth'
import { Chat } from './Chat'

function getInitialUser(): { username: string } | null {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const parsed = JSON.parse(userStr) as { username: string }
      return parsed.username ? parsed : null
    }
  } catch {
    console.error('Failed to parse user from localStorage')
  }
  return null
}

function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light') return saved
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

/* ── Icons ──────────────────────────────────────────────── */
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

function App() {
  const [user, setUser] = useState<{ username: string } | null>(getInitialUser)
  const [view, setView] = useState<'home' | 'auth' | 'chat'>('home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    localStorage.removeItem('user')
    setUser(null)
    setView('home')
    setIsMobileMenuOpen(false)
  }

  const handleAuthSuccess = (userData: { username: string }) => {
    setUser(userData)
    setView('home')
  }

  const handleStartTalking = () => {
    if (user) setView('chat')
    else setView('auth')
    setIsMobileMenuOpen(false)
  }

  const handleBackToHome = () => setView('home')

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    setIsMobileMenuOpen(false)
  }

  if (view === 'auth') {
    return <Auth onAuthSuccess={handleAuthSuccess} onBackToHome={() => setView('home')} />
  }
  if (view === 'chat') {
    return <Chat onBackToHome={handleBackToHome} username={user?.username || ''} />
  }

  return (
    <>
      {/* ── NAVBAR ── */}
      <header className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <div className="logo" onClick={() => scrollToSection('home')}>
            Sere<span>Nova</span>
          </div>

          {/* Mobile toggle */}
          <div
            className={`mobile-menu-toggle ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            role="button"
          >
            <span /><span /><span />
          </div>

          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>

          <nav className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
            <a href="#home"     onClick={e => { e.preventDefault(); scrollToSection('home'); }}>Home</a>
            <a href="#about"    onClick={e => { e.preventDefault(); scrollToSection('about'); }}>About</a>
            <a href="#features" onClick={e => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#contact"  onClick={e => { e.preventDefault(); scrollToSection('contact'); }}>Contact</a>

            {user ? (
              <>
                <span className="nav-user-chip">
                  {user.username || 'User'}
                </span>
                <button className="nav-btn-ghost" onClick={() => setView('chat')}>
                  <ChatIcon /> Chat
                </button>
                <button className="nav-btn-ghost" onClick={handleLogout}>
                  Log Out
                </button>
              </>
            ) : (
              <button
                className="btn-primary"
                style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}
                onClick={() => { setView('auth'); setIsMobileMenuOpen(false); }}
              >
                Log In
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="hero" id="home">
        {/* Ambient blobs (replaces ::before/::after for flexibility) */}
        <div className="hero-blob-1" aria-hidden="true" />
        <div className="hero-blob-2" aria-hidden="true" />

        <div className="hero-inner">
          <p className="hero-eyebrow animate-fade-up" aria-label="Tagline">
            Mental wellness, reimagined
          </p>

          <h1 className="hero-heading animate-fade-up delay-1">
            Your AI Therapist.<br />Always Listening.
          </h1>

          <p className="hero-sub animate-fade-up delay-2">
            A safe, private space to share what's on your mind.<br />
            SereNova is here for you — any hour, any day.
          </p>

          <button
            className="btn-primary animate-fade-up delay-3"
            id="cta-start-talking"
            onClick={handleStartTalking}
          >
            <ChatIcon />
            Start Talking
          </button>
        </div>

        {/* Scroll hint */}
        <div className="hero-scroll-hint" aria-hidden="true">
          <span>Scroll</span>
          <ChevronDownIcon />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features" id="features">
        <div className="section-inner">
          <p className="section-label animate-fade-up">Why SereNova</p>
          <h2 className="section-title animate-fade-up delay-1">Built for your well-being</h2>
          <p className="section-sub animate-fade-up delay-2">
            Thoughtfully designed to feel calm, safe, and supportive every time you visit.
          </p>

          <div className="cards">
            <div className="card animate-fade-up delay-1" id="feature-private">
              <div className="card-icon">🔒</div>
              <h3 className="card-title">Private &amp; Secure</h3>
              <p className="card-text">
                Your conversations stay yours. End-to-end privacy with zero data selling — ever.
              </p>
            </div>

            <div className="card animate-fade-up delay-2" id="feature-availability">
              <div className="card-icon">🕐</div>
              <h3 className="card-title">24 / 7 Availability</h3>
              <p className="card-text">
                No appointments. No waiting rooms. SereNova is ready whenever you need to talk.
              </p>
            </div>

            <div className="card animate-fade-up delay-3" id="feature-empathy">
              <div className="card-icon">💙</div>
              <h3 className="card-title">Emotionally Aware AI</h3>
              <p className="card-text">
                Designed to listen with empathy, reflect your feelings, and guide you gently forward.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-it-works" id="about">
        <div className="section-inner">
          <p className="section-label">How It Works</p>
          <h2 className="section-title">Three steps to a clearer mind</h2>
          <p className="section-sub">Simple, gentle, and judgment-free.</p>

          <div className="steps">
            <div className="step" id="step-share">
              <div className="step-number">01</div>
              <h3 className="step-title">You Share</h3>
              <p className="step-text">Open up at your own pace. Speak about what's on your mind.</p>
            </div>

            <div className="step-divider" aria-hidden="true" />

            <div className="step" id="step-listen">
              <div className="step-number">02</div>
              <h3 className="step-title">AI Listens</h3>
              <p className="step-text">SereNova processes your words with empathy and without judgment.</p>
            </div>

            <div className="step-divider" aria-hidden="true" />

            <div className="step" id="step-reflect">
              <div className="step-number">03</div>
              <h3 className="step-title">You Reflect</h3>
              <p className="step-text">Receive thoughtful insights and gentle guidance to help you grow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer" id="contact">
        <div className="footer-inner">
          <p className="footer-logo">Sere<span>Nova</span></p>
          <p className="footer-copy">&copy; 2025 SereNova. All rights reserved.</p>
          <p className="footer-version">Version 0.01 · Experimental Build</p>
        </div>
      </footer>
    </>
  )
}

export default App
