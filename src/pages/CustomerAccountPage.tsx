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
  ShieldCheck 
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import type { Order } from '../types/index.ts';

export const CustomerAccountPage: React.FC = () => {
  const { user, login, logout, navigateTo } = useShop();

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // User orders state
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setLoadingOrders(true);
      fetch(`/api/orders?email=${encodeURIComponent(user.email)}`)
        .then(res => res.json())
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

    if (!emailInput.trim()) {
      setAuthError('Please enter your email.');
      return;
    }

    setAuthLoading(true);

    try {
      if (isLoginTab) {
        const success = await login(emailInput.trim());
        if (!success) {
          setAuthError('Login failed. Please verify your email.');
        }
      } else {
        if (!nameInput.trim()) {
          setAuthError('Please enter your name.');
          setAuthLoading(false);
          return;
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.trim(), name: nameInput.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          await login(emailInput.trim(), nameInput.trim());
        } else {
          setAuthError(data.error || 'Registration failed.');
        }
      }
    } catch {
      setAuthError('An error occurred during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDownloadFile = (token: string, productId: string, title: string) => {
    const downloadUrl = `/api/downloads/${token}/file/${productId}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // If user is NOT logged in: Show Auth Form
  if (!user) {
    return (
      <div className="py-12 sm:py-16">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          
          <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-8 border border-[#E8C9C1] shadow-xs">
            
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#E8C9C1]/50 text-[#8B6F7A] flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6" />
              </div>
              <h1 className="font-heading font-bold text-2xl text-[#1E1419]">
                {isLoginTab ? 'Welcome Back!' : 'Create an Account'}
              </h1>
              <p className="text-xs text-[#33222C] font-medium mt-1">
                Access your permanent digital downloads anytime.
              </p>
            </div>

            {/* Tab switch */}
            <div className="flex bg-[#F4EAE6] p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setIsLoginTab(true); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  isLoginTab ? 'bg-[#8B6F7A] text-[#F7F3E9] shadow-xs' : 'text-[#1E1419]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLoginTab(false); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  !isLoginTab ? 'bg-[#8B6F7A] text-[#F7F3E9] shadow-xs' : 'text-[#1E1419]'
                }`}
              >
                New Customer
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLoginTab && (
                <div>
                  <label className="block text-xs font-bold text-[#1E1419] mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Clara"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-medium focus:outline-none focus:ring-2 focus:ring-[#8B6F7A]/40"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1E1419] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="clara@example.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-medium focus:outline-none focus:ring-2 focus:ring-[#8B6F7A]/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#1E1419]">
                    Password
                  </label>
                  {isLoginTab && (
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-[11px] font-bold text-[#1E1419] hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-medium focus:outline-none focus:ring-2 focus:ring-[#8B6F7A]/40"
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-[#8B6F7A] hover:bg-[#785E69] text-[#F7F3E9] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all disabled:opacity-60 cursor-pointer"
              >
                {authLoading ? 'Signing in...' : isLoginTab ? 'Sign In to Account' : 'Create My Account'}
              </button>

              {/* Shop Owner Admin Quick Sign-In */}
              <button
                type="button"
                onClick={() => login('shop.sleepyshroom@gmail.com', 'Sleepyshroom Owner')}
                className="w-full py-2 bg-[#8B6F7A] text-[#F7F3E9] hover:bg-[#785E69] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Shop Owner Login (shop.sleepyshroom@gmail.com)</span>
              </button>

              {/* Instant Demo Account login button for test convenience */}
              <button
                type="button"
                onClick={() => login('dreamer@sleepyshroom.com', 'Cozy Dreamer')}
                className="w-full py-2 bg-[#F4EAE6] text-[#1E1419] hover:bg-[#E8C9C1]/50 text-xs font-bold rounded-xl border border-[#D5C2BB] transition-colors cursor-pointer"
              >
                Customer Demo Sign-In (Preview Past Orders)
              </button>
            </form>

            {/* Forgot password popup */}
            {forgotOpen && (
              <div className="mt-4 p-4 bg-[#F4EAE6] rounded-2xl border border-[#D5C2BB] text-xs space-y-2">
                <div className="flex justify-between items-center font-bold text-[#1E1419]">
                  <span>Reset Password</span>
                  <button onClick={() => setForgotOpen(false)} className="text-[#1E1419] font-bold">✕</button>
                </div>
                {forgotSent ? (
                  <p className="text-emerald-800 font-semibold">
                    A password reset instructions link has been dispatched to your email.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[#33222C] font-medium">
                      Enter your email above and click send to receive a secure login link.
                    </p>
                    <button
                      type="button"
                      onClick={() => setForgotSent(true)}
                      className="px-3 py-1.5 bg-[#8B6F7A] text-[#F7F3E9] rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Send Reset Email
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
    <div className="py-10 sm:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Account Header */}
        <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-8 border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#E8C9C1]/50 text-[#1E1419] flex items-center justify-center font-heading font-bold text-xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl text-[#1E1419]">
                Hello, {user.name}!
              </h1>
              <p className="text-xs text-[#33222C] font-medium mt-0.5">
                {user.email} · Customer since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {(user.email.toLowerCase() === 'shop.sleepyshroom@gmail.com' || user.isAdmin || user.role === 'admin' || user.email.toLowerCase().includes('admin') || user.name.toLowerCase().includes('admin')) && (
              <button
                onClick={() => navigateTo('admin')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#F7F3E9] bg-[#8B6F7A] hover:bg-[#785E69] rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </button>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#1E1419] hover:bg-[#E8C9C1]/40 rounded-xl transition-colors border border-[#D5C2BB] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Purchased Downloads Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-xl text-[#1E1419] flex items-center gap-2">
              <Download className="w-5 h-5 text-[#8B6F7A]" />
              <span>Purchased Wallpapers</span>
            </h2>
            <button
              onClick={() => navigateTo('collections')}
              className="text-xs font-bold text-[#1E1419] hover:underline cursor-pointer"
            >
              Explore more
            </button>
          </div>

          {loadingOrders ? (
            <div className="p-8 bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] text-center text-xs text-[#33222C] font-medium">
              Loading your purchased files...
            </div>
          ) : userOrders.length > 0 ? (
            <div className="space-y-4">
              {userOrders.flatMap(o => o.items.map(item => ({ ...item, order: o }))).map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#F9F6F0] rounded-2xl border border-[#E8C9C1]"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-xl shrink-0 border border-[#D5C2BB]"
                    />
                    <div>
                      <h3 className="font-heading font-bold text-sm sm:text-base text-[#1E1419]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#45313D] font-medium mt-0.5">
                        From Order {item.order.orderNumber} · {new Date(item.order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadFile(item.order.downloadToken, item.productId, item.title)}
                    className="px-4 py-2.5 bg-[#8B6F7A] hover:bg-[#785E69] text-[#F7F3E9] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Files</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] text-center space-y-3">
              <p className="text-3xl">🍄</p>
              <h3 className="font-heading font-bold text-base text-[#1E1419]">
                No downloads yet
              </h3>
              <p className="text-xs text-[#33222C] font-medium max-w-sm mx-auto">
                Any wallpapers you purchase with this email will automatically appear here with lifetime download access.
              </p>
              <button
                onClick={() => navigateTo('collections')}
                className="px-5 py-2.5 bg-[#8B6F7A] text-[#F7F3E9] text-xs font-bold rounded-xl hover:bg-[#785E69] cursor-pointer"
              >
                Browse Collections
              </button>
            </div>
          )}
        </section>

        {/* Order History */}
        <section className="space-y-4">
          <h2 className="font-heading font-bold text-xl text-[#1E1419] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#8B6F7A]" />
            <span>Order History</span>
          </h2>

          {userOrders.length > 0 ? (
            <div className="bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] divide-y divide-[#E8C9C1]/70 overflow-hidden">
              {userOrders.map(ord => (
                <div key={ord.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-sm text-[#1E1419]">
                      {ord.orderNumber}
                    </span>
                    <span className="text-xs text-[#45313D] font-medium ml-2">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </span>
                    <p className="text-xs text-[#33222C] font-medium mt-0.5">
                      {ord.items.length} item{ord.items.length > 1 ? 's' : ''} · {ord.paymentMethod}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Distinctive Order Price */}
                    <span className="text-base font-extrabold text-[#945367] tabular-nums">
                      ${ord.total.toFixed(2)}
                    </span>
                    <button
                      onClick={() => navigateTo('confirmation', ord.downloadToken)}
                      className="text-xs font-bold text-[#1E1419] hover:underline cursor-pointer"
                    >
                      View Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#33222C] font-medium">No orders recorded for this account.</p>
          )}
        </section>

      </div>
    </div>
  );
};
