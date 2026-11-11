import React, { useState, useMemo } from 'react';
import {
  Mail,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  Check,
  CheckCheck,
  UserCheck,
  User as UserIcon,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquare,
  Copy,
  Sparkles,
} from 'lucide-react';
import type { ContactMessage, ContactMessageStatus } from '../../types/index.ts';

interface ContactMessagesPanelProps {
  messages: ContactMessage[];
  loading: boolean;
  setupError: string | null;
  emailConfigured?: boolean;
  emailProvider?: string | null;
  emailUsingSandbox?: boolean;
  onRefresh: () => Promise<void>;
  onUpdateStatus: (id: string, status: ContactMessageStatus) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  onSendReply?: (
    id: string,
    replySubject: string,
    replyBody: string
  ) => Promise<{ success: boolean; error?: string }>;
}

type StatusFilter = 'all' | ContactMessageStatus;

export const ContactMessagesPanel: React.FC<ContactMessagesPanelProps> = ({
  messages,
  loading,
  setupError,
  onRefresh,
  onUpdateStatus,
  onDelete,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [panelFeedback, setPanelFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const counts = useMemo(() => {
    const newCount = messages.filter(m => m.status === 'new').length;
    const inProgress = messages.filter(m => m.status === 'in_progress').length;
    const replied = messages.filter(m => m.status === 'replied').length;
    return { all: messages.length, new: newCount, in_progress: inProgress, replied };
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

  const handleStatusChange = async (msg: ContactMessage, nextStatus: ContactMessageStatus) => {
    if (msg.status === nextStatus || actionBusyId === msg.id) return;
    setPanelFeedback(null);
    setActionBusyId(msg.id);
    try {
      const res = await onUpdateStatus(msg.id, nextStatus);
      if (!res.success) {
        setPanelFeedback({ type: 'error', text: res.error || 'Unable to save status to Supabase.' });
      } else {
        const label =
          nextStatus === 'new' ? 'New' : nextStatus === 'in_progress' ? 'In Progress' : 'Replied';
        setPanelFeedback({
          type: 'success',
          text:
            nextStatus === 'replied'
              ? `Marked inquiry from ${msg.fullName} as Replied and saved timestamp.`
              : `Updated inquiry status to ${label}.`,
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
        setPanelFeedback({ type: 'success', text: 'Inquiry deleted permanently.' });
      }
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCopyEmail = async (msg: ContactMessage) => {
    try {
      await navigator.clipboard.writeText(msg.email);
      setCopiedEmailId(msg.id);
      setTimeout(() => {
        setCopiedEmailId(prev => (prev === msg.id ? null : prev));
      }, 2000);
    } catch {
      setPanelFeedback({ type: 'error', text: 'Unable to copy email to clipboard.' });
    }
  };

  const buildGmailComposeUrl = (msg: ContactMessage) => {
    const replySubject = msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`;
    const body = [
      `Hi ${msg.fullName},`,
      '',
      '',
      'With cozy wishes,',
      'sleepyshroom',
      'shop.sleepyshroom@gmail.com',
      '',
      '--- Original Message ---',
      `From: ${msg.fullName} <${msg.email}>`,
      `Sent: ${new Date(msg.createdAt).toLocaleString()}`,
      `Subject: ${msg.subject}`,
      '',
      msg.message,
    ].join('\n');

    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: msg.email,
      su: replySubject,
      body,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  };

  const buildMailtoUrl = (msg: ContactMessage) => {
    const replySubject = msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`;
    const body = `Hi ${msg.fullName},\n\n\n---\nOriginal inquiry (${new Date(msg.createdAt).toLocaleString()}):\n${msg.message}`;
    return `mailto:${msg.email}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(body)}`;
  };

  const renderStatusBadge = (status: ContactMessageStatus) => {
    if (status === 'new') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#A64B3C] text-[#FFFCF7]">
          <Sparkles className="w-3 h-3" />
          New
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3 h-3" />
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
        <Check className="w-3 h-3" />
        Replied
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
              {counts.new} new · {counts.in_progress} in progress · {counts.replied} replied ({counts.all} total in Supabase)
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
                { key: 'all', label: `All Messages (${counts.all})` },
                { key: 'new', label: `New (${counts.new})` },
                { key: 'in_progress', label: `In Progress (${counts.in_progress})` },
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

        {/* Manual Gmail Reply Workflow Note */}
        <div className="px-3.5 py-2.5 bg-[#FFFCF7] border border-[#EADCC8] rounded-2xl flex items-center gap-2 text-xs text-[#777777] font-medium">
          <Mail className="w-4 h-4 shrink-0 text-[#A64B3C]" />
          <span>
            Reply from your <strong className="text-[#292929]">Gmail</strong> account, then click{' '}
            <strong className="text-[#292929]">Mark as Replied</strong> to save the status and timestamp to Supabase.
          </span>
        </div>
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
              : 'Try clearing your search or switching back to All Messages.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Inquiry List */}
          <div className="lg:col-span-5 bg-[#FCF3E2] rounded-3xl border border-[#EADCC8] divide-y divide-[#EADCC8] overflow-hidden">
            {filteredMessages.map(msg => {
              const isSelected = activeMessage?.id === msg.id;
              const isBusy = actionBusyId === msg.id;
              return (
                <div
                  key={msg.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedId(msg.id);
                    setConfirmDeleteId(null);
                    setPanelFeedback(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(msg.id);
                      setConfirmDeleteId(null);
                      setPanelFeedback(null);
                    }
                  }}
                  className={`w-full text-left p-4 transition-colors cursor-pointer space-y-2 ${
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

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#777777] pt-0.5">
                    <span className="truncate max-w-[180px]">{msg.email}</span>
                    <span className="shrink-0">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {msg.status === 'replied' && msg.repliedAt ? (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold pt-0.5">
                      <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Replied {new Date(msg.repliedAt).toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedId(msg.id);
                          void handleStatusChange(msg, 'replied');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Mark as Replied</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Complete Message Reader & Manual Reply Tracking */}
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
                    <button
                      type="button"
                      onClick={() => { void handleCopyEmail(activeMessage); }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFCF7] border border-[#EADCC8] hover:border-[#A64B3C]/50 rounded-lg text-[11px] font-bold text-[#292929] cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-[#A64B3C]" />
                      <span>{copiedEmailId === activeMessage.id ? 'Copied!' : 'Copy Email'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#777777] font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Submitted: {new Date(activeMessage.createdAt).toLocaleString()}
                    </span>

                    {activeMessage.status === 'replied' && activeMessage.repliedAt && (
                      <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                        <CheckCheck className="w-3.5 h-3.5" />
                        Replied: {new Date(activeMessage.repliedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Mark as Replied & Delete Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {activeMessage.status !== 'replied' && (
                    <button
                      type="button"
                      disabled={actionBusyId === activeMessage.id}
                      onClick={() => { void handleStatusChange(activeMessage, 'replied'); }}
                      className="px-3.5 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {actionBusyId === activeMessage.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Mark as Replied</span>
                    </button>
                  )}

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

              {/* Manual Reply & Status Tracking Controls */}
              <div className="bg-[#FFFCF7] p-4 sm:p-5 rounded-2xl border border-[#EADCC8] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-heading font-bold text-xs sm:text-sm text-[#292929]">
                      Reply via Gmail & Update Status
                    </h4>
                    <p className="text-[11px] text-[#777777] font-medium mt-0.5">
                      Open Gmail with pre-filled details, then mark this message as Replied.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={buildGmailComposeUrl(activeMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Reply in Gmail</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={buildMailtoUrl(activeMessage)}
                      className="px-3 py-2 bg-[#FCF3E2] hover:bg-[#EADCC8]/60 text-[#292929] border border-[#EADCC8] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>Mail App</span>
                      <ExternalLink className="w-3 h-3 text-[#777777]" />
                    </a>
                  </div>
                </div>

                {/* Persistent 3-Status Selector */}
                <div className="pt-3 border-t border-[#EADCC8] flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold text-[#292929]">
                    Tracking Status:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { value: 'new', label: 'New' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'replied', label: 'Replied' },
                      ] as const
                    ).map(opt => {
                      const isCurrent = activeMessage.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={actionBusyId === activeMessage.id || isCurrent}
                          onClick={() => { void handleStatusChange(activeMessage, opt.value); }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-default ${
                            isCurrent
                              ? opt.value === 'replied'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : opt.value === 'in_progress'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                              : 'bg-[#FCF3E2] hover:bg-[#EADCC8]/70 text-[#292929] border border-[#EADCC8] disabled:opacity-60'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#777777] px-1">
                <span>Saved in Supabase inbox (ID: {activeMessage.id.slice(0, 8)})</span>
                {activeMessage.status === 'replied' && activeMessage.repliedAt && (
                  <span className="text-emerald-800 font-semibold">
                    Marked as replied on {new Date(activeMessage.repliedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
