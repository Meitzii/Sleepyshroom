import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail,
  Send,
  Download,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  Loader2,
  UserCheck,
  UserX,
} from 'lucide-react';
import type { NewsletterSubscriber, EmailLog, Order } from '../../types/index.ts';
import { parseJsonResponse } from '../../utils/apiClient.ts';

interface NewsletterEmailsAdminPanelProps {
  orders: Order[];
  getToken: () => Promise<string | null>;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export const NewsletterEmailsAdminPanel: React.FC<NewsletterEmailsAdminPanelProps> = ({
  orders,
  getToken,
  onNotify,
  onError,
}) => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [setupNotice, setSetupNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [resendingOrder, setResendingOrder] = useState(false);
  const [busySubId, setBusySubId] = useState<string | null>(null);

  const paidOrders = useMemo(
    () =>
      orders.filter(o =>
        ['paid', 'completed'].includes(String(o.paymentStatus || '').toLowerCase())
      ),
    [orders]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setSetupNotice(null);
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const [subRes, logRes] = await Promise.all([
        fetch('/api/admin/newsletter', { headers }),
        fetch('/api/admin/email-logs', { headers }),
      ]);
      const [subParsed, logParsed] = await Promise.all([
        parseJsonResponse<{
          success?: boolean;
          setupRequired?: boolean;
          error?: string;
          subscribers?: NewsletterSubscriber[];
        }>(subRes),
        parseJsonResponse<{
          success?: boolean;
          logs?: EmailLog[];
          emailProvider?: string | null;
          emailConfigured?: boolean;
        }>(logRes),
      ]);

      if (subParsed.isJson && subParsed.data) {
        if (subParsed.data.setupRequired && subParsed.data.error) {
          setSetupNotice(subParsed.data.error);
        }
        if (Array.isArray(subParsed.data.subscribers)) {
          setSubscribers(subParsed.data.subscribers);
        }
      }

      if (logParsed.isJson && logParsed.data && Array.isArray(logParsed.data.logs)) {
        setEmailLogs(logParsed.data.logs);
      }
    } catch (err: any) {
      onError(err?.message || 'Unable to load newsletter and email logs.');
    } finally {
      setLoading(false);
    }
  }, [getToken, onError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredSubscribers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return subscribers.filter(sub => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (!q) return true;
      return (
        sub.email.toLowerCase().includes(q) ||
        (sub.name || '').toLowerCase().includes(q) ||
        (sub.source || '').toLowerCase().includes(q)
      );
    });
  }, [subscribers, statusFilter, searchTerm]);

  const subscribedCount = subscribers.filter(s => s.status === 'subscribed').length;
  const unsubscribedCount = subscribers.filter(s => s.status === 'unsubscribed').length;

  const handleToggleStatus = async (sub: NewsletterSubscriber) => {
    const nextStatus = sub.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    setBusySubId(sub.id);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/newsletter/${encodeURIComponent(sub.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const parsed = await parseJsonResponse<{ success?: boolean; subscriber?: NewsletterSubscriber; error?: string }>(res);
      if (!parsed.ok || !parsed.data?.success) {
        onError(parsed.data?.error || 'Could not update subscriber status.');
        return;
      }
      setSubscribers(prev =>
        prev.map(s => (s.id === sub.id ? { ...s, status: nextStatus } : s))
      );
      onNotify(`Subscriber ${sub.email} marked as ${nextStatus}.`);
    } finally {
      setBusySubId(null);
    }
  };

  const handleDeleteSubscriber = async (sub: NewsletterSubscriber) => {
    if (!confirm(`Remove subscriber ${sub.email} permanently?`)) return;
    setBusySubId(sub.id);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/newsletter/${encodeURIComponent(sub.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        onError('Could not remove subscriber.');
        return;
      }
      setSubscribers(prev => prev.filter(s => s.id !== sub.id));
      onNotify(`Removed subscriber ${sub.email}.`);
    } finally {
      setBusySubId(null);
    }
  };

  const handleExportCsv = () => {
    const rows = [
      ['Email', 'Name', 'Status', 'Source', 'Consent', 'Subscribed At'],
      ...filteredSubscribers.map(s => [
        s.email,
        s.name || '',
        s.status,
        s.source || 'footer',
        s.consent ? 'true' : 'false',
        s.subscribedAt || '',
      ]),
    ];
    const csv = rows
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sleepyshroom_subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResendOrderEmail = async (orderIdToUse?: string) => {
    const targetId = orderIdToUse || selectedOrderId;
    if (!targetId) {
      onError('Select a paid order to resend confirmation email.');
      return;
    }
    setResendingOrder(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/email-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: targetId }),
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        customerDelivered?: boolean;
        errors?: string[];
        error?: string;
      }>(res);
      if (!parsed.ok || parsed.data?.success === false) {
        onError(parsed.data?.error || parsed.data?.errors?.[0] || 'Unable to resend confirmation email.');
        return;
      }
      if (parsed.data?.customerDelivered) {
        onNotify('Order confirmation email sent cleanly to customer!');
      } else {
        onError(parsed.data?.errors?.[0] || 'Email provider could not deliver the receipt.');
      }
      await loadData();
    } catch (err: any) {
      onError(err?.message || 'Error resending order email.');
    } finally {
      setResendingOrder(false);
    }
  };

  return (
    <div className="space-y-8">
      {setupNotice && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 font-medium flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <span>{setupNotice}</span>
        </div>
      )}

      {/* SUBSCRIBERS SECTION */}
      <div className="space-y-4">
        <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-lg text-[#1E1419] flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#A64B3C]" />
              <span>Newsletter Subscribers ({subscribers.length})</span>
            </h2>
            <p className="text-xs text-[#33222C] mt-0.5">
              Explicit opt-in subscribers only · {subscribedCount} active · {unsubscribedCount} unsubscribed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              className="px-3.5 py-2 bg-white hover:bg-[#F4EAE6] text-[#1E1419] border border-[#D5C2BB] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredSubscribers.length === 0}
              className="px-4 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#F9F6F0] p-3.5 rounded-2xl border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {(['all', 'subscribed', 'unsubscribed'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#A64B3C] text-[#FFFCF7]'
                    : 'bg-white text-[#1E1419] border border-[#D5C2BB] hover:bg-[#F4EAE6]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search subscriber email or name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D5C2BB] rounded-xl"
            />
          </div>
        </div>

        <div className="bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] divide-y divide-[#E8C9C1]/70 overflow-hidden">
          {filteredSubscribers.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#777777] font-medium">
              No subscribers match your filter yet.
            </div>
          ) : (
            filteredSubscribers.map(sub => {
              const isSub = sub.status === 'subscribed';
              const isBusy = busySubId === sub.id;
              return (
                <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#1E1419]">{sub.email}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          isSub
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-stone-200 text-stone-700 border-stone-300'
                        }`}
                      >
                        {sub.status}
                      </span>
                      {sub.consent && (
                        <span className="text-[10px] font-bold text-[#777777]">Consent Verified</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#777777]">
                      {sub.name ? `${sub.name} · ` : ''}
                      Source: {sub.source || 'footer'} · {new Date(sub.subscribedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleToggleStatus(sub)}
                      className="px-3 py-1.5 bg-white hover:bg-[#F4EAE6] border border-[#D5C2BB] rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isSub ? <UserX className="w-3.5 h-3.5 text-amber-700" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-700" />}
                      <span>{isSub ? 'Unsubscribe' : 'Re-subscribe'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleDeleteSubscriber(sub)}
                      className="p-1.5 text-[#777777] hover:text-red-700 hover:bg-red-50 rounded-xl cursor-pointer"
                      title="Delete subscriber"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* EMAIL DELIVERY LOGS & RESEND SECTION */}
      <div className="space-y-4">
        <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-heading font-bold text-lg text-[#1E1419] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#A64B3C]" />
                <span>Transactional Email Logs ({emailLogs.length})</span>
              </h2>
              <p className="text-xs text-[#33222C] mt-0.5">
                Track automated order confirmation receipts &amp; resend confirmation emails for verified paid orders.
              </p>
            </div>
          </div>

          {/* Quick Resend Order Confirmation */}
          <div className="p-4 bg-white rounded-2xl border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
            <div className="flex-1">
              <label className="block font-bold text-[#1E1419] mb-1">
                Resend Paid Order Confirmation Email
              </label>
              <select
                value={selectedOrderId}
                onChange={e => setSelectedOrderId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#D5C2BB] rounded-xl text-[#1E1419]"
              >
                <option value="">Select a paid order...</option>
                {paidOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.customerEmail} (${Number(o.total || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!selectedOrderId || resendingOrder}
              onClick={() => void handleResendOrderEmail()}
              className="px-4 py-2.5 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 sm:mt-5"
            >
              {resendingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{resendingOrder ? 'Sending...' : 'Resend Confirmation'}</span>
            </button>
          </div>
        </div>

        <div className="bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] divide-y divide-[#E8C9C1]/70 overflow-hidden">
          {emailLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#777777] font-medium">
              No email delivery attempts logged yet.
            </div>
          ) : (
            emailLogs.map(log => {
              const isSent = log.status === 'sent';
              return (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          isSent
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : log.status === 'skipped'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {isSent ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{log.status}</span>
                      </span>
                      <span className="font-bold text-[#1E1419]">{log.subject || log.emailType}</span>
                      {log.orderNumber && (
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#D5C2BB]">
                          {log.orderNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#777777]">
                      To: <strong className="text-[#1E1419]">{log.recipientEmail}</strong> · Provider: {log.provider} ·{' '}
                      {new Date(log.attemptedAt).toLocaleString()}
                    </p>
                    {log.errorMessage && (
                      <p className="text-[11px] text-red-700 font-medium">{log.errorMessage}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
