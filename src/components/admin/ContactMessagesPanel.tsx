import React, { useState, useMemo } from 'react';
import {
  Mail,
  MailOpen,
  Trash2,
  Send,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  Check,
  UserCheck,
  User as UserIcon,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import type { ContactMessage } from '../../types/index.ts';

interface ContactMessagesPanelProps {
  messages: ContactMessage[];
  loading: boolean;
  setupError: string | null;
  emailConfigured: boolean;
  emailProvider: string | null;
  onRefresh: () => Promise<void>;
  onUpdateStatus: (id: string, status: 'unread' | 'read' | 'replied') => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  onSendReply: (
    id: string,
    replySubject: string,
    replyBody: string
  ) => Promise<{ success: boolean; error?: string }>;
}

type StatusFilter = 'all' | 'unread' | 'read' | 'replied';

export const ContactMessagesPanel: React.FC<ContactMessagesPanelProps> = ({
  messages,
  loading,
  setupError,
  emailConfigured,
  emailProvider,
  onRefresh,
  onUpdateStatus,
  onDelete,
  onSendReply,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Reply composer state
  const [replyOpenForId, setReplyOpenForId] = useState<string | null>(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [panelFeedback, setPanelFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const counts = useMemo(() => {
    const unread = messages.filter(m => m.status === 'unread').length;
    const read = messages.filter(m => m.status === 'read').length;
    const replied = messages.filter(m => m.status === 'replied').length;
    return { all: messages.length, unread, read, replied };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return messages.filter(m => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    });
  }, [messages, statusFilter, searchTerm]);

  const activeMessage = useMemo(() => {
    if (selectedId) {
      const found = filteredMessages.find(m => m.id === selectedId);
      if (found) return found;
    }
    return filteredMessages[0] || null;
  }, [filteredMessages, selectedId]);

  const handleToggleRead = async (msg: ContactMessage) => {
    const nextStatus = msg.status === 'unread' ? 'read' : 'unread';
    setPanelFeedback(null);
    setActionBusyId(msg.id);
    try {
      const res = await onUpdateStatus(msg.id, nextStatus);
      if (!res.success) {
        setPanelFeedback({ type: 'error', text: res.error || 'Unable to update message status.' });
      } else {
        setPanelFeedback({
          type: 'success',
          text: nextStatus === 'read' ? 'Marked message as read.' : 'Marked message as unread.',
        });
      }
    } finally {
      setActionBusyId(null);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    setPanelFeedback(null);
    setActionBusyId(id);
    try {
      const res = await onDelete(id);
      if (!res.success) {
        setPanelFeedback({ type: 'error', text: res.error || 'Unable to delete message.' });
      } else {
        setConfirmDeleteId(null);
        if (selectedId === id) setSelectedId(null);
        if (replyOpenForId === id) setReplyOpenForId(null);
        setPanelFeedback({ type: 'success', text: 'Inquiry deleted permanently.' });
      }
    } finally {
      setActionBusyId(null);
    }
  };

  const openReplyComposer = (msg: ContactMessage) => {
    setPanelFeedback(null);
    setReplyOpenForId(msg.id);
    setReplySubject(msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`);
    setReplyBody('');
  };

  const handleReplySubmit = async (e: React.FormEvent, msg: ContactMessage) => {
    e.preventDefault();
    if (!replyBody.trim() || replySending) return;

    setPanelFeedback(null);
    setReplySending(true);
    try {
      const res = await onSendReply(msg.id, replySubject.trim() || `Re: ${msg.subject}`, replyBody.trim());
      if (!res.success) {
        setPanelFeedback({
          type: 'error',
          text: res.error || 'Failed to send reply email.',
        });
      } else {
        setReplyOpenForId(null);
        setReplyBody('');
        setPanelFeedback({
          type: 'success',
          text: `Email reply confirmed and sent to ${msg.email}.`,
        });
      }
    } finally {
      setReplySending(false);
    }
  };

  const renderStatusBadge = (status: ContactMessage['status']) => {
    if (status === 'unread') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#A64B3C] text-[#FFFCF7]">
          Unread
        </span>
      );
    }
    if (status === 'replied') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <Check className="w-3 h-3" />
          Replied
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFFCF7] text-[#292929] border border-[#EADCC8]">
        Read
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-[#FCF3E2] p-5 sm:p-6 rounded-3xl border border-[#EADCC8] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-bold text-lg sm:text-xl text-[#292929]">
              Contact Form Submissions
            </h2>
            <p className="text-xs text-[#777777] font-medium mt-0.5">
              Customer & guest inquiries stored in Supabase ({counts.unread} unread · {counts.all} total).
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setPanelFeedback(null);
              void onRefresh();
            }}
            disabled={loading}
            className="self-start sm:self-auto px-4 py-2 bg-[#FFFCF7] hover:bg-[#FCF3E2] text-[#292929] border border-[#EADCC8] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#A64B3C] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Inbox</span>
          </button>
        </div>

        {/* Status Filter Pills + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'all', label: `All (${counts.all})` },
                { key: 'unread', label: `Unread (${counts.unread})` },
                { key: 'read', label: `Read (${counts.read})` },
                { key: 'replied', label: `Replied (${counts.replied})` },
              ] as const
            ).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                    : 'bg-[#FFFCF7] text-[#292929] border border-[#EADCC8] hover:border-[#A64B3C]/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, email, or subject..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
            />
          </div>
        </div>

        {/* Email Provider Configuration Notice */}
        {!emailConfigured && !setupError && (
          <div className="p-3.5 bg-[#FFFCF7] border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
            <div>
              <span className="font-bold">Server email sending is not configured yet.</span>{' '}
              <span className="text-[#777777] font-medium">
                Set <code className="font-mono text-[#292929]">RESEND_API_KEY</code> or{' '}
                <code className="font-mono text-[#292929]">GMAIL_APP_PASSWORD</code> /{' '}
                <code className="font-mono text-[#292929]">SMTP_*</code> environment variables to enable automated email alerts to{' '}
                <strong className="text-[#292929]">shop.sleepyshroom@gmail.com</strong> and in-dashboard replies.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {panelFeedback && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            panelFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {panelFeedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{panelFeedback.text}</span>
        </div>
      )}

      {/* Setup / Schema Error Banner */}
      {setupError ? (
        <div className="p-6 bg-[#FCF3E2] rounded-3xl border border-[#EADCC8] space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#A64B3C] font-bold text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Supabase Contact Messages Setup Required</span>
          </div>
          <p className="text-[#292929] font-medium leading-relaxed">{setupError}</p>
        </div>
      ) : loading && messages.length === 0 ? (
        <div className="p-10 bg-[#FCF3E2] rounded-3xl border border-[#EADCC8] text-center space-y-2">
          <Loader2 className="w-6 h-6 text-[#A64B3C] animate-spin mx-auto" />
          <p className="text-xs text-[#777777] font-medium">Loading customer inquiries...</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="p-10 bg-[#FCF3E2] rounded-3xl border border-[#EADCC8] text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-[#A64B3C]/60 mx-auto" />
          <h3 className="font-heading font-bold text-base text-[#292929]">
            {messages.length === 0 ? 'No contact inquiries yet' : 'No inquiries match this filter'}
          </h3>
          <p className="text-xs text-[#777777] font-medium">
            {messages.length === 0
              ? 'Messages sent from your Contact Us page will appear securely here.'
              : 'Try clearing your search or switching back to All.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Inquiry List */}
          <div className="lg:col-span-5 bg-[#FCF3E2] rounded-3xl border border-[#EADCC8] divide-y divide-[#EADCC8] overflow-hidden">
            {filteredMessages.map(msg => {
              const isSelected = activeMessage?.id === msg.id;
              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(msg.id);
                    setConfirmDeleteId(null);
                    setPanelFeedback(null);
                  }}
                  className={`w-full text-left p-4 transition-colors cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-[#FFFCF7] border-l-4 border-l-[#A64B3C]'
                      : 'hover:bg-[#FFFCF7]/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm text-[#292929] truncate">
                      {msg.fullName}
                    </span>
                    {renderStatusBadge(msg.status)}
                  </div>

                  <p className="text-xs font-bold text-[#A64B3C] truncate">{msg.subject}</p>

                  <p className="text-xs text-[#777777] font-medium line-clamp-2 leading-relaxed">
                    {msg.message}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#777777] pt-0.5">
                    <span className="truncate">{msg.email}</span>
                    <span className="shrink-0 ml-2">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Complete Message Reader & Actions */}
          {activeMessage && (
            <div className="lg:col-span-7 bg-[#FCF3E2] rounded-3xl border border-[#EADCC8] p-5 sm:p-7 space-y-5">
              {/* Top Meta */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#EADCC8] pb-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderStatusBadge(activeMessage.status)}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFCF7] text-[#777777] border border-[#EADCC8]">
                      {activeMessage.userId ? (
                        <>
                          <UserCheck className="w-3 h-3 text-[#A64B3C]" />
                          Registered Customer
                        </>
                      ) : (
                        <>
                          <UserIcon className="w-3 h-3 text-[#777777]" />
                          Guest Visitor
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-lg sm:text-xl text-[#292929] break-words">
                    {activeMessage.subject}
                  </h3>

                  <div className="text-xs text-[#292929] font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      <strong>{activeMessage.fullName}</strong> ({activeMessage.email})
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#777777]">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(activeMessage.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={actionBusyId === activeMessage.id}
                    onClick={() => { void handleToggleRead(activeMessage); }}
                    className="px-3 py-2 bg-[#FFFCF7] hover:bg-[#EADCC8]/40 text-[#292929] border border-[#EADCC8] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {activeMessage.status === 'unread' ? (
                      <>
                        <MailOpen className="w-3.5 h-3.5 text-[#A64B3C]" />
                        <span>Mark Read</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5 text-[#A64B3C]" />
                        <span>Mark Unread</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openReplyComposer(activeMessage)}
                    className="px-3.5 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>

                  {confirmDeleteId === activeMessage.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={actionBusyId === activeMessage.id}
                        onClick={() => { void handleConfirmDelete(activeMessage.id); }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        {actionBusyId === activeMessage.id ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-2 bg-[#FFFCF7] border border-[#EADCC8] text-[#292929] rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeMessage.id)}
                      aria-label="Delete inquiry"
                      className="p-2 bg-[#FFFCF7] hover:bg-red-50 text-red-700 border border-[#EADCC8] hover:border-red-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Complete Message Content */}
              <div className="bg-[#FFFCF7] p-4 sm:p-5 rounded-2xl border border-[#EADCC8] text-xs sm:text-sm text-[#292929] leading-relaxed whitespace-pre-wrap break-words">
                {activeMessage.message}
              </div>

              {/* Email Delivery / Reply Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#777777] px-1">
                <span>
                  {activeMessage.emailSent ? (
                    <span className="text-emerald-800 font-semibold">
                      Owner notification emailed to shop.sleepyshroom@gmail.com
                    </span>
                  ) : activeMessage.emailError ? (
                    <span>Notification note: {activeMessage.emailError}</span>
                  ) : (
                    <span>Saved in Supabase inbox (ID: {activeMessage.id.slice(0, 8)})</span>
                  )}
                </span>
                {activeMessage.repliedAt && (
                  <span>Replied {new Date(activeMessage.repliedAt).toLocaleString()}</span>
                )}
              </div>

              {/* Reply Composer */}
              {replyOpenForId === activeMessage.id && (
                <form
                  onSubmit={e => { void handleReplySubmit(e, activeMessage); }}
                  className="p-4 sm:p-5 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-bold text-sm text-[#292929]">
                      Reply to {activeMessage.fullName} ({activeMessage.email})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setReplyOpenForId(null)}
                      className="text-xs font-bold text-[#777777] hover:text-[#292929] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  {!emailConfigured && (
                    <div className="p-3 bg-[#FCF3E2] border border-amber-300 rounded-xl text-[11px] text-amber-900 space-y-1.5">
                      <p className="font-bold">
                        Direct email provider ({emailProvider || 'none'}) is not configured on this server.
                      </p>
                      <p className="text-[#777777] font-medium">
                        Configure <code className="font-mono text-[#292929]">RESEND_API_KEY</code> or SMTP credentials to send replies directly from the dashboard, or open your external email app:
                      </p>
                      <a
                        href={`mailto:${activeMessage.email}?subject=${encodeURIComponent(replySubject || `Re: ${activeMessage.subject}`)}&body=${encodeURIComponent(replyBody)}`}
                        className="inline-flex items-center gap-1 font-bold text-[#A64B3C] hover:underline"
                      >
                        <span>Open in Mail App</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-[#292929] mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      disabled={replySending}
                      value={replySubject}
                      onChange={e => setReplySubject(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#EADCC8] rounded-xl text-[#292929] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#292929] mb-1">
                      Message
                    </label>
                    <textarea
                      required
                      rows={4}
                      disabled={replySending}
                      placeholder={`Write your reply to ${activeMessage.fullName}...`}
                      value={replyBody}
                      onChange={e => setReplyBody(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#EADCC8] rounded-xl text-[#292929] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 resize-y"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <a
                      href={`mailto:${activeMessage.email}?subject=${encodeURIComponent(replySubject || `Re: ${activeMessage.subject}`)}&body=${encodeURIComponent(replyBody)}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#777777] hover:text-[#A64B3C]"
                    >
                      <span>Open external mail client instead</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="submit"
                      disabled={replySending || !replyBody.trim() || !emailConfigured}
                      className="px-5 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {replySending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{replySending ? 'Sending Email...' : 'Send Email Reply'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
