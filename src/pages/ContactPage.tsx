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

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          subject: subject.trim() || 'General Inquiry',
          message: message.trim(),
          consent,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit message.');
      }

      setSubmitted(true);
      setFullName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setConsent(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
          <div className="flex justify-center mb-1">
            <ShroomLogoIcon size={44} />
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#1E1419] tracking-tight">
            Let's have a little chat!
          </h1>
          <p className="text-sm sm:text-base text-[#33222C] font-medium">
            Have a question, suggestion, or need a little help? Send me a message!
          </p>
        </div>

        <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-10 border border-[#E8C9C1] shadow-xs">
          
          {submitted ? (
            <div className="py-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="font-heading font-bold text-2xl text-[#1E1419]">
                Message sent with love!
              </h2>
              <p className="text-xs sm:text-sm text-[#33222C] font-medium leading-relaxed">
                Thank you so much for reaching out! Your note has been delivered to{' '}
                <strong className="text-[#1E1419] font-bold">{settings?.contactEmail || 'shop.sleepyshroom@gmail.com'}</strong>.
                I usually reply within 24–48 cozy hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2.5 bg-[#8B6F7A] text-[#F7F3E9] rounded-xl text-xs font-bold hover:bg-[#785E69] transition-all cursor-pointer"
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
                  <label className="block text-xs font-bold text-[#1E1419] mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-medium placeholder-[#8B6F7A]/60 focus:outline-none focus:ring-2 focus:ring-[#8B6F7A]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E1419] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-medium placeholder-[#8B6F7A]/60 focus:outline-none focus:ring-2 focus:ring-[#8B6F7A]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E1419] mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Question about 4K Desktop Wallpapers"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-medium placeholder-[#8B6F7A]/60 focus:outline-none focus:ring-2 focus:ring-[#8B6F7A]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E1419] mb-1.5">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tell me what you have in mind or how I can help..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-medium placeholder-[#8B6F7A]/60 focus:outline-none focus:ring-2 focus:ring-[#8B6F7A]/40 resize-y"
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
                  className="mt-0.5 accent-[#8B6F7A] rounded cursor-pointer"
                />
                <label htmlFor="consent-check" className="text-xs text-[#33222C] font-medium cursor-pointer">
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
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#8B6F7A] hover:bg-[#785E69] text-[#F7F3E9] text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Sending Message...' : 'Send Message'}</span>
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Direct Email note */}
        <div className="mt-8 text-center text-xs text-[#33222C] font-medium">
          Prefer standard email? You can also write directly to{' '}
          <a
            href={`mailto:${settings?.contactEmail || 'shop.sleepyshroom@gmail.com'}`}
            className="font-bold underline text-[#1E1419] hover:text-[#945367]"
          >
            {settings?.contactEmail || 'shop.sleepyshroom@gmail.com'}
          </a>
        </div>

      </div>
    </div>
  );
};
