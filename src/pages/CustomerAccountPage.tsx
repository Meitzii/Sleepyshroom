import React, { useState, useEffect } from 'react';
import { 
  User, 
  Download, 
  ShoppingBag, 
  Lock, 
  Mail, 
  LogOut, 
  KeyRound, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  ShieldCheck,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import type { Order } from '../types/index.ts';
import { downloadWallpaperFile } from '../utils/downloadHelper.ts';

export const CustomerAccountPage: React.FC = () => {
  const {
    user,
    signInWithEmail,
    signUpWithEmail,
    resendVerificationEmail,
    sendPasswordResetEmail,
    signInWithGoogle,
    logout,
    oauthError,
    clearOAuthError,
    navigateTo,
    products,
  } = useShop();

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [previewTabUrl, setPreviewTabUrl] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [verificationFromSignup, setVerificationFromSignup] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // User orders state
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatarUrl]);

  useEffect(() => {
    if (user?.email) {
      setLoadingOrders(true);
      fetch(`/api/orders?email=${encodeURIComponent(user.email)}`)
        .then(res =>
          res.ok && res.headers.get('content-type')?.includes('application/json')
            ? res.json()
            : []
        )
        .then(data => {
          if (Array.isArray(data)) {
            setUserOrders(data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingOrders(false));
    } else {
      setUserOrders([]);
    }
  }, [user]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    clearOAuthError();
    setPreviewTabUrl(null);
    setResendMessage(null);
    setVerificationFromSignup(false);

    if (!emailInput.trim()) {
      setAuthError('Please enter your email.');
      return;
    }

    if (!passwordInput) {
      setAuthError('Please enter your password.');
      return;
    }

    setAuthLoading(true);

    try {
      if (isLoginTab) {
        setPendingVerificationEmail(null);
        const result = await signInWithEmail(emailInput.trim(), passwordInput);
        if (!result.success) {
          setAuthError(result.error || 'Sign in failed. Please check your email and password.');
          if (result.needsEmailVerification && result.pendingEmail) {
            setPendingVerificationEmail(result.pendingEmail);
          }
        } else {
          setPasswordInput('');
        }
      } else {
        if (!nameInput.trim()) {
          setAuthError('Please enter your name.');
          setAuthLoading(false);
          return;
        }
        if (passwordInput.length < 6) {
          setAuthError('Password must be at least 6 characters long.');
          setAuthLoading(false);
          return;
        }

        const result = await signUpWithEmail(nameInput.trim(), emailInput.trim(), passwordInput);
        if (!result.success) {
          setAuthError(result.error || 'Registration failed.');
        } else if (result.needsEmailVerification && result.pendingEmail) {
          setPendingVerificationEmail(result.pendingEmail);
          setVerificationFromSignup(true);
          setPasswordInput('');
        } else {
          setPasswordInput('');
        }
      }
    } catch {
      setAuthError('An error occurred during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = pendingVerificationEmail || emailInput.trim();
    if (!targetEmail) return;
    setResendLoading(true);
    setResendMessage(null);
    try {
      const result = await resendVerificationEmail(targetEmail);
      if (result.success) {
        setResendMessage(`Confirmation email resent to ${targetEmail}.`);
      } else {
        setAuthError(result.error || 'Could not resend verification email.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotError(null);
    setForgotLoading(true);
    try {
      const result = await sendPasswordResetEmail(emailInput);
      if (result.success) {
        setForgotSent(true);
      } else {
        setForgotError(result.error || 'Unable to send reset email.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    clearOAuthError();
    setPreviewTabUrl(null);
    setGoogleLoading(true);

    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setAuthError(result.error || 'Unable to sign in with Google.');
        setPreviewTabUrl(result.externalTabUrl || null);
        setGoogleLoading(false);
      }
    } catch {
      setAuthError('An error occurred while connecting to Google.');
      setGoogleLoading(false);
    }
  };

  const handleDownloadFile = async (_token: string, productId: string, title: string) => {
    const prod = products.find(p => p.id === productId);
    const imageSrc = prod?.images[0] || `/wallpapers/${title.toLowerCase().replace(/\s+/g, '_')}.jpg`;
    const filename = `${title.toLowerCase().replace(/\s+/g, '_')}.jpg`;
    await downloadWallpaperFile(imageSrc, filename);
  };

  // If user is NOT logged in: Show Auth Form
  if (!user) {
    return (
      <div className="py-12 sm:py-16 bg-[#FFFCF7]">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          
          <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs">
            
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#A64B3C]/10 text-[#A64B3C] flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6" />
              </div>
              <h1 className="font-heading font-bold text-2xl text-[#292929]">
                {isLoginTab ? 'Welcome Back!' : 'Create an Account'}
              </h1>
              <p className="text-xs text-[#777777] font-medium mt-1">
                Access your permanent digital downloads anytime.
              </p>
            </div>

            {/* Tab switch */}
            <div className="flex bg-[#FFFCF7] p-1 rounded-2xl mb-6 border border-[#EADCC8]">
              <button
                type="button"
                onClick={() => {
                  setIsLoginTab(true);
                  setAuthError(null);
                  clearOAuthError();
                  setPreviewTabUrl(null);
                  setPendingVerificationEmail(null);
                  setVerificationFromSignup(false);
                  setResendMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  isLoginTab ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs' : 'text-[#292929]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLoginTab(false);
                  setAuthError(null);
                  clearOAuthError();
                  setPreviewTabUrl(null);
                  setPendingVerificationEmail(null);
                  setVerificationFromSignup(false);
                  setResendMessage(null);
                  setForgotOpen(false);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  !isLoginTab ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs' : 'text-[#292929]'
                }`}
              >
                New Customer
              </button>
            </div>

            {/* Email Confirmation Prompt (when Sign Up requires email verification) */}
            {verificationFromSignup && pendingVerificationEmail && (
              <div className="mb-5 p-4 bg-[#FFFCF7] border border-[#EADCC8] rounded-2xl space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-[#A64B3C] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-[#292929]">
                      Verify your email to finish creating your account
                    </p>
                    <p className="text-[#777777] font-medium leading-relaxed">
                      We sent a confirmation link to{' '}
                      <strong className="text-[#292929]">{pendingVerificationEmail}</strong>. Please open your inbox and click the verification link before signing in.
                    </p>
                  </div>
                </div>
                {resendMessage && (
                  <p className="text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{resendMessage}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginTab(true);
                      setVerificationFromSignup(false);
                      setAuthError(null);
                    }}
                    className="px-3.5 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    Go to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleResendVerification(); }}
                    disabled={resendLoading}
                    className="px-3.5 py-2 bg-[#FCF3E2] hover:bg-[#EADCC8]/40 text-[#292929] border border-[#EADCC8] rounded-xl font-bold cursor-pointer transition-colors disabled:opacity-60"
                  >
                    {resendLoading ? 'Sending...' : 'Resend Confirmation Email'}
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLoginTab && (
                <div>
                  <label className="block text-xs font-bold text-[#292929] mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Clara"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#292929] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="clara@example.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#292929]">
                    Password
                  </label>
                  {isLoginTab && (
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-[11px] font-bold text-[#A64B3C] hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  minLength={isLoginTab ? undefined : 6}
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                />
              </div>

              {(authError || oauthError) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-700 font-medium">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{authError || oauthError}</span>
                  </div>
                  {pendingVerificationEmail && !verificationFromSignup && (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => { void handleResendVerification(); }}
                        disabled={resendLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFCF7] hover:bg-[#FCF3E2] text-[#A64B3C] border border-[#EADCC8] rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <span>{resendLoading ? 'Sending...' : 'Resend Verification Email'}</span>
                      </button>
                      {resendMessage && (
                        <p className="text-emerald-800 font-semibold">{resendMessage}</p>
                      )}
                    </div>
                  )}
                  {previewTabUrl && (
                    <a
                      href={previewTabUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFCF7] hover:bg-[#FCF3E2] text-[#A64B3C] border border-[#EADCC8] rounded-lg text-[11px] font-bold transition-colors"
                    >
                      <span>Open Sleepyshroom in New Tab</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || googleLoading}
                className="w-full py-3 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {authLoading
                    ? isLoginTab
                      ? 'Signing in...'
                      : 'Creating account...'
                    : isLoginTab
                    ? 'Sign In to Account'
                    : 'Create My Account'}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5 flex items-center">
              <div className="flex-grow border-t border-[#EADCC8]" />
              <span className="mx-3 shrink-0 text-[11px] font-bold uppercase tracking-wider text-[#777777]">
                or
              </span>
              <div className="flex-grow border-t border-[#EADCC8]" />
            </div>

            {/* Continue with Google (Shown on both Login & Sign Up sections) */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={authLoading || googleLoading}
              aria-label={isLoginTab ? 'Continue with Google to sign in' : 'Continue with Google to sign up'}
              className="w-full py-3 px-4 bg-[#FFFCF7] hover:bg-[#FCF3E2]/50 border border-[#EADCC8] hover:border-[#A64B3C]/60 text-[#292929] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2.5"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#A64B3C]" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Forgot password popup */}
            {forgotOpen && (
              <div className="mt-4 p-4 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] text-xs space-y-2">
                <div className="flex justify-between items-center font-bold text-[#292929]">
                  <span>Reset Password</span>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotOpen(false);
                      setForgotSent(false);
                      setForgotError(null);
                    }}
                    className="text-[#292929] font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                {forgotSent ? (
                  <p className="text-emerald-800 font-semibold">
                    Password reset instructions have been sent to {emailInput.trim()}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[#777777] font-medium">
                      Enter your email above and click send to receive a password reset link.
                    </p>
                    {forgotError && (
                      <p className="text-red-700 font-semibold">{forgotError}</p>
                    )}
                    <button
                      type="button"
                      disabled={forgotLoading}
                      onClick={() => { void handleForgotPassword(); }}
                      className="px-3 py-1.5 bg-[#A64B3C] text-[#FFFCF7] rounded-lg text-xs font-bold cursor-pointer disabled:opacity-60"
                    >
                      {forgotLoading ? 'Sending...' : 'Send Reset Email'}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    );
  }

  // If user IS logged in: Show Account Dashboard
  return (
    <div className="py-10 sm:py-14 bg-[#FFFCF7]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Account Header */}
        <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.avatarUrl && !avatarFailed ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="w-14 h-14 rounded-2xl object-cover border border-[#EADCC8] shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#A64B3C] text-[#FFFCF7] flex items-center justify-center font-heading font-bold text-xl shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-heading font-bold text-2xl text-[#292929]">
                Hello, {user.name}!
              </h1>
              <p className="text-xs text-[#777777] font-medium mt-0.5">
                {user.email} · Customer since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {(user.email.toLowerCase() === 'shop.sleepyshroom@gmail.com' || user.isAdmin || user.role === 'admin' || user.email.toLowerCase().includes('admin') || user.name.toLowerCase().includes('admin')) && (
              <button
                onClick={() => navigateTo('admin')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </button>
            )}
            <button
              onClick={() => { void logout(); }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#292929] hover:bg-[#FFFCF7] rounded-xl transition-colors border border-[#EADCC8] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Purchased Downloads Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-xl text-[#292929] flex items-center gap-2">
              <Download className="w-5 h-5 text-[#A64B3C]" />
              <span>Purchased Wallpapers</span>
            </h2>
            <button
              onClick={() => navigateTo('collections')}
              className="text-xs font-bold text-[#A64B3C] hover:underline cursor-pointer"
            >
              Explore more
            </button>
          </div>

          {loadingOrders ? (
            <div className="p-8 bg-[#FCF3E2] rounded-3xl border border-[#EADCC8] text-center text-xs text-[#777777] font-medium">
              Loading your purchased files...
            </div>
          ) : userOrders.length > 0 ? (
            <div className="space-y-4">
              {userOrders.flatMap(o => o.items.map(item => ({ ...item, order: o }))).map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8]"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-xl shrink-0 border border-[#EADCC8]"
                    />
                    <div>
                      <h3 className="font-heading font-bold text-sm sm:text-base text-[#292929]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#777777] font-medium mt-0.5">
                        From Order {item.order.orderNumber} · {new Date(item.order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadFile(item.order.downloadToken, item.productId, item.title)}
                    className="px-4 py-2.5 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Files</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-[#FCF3E2] rounded-3xl border border-[#EADCC8] text-center space-y-3">
              <p className="text-3xl">🍄</p>
              <h3 className="font-heading font-bold text-base text-[#292929]">
                No downloads yet
              </h3>
              <p className="text-xs text-[#777777] font-medium max-w-sm mx-auto">
                Any wallpapers you purchase with this email will automatically appear here with lifetime download access.
              </p>
              <button
                onClick={() => navigateTo('collections')}
                className="px-5 py-2.5 bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold rounded-xl hover:bg-[#8E3E30] cursor-pointer"
              >
                Browse Collections
              </button>
            </div>
          )}
        </section>

        {/* Order History */}
        <section className="space-y-4">
          <h2 className="font-heading font-bold text-xl text-[#292929] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#A64B3C]" />
            <span>Order History</span>
          </h2>

          {userOrders.length > 0 ? (
            <div className="bg-[#FCF3E2] rounded-3xl border border-[#EADCC8] divide-y divide-[#EADCC8] overflow-hidden">
              {userOrders.map(ord => (
                <div key={ord.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-sm text-[#292929]">
                      {ord.orderNumber}
                    </span>
                    <span className="text-xs text-[#777777] font-medium ml-2">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </span>
                    <p className="text-xs text-[#777777] font-medium mt-0.5">
                      {ord.items.length} item{ord.items.length > 1 ? 's' : ''} · {ord.paymentMethod}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-base font-extrabold text-[#A64B3C] tabular-nums">
                      ${ord.total.toFixed(2)}
                    </span>
                    <button
                      onClick={() => navigateTo('confirmation', ord.downloadToken)}
                      className="text-xs font-bold text-[#292929] hover:underline cursor-pointer"
                    >
                      View Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#777777] font-medium">No orders recorded for this account.</p>
          )}
        </section>

      </div>
    </div>
  );
};
