import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Info,
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
                  {submittedState.emailDelivered
                    ? 'Message sent with love!'
                    : 'Your inquiry was saved!'}
                </h2>

                {submittedState.emailDelivered ? (
                  <p className="text-xs sm:text-sm text-[#777777] font-medium leading-relaxed">
                    Thank you so much for reaching out! Your message has been saved to our shop inbox and emailed to{' '}
                    <strong className="text-[#292929] font-bold">{submittedState.recipientEmail}</strong>.
                    We usually reply within 24–48 cozy hours.
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-[#777777] font-medium leading-relaxed">
                    Thank you! Your inquiry has been securely saved to our Admin inbox so we can review and reply to{' '}
                    <strong className="text-[#292929]">{submittedState.customerEmail}</strong>.
                  </p>
                )}
              </div>

              {!submittedState.emailDelivered && (
                <div className="p-4 bg-[#FFFCF7] border border-amber-300 rounded-2xl text-left space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-amber-900 font-bold">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    <span>Automated email notification could not be confirmed</span>
                  </div>
                  <p className="text-[#777777] font-medium leading-relaxed">
                    {submittedState.emailError || 'Server email delivery is not configured yet.'} Your message is still saved for the shop owner in Admin Dashboard. If your request is urgent, you can also send a copy from your email app:
                  </p>
                  <a
                    href={`mailto:${submittedState.recipientEmail}?subject=${encodeURIComponent(submittedState.inquirySubject)}&body=${encodeURIComponent(`Name: ${submittedState.customerName}\nEmail: ${submittedState.customerEmail}\n\n${submittedState.customerMessage}`)}`}
                    className="inline-flex items-center gap-1.5 font-bold text-[#A64B3C] hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email {submittedState.recipientEmail} directly</span>
                  </a>
                </div>
              )}

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

        {/* Direct Email note */}
        <div className="mt-8 text-center text-xs text-[#777777] font-medium">
          Prefer standard email? You can also write directly to{' '}
          <a
            href={`mailto:${targetEmail}`}
            className="font-bold underline text-[#A64B3C] hover:text-[#8E3E30]"
          >
            {targetEmail}
          </a>
        </div>

      </div>
    </div>
  );
};

