import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { supabase } from '../lib/supabase.ts';
import { ShroomLogoIcon } from '../components/common/Icons.tsx';

function createSubmissionUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const rand = (Math.random() * 16) | 0;
    const val = ch === 'x' ? rand : (rand & 0x3) | 0x8;
    return val.toString(16);
  });
}

interface SubmissionSuccessState {
  savedToDatabase: boolean;
  emailDelivered: boolean;
  emailError: string | null;
  submissionId: string;
  recipientEmail: string;
  customerEmail: string;
  inquirySubject: string;
  customerMessage: string;
  customerName: string;
}

export const ContactPage: React.FC = () => {
  const { settings, user } = useShop();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // Anti-spam field

  const [loading, setLoading] = useState(false);
  const [submittedState, setSubmittedState] = useState<SubmissionSuccessState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0); // first FAQ open by default

  const isSubmittingRef = useRef(false);
  const submissionIdRef = useRef<string>(createSubmissionUuid());

  // Pre-fill signed-in customer name/email cleanly when empty
  useEffect(() => {
    if (user) {
      setFullName(prev => (prev.trim() ? prev : user.name || ''));
      setEmail(prev => (prev.trim() ? prev : user.email || ''));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double clicks / concurrent submissions
    if (isSubmittingRef.current || loading) {
      return;
    }

    setErrorMessage(null);

    // Silent anti-spam honeypot check
    if (honeypot.trim()) {
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!trimmedSubject) {
      setErrorMessage('Please enter an inquiry subject.');
      return;
    }

    if (!trimmedMessage) {
      setErrorMessage('Please write your message before submitting.');
      return;
    }

    if (!consent) {
      setErrorMessage('Please check the consent box to submit your inquiry.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          subject: trimmedSubject,
          message: trimmedMessage,
          consent,
          submissionId: submissionIdRef.current,
          website_url: honeypot,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.savedToDatabase) {
        if (data?.duplicate) {
          submissionIdRef.current = createSubmissionUuid();
        }
        throw new Error(
          data?.error ||
            'Unable to save your inquiry right now. Please try again or email shop.sleepyshroom@gmail.com directly.'
        );
      }

      setSubmittedState({
        savedToDatabase: true,
        emailDelivered: Boolean(data.emailDelivered),
        emailError: data.emailError || null,
        submissionId: data.submissionId || submissionIdRef.current,
        recipientEmail: data.recipientEmail || settings?.contactEmail || 'shop.sleepyshroom@gmail.com',
        customerEmail: trimmedEmail,
        inquirySubject: trimmedSubject,
        customerMessage: trimmedMessage,
        customerName: trimmedName,
      });

      // Reset draft fields and issue a fresh submission ID for future messages
      submissionIdRef.current = createSubmissionUuid();
      setSubject('');
      setMessage('');
      setConsent(false);
      if (!user) {
        setFullName('');
        setEmail('');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Something went wrong while sending your inquiry. Please check your connection and try again.'
      );
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const targetEmail = settings?.contactEmail || 'shop.sleepyshroom@gmail.com';

  return (
    <div className="py-12 sm:py-16 bg-[#FFFCF7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
          <div className="flex justify-center mb-1">
            <ShroomLogoIcon size={44} />
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#292929] tracking-tight">
            Let's have a little chat!
          </h1>
          <p className="text-sm sm:text-base text-[#777777] font-medium">
            Have a question, suggestion, or need a little help? Send me a message!
          </p>
        </div>

        <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-10 border border-[#EADCC8] shadow-xs">

          {submittedState ? (
            <div className="py-10 text-center max-w-lg mx-auto space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="font-heading font-bold text-2xl text-[#292929]">
                  Message sent with love!
                </h2>

                {submittedState.emailDelivered ? (
                  <p className="text-xs sm:text-sm text-[#777777] font-medium leading-relaxed">
                    Thank you so much for reaching out! Your inquiry has been saved for our team and forwarded to{' '}
                    <strong className="text-[#292929] font-bold">{submittedState.recipientEmail}</strong>.
                    We usually reply to <strong className="text-[#292929]">{submittedState.customerEmail}</strong> within 24–48 cozy hours.
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-[#777777] font-medium leading-relaxed">
                    Thank you so much for reaching out! Your inquiry has been securely saved for{' '}
                    <strong className="text-[#292929] font-bold">{submittedState.recipientEmail}</strong>.
                    We usually reply to <strong className="text-[#292929]">{submittedState.customerEmail}</strong> within 24–48 cozy hours.
                  </p>
                )}
              </div>

              <p className="text-[11px] font-mono text-[#777777]">
                Reference: {submittedState.submissionId.slice(0, 8)}
              </p>

              <button
                type="button"
                onClick={() => {
                  setSubmittedState(null);
                  setErrorMessage(null);
                }}
                className="px-6 py-2.5 bg-[#A64B3C] text-[#FFFCF7] rounded-xl text-xs font-bold hover:bg-[#8E3E30] transition-all cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Context indicator: Signed-in customer vs Guest */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#FFFCF7] border border-[#EADCC8] rounded-2xl text-xs">
                <div className="flex items-center gap-2 text-[#292929] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#A64B3C] shrink-0" />
                  {user ? (
                    <span>
                      Signed in as <strong className="font-bold">{user.email}</strong> (linked to your account)
                    </span>
                  ) : (
                    <span>Submitting as a guest visitor — no account required</span>
                  )}
                </div>
                <span className="text-[11px] text-[#777777] font-medium">
                  Delivered to {targetEmail}
                </span>
              </div>

              {/* Anti-spam honeypot */}
              <input
                type="text"
                name="website_url"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="contact-full-name" className="block text-xs font-bold text-[#292929] mb-1.5">
                    Full Name *
                  </label>
                  <input
                    id="contact-full-name"
                    type="text"
                    required
                    disabled={loading}
                    maxLength={120}
                    placeholder="Your name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 focus:border-[#A64B3C] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold text-[#292929] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    disabled={loading}
                    maxLength={254}
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 focus:border-[#A64B3C] disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-xs font-bold text-[#292929] mb-1.5">
                  Inquiry Subject *
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  disabled={loading}
                  maxLength={200}
                  placeholder="e.g. Question about 4K Desktop Wallpapers"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 focus:border-[#A64B3C] disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-bold text-[#292929] mb-1.5">
                  Message *
                </label>
                <textarea
                  id="contact-message"
                  required
                  disabled={loading}
                  rows={5}
                  maxLength={5000}
                  placeholder="Tell me what you have in mind or how I can help..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 focus:border-[#A64B3C] resize-y disabled:opacity-60"
                />
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="consent-check"
                  required
                  disabled={loading}
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 accent-[#A64B3C] rounded cursor-pointer disabled:opacity-60"
                />
                <label htmlFor="consent-check" className="text-xs text-[#777777] font-medium cursor-pointer">
                  I agree to have sleepyshroom contact me regarding this message. Your information is never sold or shared.
                </label>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 font-medium"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Sending Inquiry...' : 'Send Message'}</span>
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Customer Support Information Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#FCF3E2] border border-[#EADCC8] rounded-2xl p-5 text-left">
            <div className="w-10 h-10 rounded-xl bg-[#A64B3C]/10 text-[#A64B3C] flex items-center justify-center mb-3">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-sm text-[#292929] mb-1">
              Direct Support Emails
            </h3>
            <p className="text-xs text-[#777777] mb-3">
              Need immediate help or prefer writing from your personal mailbox?
            </p>
            <div className="space-y-1 text-xs">
              <div>
                <a
                  href="mailto:sleepyshroom@gmail.com"
                  className="font-bold text-[#A64B3C] hover:underline"
                >
                  sleepyshroom@gmail.com
                </a>
              </div>
              <div>
                <a
                  href="mailto:shop.sleepyshroom@gmail.com"
                  className="text-[#777777] hover:underline"
                >
                  shop.sleepyshroom@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="bg-[#FCF3E2] border border-[#EADCC8] rounded-2xl p-5 text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-sm text-[#292929] mb-1">
              Response Guarantee
            </h3>
            <p className="text-xs text-[#777777] mb-2">
              Sleepyshroom is managed by an independent digital artist. All inquiries are personally read and answered within <strong>12 to 24 hours</strong>.
            </p>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> 7 Days a Week Support
            </span>
          </div>

          <div className="bg-[#FCF3E2] border border-[#EADCC8] rounded-2xl p-5 text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-sm text-[#292929] mb-1">
              Purchase & File Assistance
            </h3>
            <p className="text-xs text-[#777777]">
              Lost your download link? Need custom crop dimensions for an uncommon display? Simply include your PayPal email or Order ID when contacting us.
            </p>
          </div>
        </div>

        {/* Frequently Asked Questions Section */}
        <div className="mt-16 pt-12 border-t border-[#EADCC8]">
          <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FCF3E2] border border-[#EADCC8] text-xs font-bold text-[#A64B3C]">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Customer Help & Answers</span>
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#292929]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#777777]">
              Everything you need to know about purchasing, digital delivery, formats, and licensing.
            </p>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            {[
              {
                q: 'How do I purchase a product?',
                a: 'Browse our collection, add your favorite wallpapers or bundles to your cart, and proceed to checkout. We use PayPal Checkout exclusively, allowing you to pay safely with your PayPal balance, credit card, or debit card. No account sign-up is required to purchase.'
              },
              {
                q: 'How will I receive my digital files?',
                a: 'Immediately upon successful payment, your order confirmation screen will generate your secure, instant download links. You will also receive an automated order confirmation email containing your permanent receipt and download tokens so you can access your art anytime.'
              },
              {
                q: 'Are the products physical or digital?',
                a: 'All items in Sleepyshroom are 100% digital downloads. No physical print, parcel, or poster will be shipped through the mail. This ensures instant global delivery without shipping fees, customs duties, or waiting periods.'
              },
              {
                q: 'Which devices are supported?',
                a: 'Our artwork is crafted in ultra-high resolution (up to 6K 6016×3384 for ultra-wide monitors and desktops, and calibrated 1290×2796 for mobile and tablet devices). They fit all modern displays including Apple iPhone, iPad, MacBooks, iMacs, Samsung Galaxy, Google Pixel, Windows desktop monitors, and Android tablets.'
              },
              {
                q: 'Can I download my purchases again?',
                a: 'Yes! Your download tokens remain active and tied to your order record. If you created a customer account during checkout, you can log in anytime to view your complete digital library under your Account dashboard. If you checked out as a guest, simply email sleepyshroom@gmail.com with your order details and we will regenerate your files.'
              },
              {
                q: 'Can I use the wallpapers commercially?',
                a: 'No. All Sleepyshroom illustrations and stationery assets are strictly for personal, non-commercial use on your personal devices. Redistribution, reselling, sublicensing, minting as NFTs, altering for commercial resale, or uploading to print-on-demand services is strictly prohibited under international copyright law.'
              },
              {
                q: 'What should I do if my download link expires or fails?',
                a: 'If a network interruption halts your download or an expired session occurs, simply send a brief note to sleepyshroom@gmail.com or shop.sleepyshroom@gmail.com with your PayPal email or Order ID. We will promptly issue fresh download access and direct file mirrors within 12–24 hours.'
              }
            ].map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-[#FCF3E2] border border-[#EADCC8] rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 hover:bg-[#F5E8D0] transition-colors cursor-pointer"
                  >
                    <span className="font-heading font-bold text-sm sm:text-base text-[#292929]">
                      {faq.q}
                    </span>
                    <span className="text-[#A64B3C] shrink-0">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#555555] leading-relaxed border-t border-[#EADCC8]/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

