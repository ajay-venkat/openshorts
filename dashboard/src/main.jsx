import { Component, StrictMode, useState, useEffect, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Landing from './Landing.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { capture as captureAttribution } from './lib/attribution'
import PricingPage from './components/PricingPage'
import AccountPage from './components/AccountPage'
import LoginModal from './components/LoginModal'
import { readPendingPlan } from './lib/pendingPlan'
import { track } from './lib/analytics'
import { applyConsent } from './lib/consent'
import CookieBanner from './components/CookieBanner'

import App from './App.jsx'
const Legal = lazy(() => import('./Legal.jsx'))
const OAuthConsent = lazy(() => import('./components/OAuthConsent'))

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-400 max-w-md mb-4">{this.state.error?.message || String(this.state.error)}</p>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded text-sm font-semibold transition-colors"
          >
            Clear Cache &amp; Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageShell({ title, children }) {
  return (
    <div className="min-h-screen bg-paper text-ink2">
      <header className="h-14 sm:h-16 border-b border-rule bg-paper flex items-center justify-between gap-3 px-4 sm:px-6 sticky top-0 z-20">
        <a href="#app" className="font-display lowercase text-lg text-ink truncate">OpenShorts</a>
        <a href="#app" className="text-sm lowercase text-muted hover:text-ink transition-colors shrink-0">← <span className="hidden sm:inline">Back to app</span><span className="sm:hidden">back</span></a>
      </header>
      <main className="p-4 sm:p-6 md:p-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {title && <h1 className="font-display lowercase text-2xl sm:text-3xl text-ink text-center mb-6 sm:mb-10">{title}</h1>}
        {children}
      </main>
    </div>
  );
}

function PricingView() {
  const { isSignedIn, loading } = useAuth();
  // A plan picked on the landing while signed out lands here: ask for the
  // sign-in straight away instead of a second click on the same plan.
  const [showLogin, setShowLogin] = useState(false);
  // Back from Stripe without paying (cancel_url of a checkout opened here):
  // straight to the plans, not the top of the page, and the query dropped so
  // a reload does not count it twice.
  useEffect(() => {
    if (!window.location.hash.includes('checkout=cancel')) { window.scrollTo(0, 0); return; }
    track('CheckoutCanceled', { props: { back_to: 'pricing' } });
    try { window.history.replaceState(null, '', '#/pricing'); } catch (_) { /* ignore */ }
    requestAnimationFrame(() => document.getElementById('pricing-plans')?.scrollIntoView());
  }, []);
  useEffect(() => {
    if (!loading && !isSignedIn && readPendingPlan()) setShowLogin(true);
  }, [loading, isSignedIn]);
  return (
    <PageShell>
      <PricingPage onRequireLogin={() => setShowLogin(true)} />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </PageShell>
  );
}

function AccountView() {
  const { isSignedIn, loading } = useAuth();
  useEffect(() => {
    if (!loading && !isSignedIn) window.location.hash = '#/pricing';
  }, [loading, isSignedIn]);
  return <PageShell><AccountPage /></PageShell>;
}

// Direct sign-in page (#/login), the URL handed to app-directory reviewers:
// the sign-in form opens straight away and a signed-in visitor goes to the app.
function LoginView() {
  const { isSignedIn, loading } = useAuth();
  const toApp = () => { window.location.hash = '#app'; };
  useEffect(() => {
    if (!loading && isSignedIn) toApp();
  }, [loading, isSignedIn]);
  return (
    <PageShell>
      {!loading && !isSignedIn && <LoginModal onClose={toApp} />}
    </PageShell>
  );
}

// Landing spot after an account is erased. Its own view because the session is
// gone: sending the user to #/account would bounce them to pricing with no
// explanation.
function DeletedView() {
  return (
    <div className="min-h-screen bg-paper text-ink2 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="font-display lowercase text-2xl sm:text-3xl text-ink">Your account is deleted</h1>
        <p className="text-sm">
          Your projects, clips and transcripts are gone, any subscription is
          cancelled, and your API keys no longer work. We've emailed you a
          confirmation with the details.
        </p>
        <p className="text-sm text-muted">
          You're welcome back any time — signing up again with the same address
          starts a brand-new, empty account.
        </p>
        <a href="#landing" className="btn-ghost px-4 py-2 inline-flex">Back to openshorts.app</a>
      </div>
    </div>
  );
}

function Root() {
  const resolveView = () => {
    const hash = window.location.hash || '';
    if (hash.startsWith('#/auth/')) return 'auth';       // AuthContext consumes then redirects
    if (hash.startsWith('#/oauth/authorize')) return 'oauth';
    if (hash.startsWith('#/account')) return 'account';
    if (hash.startsWith('#/deleted')) return 'deleted';
    if (hash.startsWith('#/pricing')) return 'pricing';
    if (hash.startsWith('#/login')) return 'login';
    if (hash === '#legal') return 'legal';
    if (hash === '#landing') return 'landing';
    if (hash === '#app' || hash.startsWith('#app?') || hash === '#/app') return 'app';
    // For local / self-hosted environments, default directly to the app workbench
    if (typeof window !== 'undefined' && (!window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname.includes('openshorts.app'))) {
      return 'app';
    }
    return 'landing';
  };

  const [view, setView] = useState(resolveView);

  useEffect(() => {
    const handleHashChange = () => setView(resolveView());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLaunchApp = () => {
    window.location.hash = '#app';
    setView('app');
  };

  if (view === 'legal') return <Legal />;
  if (view === 'pricing') return <PricingView />;
  if (view === 'login') return <LoginView />;
  if (view === 'account') return <AccountView />;
  if (view === 'oauth') return <OAuthConsent />;
  if (view === 'deleted') return <DeletedView />;
  if (view === 'auth') {
    return <div className="min-h-screen flex items-center justify-center bg-background text-zinc-400">Signing you in…</div>;
  }
  if (view === 'app') return <App />;
  return <Landing onLaunchApp={handleLaunchApp} />;
}

// Before React mounts: AuthContext rewrites the URL on auth redirects, which
// would destroy the referrer and any UTM params we still need to read.
captureAttribution();

// Start whatever the visitor previously agreed to. Nothing at all on a first
// visit: index.html only publishes the analytics initialiser, it never runs it.
applyConsent();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={
          <div className="min-h-screen bg-[#0b0d12] flex flex-col items-center justify-center gap-3 text-white">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm font-medium tracking-wide text-zinc-300">Loading OpenShorts...</div>
          </div>
        }>
          <Root />
        </Suspense>
        <CookieBanner />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
