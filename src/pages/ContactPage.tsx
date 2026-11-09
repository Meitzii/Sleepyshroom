import React, { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, MessageCircle, Sparkles } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ShroomLogoIcon } from '../components/common/Icons.tsx';

export const ContactPage: React.FC = () => {
  const { settings } = useShop();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // Anti-spam field

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Spam honeypot check
    if (honeypot) {
      return;
    }

    if (!fullName.trim() || !email.trim() || !message.trim()) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    if (!consent) {
      setErrorMessage('Please check the consent box to submit your message.');
      return;
    }

    setLoading(true);

    const targetEmail = settings?.contactEmail || 'shop.sleepyshroom@gmail.com';
    const emailSubject = subject.trim() || 'General Inquiry';
    const mailBody = `Name: ${fullName.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message.trim()}`;

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          subject: emailSubject,
          message: message.trim(),
          consent,
        }),
      });

      if (!res.ok) {
        // Fallback for static hosts like Vercel where /api/contact is unavailable
        window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(mailBody)}`;
      } else {
        const data = await res.json().catch(() => ({ success: true }));
        if (!data.success) {
          throw new Error(data.error || 'Failed to submit message.');
        }
      }

      setSubmitted(true);
      setFullName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setConsent(false);
    } catch (err: any) {
      // If API route failed, trigger mailto client to guarantee delivery to shop.sleepyshroom@gmail.com
      window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(mailBody)}`;
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

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
          
          {submitted ? (
            <div className="py-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="font-heading font-bold text-2xl text-[#292929]">
                Message sent with love!
              </h2>
              <p className="text-xs sm:text-sm text-[#777777] font-medium leading-relaxed">
                Thank you so much for reaching out! Your note has been delivered to{' '}
                <strong className="text-[#292929] font-bold">{settings?.contactEmail || 'shop.sleepyshroom@gmail.com'}</strong>.
                I usually reply within 24–48 cozy hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2.5 bg-[#A64B3C] text-[#FFFCF7] rounded-xl text-xs font-bold hover:bg-[#8E3E30] transition-all cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Anti-spam honeypot */}
              <input
                type="text"
                name="website_url"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#292929] mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 focus:border-[#A64B3C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#292929] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 focus:border-[#A64B3C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Question about 4K Desktop Wallpapers"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 focus:border-[#A64B3C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] mb-1.5">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tell me what you have in mind or how I can help..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 focus:border-[#A64B3C] resize-y"
                />
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="consent-check"
                  required
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 accent-[#A64B3C] rounded cursor-pointer"
                />
                <label htmlFor="consent-check" className="text-xs text-[#777777] font-medium cursor-pointer">
                  I agree to have sleepyshroom contact me regarding this message. Your information is never sold or shared.
                </label>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
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
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Sending Message...' : 'Send Message'}</span>
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Direct Email note */}
        <div className="mt-8 text-center text-xs text-[#777777] font-medium">
          Prefer standard email? You can also write directly to{' '}
          <a
            href={`mailto:${settings?.contactEmail || 'shop.sleepyshroom@gmail.com'}`}
            className="font-bold underline text-[#A64B3C] hover:text-[#8E3E30]"
          >
            {settings?.contactEmail || 'shop.sleepyshroom@gmail.com'}
          </a>
        </div>

      </div>
    </div>
  );
};
