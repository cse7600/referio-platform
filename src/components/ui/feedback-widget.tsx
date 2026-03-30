'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Ticket {
  id: string;
  message: string;
  subject: string | null;
  status: string;
  unread_by_user: boolean;
  created_at: string;
}

interface Reply {
  id: string;
  sender_type: string;
  sender_name: string;
  body: string;
  image_url?: string | null;
  created_at: string;
}

interface UserInfo {
  name: string;
  email: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Group messages by date
function getDateKey(iso: string) {
  return new Date(iso).toDateString();
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'sending' | 'unauthorized'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const threadEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollErrorCountRef = useRef(0);
  const [pollUnstable, setPollUnstable] = useState(false);

  // Scroll to bottom of thread
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Fetch user info + tickets
  const fetchData = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/feedback');
      if (res.status === 401) {
        setStatus('unauthorized');
        return;
      }
      if (!res.ok) throw new Error('fetch error');
      const data = await res.json();
      setUser(data.user);
      setTickets(data.tickets || []);
      setStatus('idle');

      // Auto-load most recent active ticket
      const activeTickets = (data.tickets || []).filter(
        (t: Ticket) => t.status === 'open' || t.status === 'in_progress'
      );
      if (activeTickets.length > 0) {
        await loadThread(activeTickets[0]);
      }
    } catch {
      setStatus('idle');
      setErrorMsg('데이터를 불러오지 못했습니다');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load a ticket thread
  const loadThread = async (ticket: Ticket) => {
    setActiveTicket(ticket);
    try {
      const res = await fetch(`/api/feedback/${ticket.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveTicket(data.ticket);
      setReplies(data.replies || []);
      scrollToBottom();
    } catch {
      // ignore
    }
  };

  // Poll for new replies (10s interval)
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      if (!activeTicket) return;
      try {
        const res = await fetch(`/api/feedback/${activeTicket.id}`);
        if (!res.ok) {
          pollErrorCountRef.current += 1;
          if (pollErrorCountRef.current >= 3) setPollUnstable(true);
          return;
        }
        const data = await res.json();
        setReplies(data.replies || []);
        if (data.ticket) setActiveTicket(data.ticket);
        // Reset error count on success
        pollErrorCountRef.current = 0;
        setPollUnstable(false);
      } catch {
        pollErrorCountRef.current += 1;
        if (pollErrorCountRef.current >= 3) setPollUnstable(true);
      }
    }, 10000);
  }, [activeTicket]);

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      // Cleanup on close
      setActiveTicket(null);
      setReplies([]);
      setMessage('');
      clearImage();
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && activeTicket) {
      startPolling();
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open, activeTicket, startPolling]);

  useEffect(() => {
    scrollToBottom();
  }, [replies, scrollToBottom]);

  // Image handling
  const handleImageSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('5MB 이하 이미지만 첨부 가능합니다');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrorMsg('이미지 파일만 첨부할 수 있습니다');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageSelect(file);
        }
        break;
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
    if (e.target) e.target.value = '';
  };

  // Upload image and return URL
  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/feedback/upload', { method: 'POST', body: formData });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url || null;
    } catch {
      return null;
    }
  };

  // Send new ticket
  const handleNewTicket = async () => {
    if (!message.trim() && !imageFile) return;
    setStatus('sending');
    setErrorMsg('');

    try {
      // Create ticket first
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() || '(image)' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || '전송 실패');
        setStatus('idle');
        return;
      }

      const newTicketId = data.ticket?.id;

      // If there's an image, upload and add as reply
      if (imageFile && newTicketId) {
        const imageUrl = await uploadImage(imageFile);
        if (imageUrl) {
          await fetch(`/api/feedback/${newTicketId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '', image_url: imageUrl }),
          });
        }
      }

      // Reload data and open the new ticket
      setMessage('');
      clearImage();
      const ticketsRes = await fetch('/api/feedback');
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData.tickets || []);
        const newTicket = (ticketsData.tickets || []).find((t: Ticket) => t.id === newTicketId);
        if (newTicket) {
          await loadThread(newTicket);
        }
      }
      setStatus('idle');
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setStatus('idle');
    }
  };

  // Send reply to existing ticket
  const handleSendReply = async () => {
    if (!activeTicket || (!message.trim() && !imageFile)) return;
    setStatus('sending');
    setErrorMsg('');

    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const res = await fetch(`/api/feedback/${activeTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          image_url: imageUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || '전송 실패');
        setStatus('idle');
        return;
      }

      const data = await res.json();
      if (data.reply) {
        setReplies(prev => [...prev, data.reply]);
      }
      // If ticket was resolved, reopen it locally after sending
      if (activeTicket.status === 'resolved') {
        setActiveTicket(prev => prev ? { ...prev, status: 'open' } : null);
        setTickets(prev =>
          prev.map(t => t.id === activeTicket.id ? { ...t, status: 'open' } : t)
        );
      }
      setMessage('');
      clearImage();
      setStatus('idle');
      scrollToBottom();
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setStatus('idle');
    }
  };

  const handleSubmit = () => {
    if (activeTicket) {
      handleSendReply();
    } else {
      handleNewTicket();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Start a new conversation
  const startNewConversation = () => {
    setActiveTicket(null);
    setReplies([]);
    setMessage('');
    clearImage();
    setErrorMsg('');
  };

  const isResolved = activeTicket?.status === 'resolved';

  // Build message list for thread display
  const buildMessageList = () => {
    if (!activeTicket) return [];

    const messages: Array<{
      id: string;
      type: 'user' | 'admin';
      body: string;
      image_url?: string | null;
      time: string;
      dateKey: string;
    }> = [];

    // Original message as first entry
    messages.push({
      id: 'original',
      type: 'user',
      body: activeTicket.message,
      time: activeTicket.created_at,
      dateKey: getDateKey(activeTicket.created_at),
    });

    // Replies
    for (const r of replies) {
      messages.push({
        id: r.id,
        type: r.sender_type === 'admin' ? 'admin' : 'user',
        body: r.body,
        image_url: r.image_url,
        time: r.created_at,
        dateKey: getDateKey(r.created_at),
      });
    }

    return messages;
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-[9998] flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
        aria-label="문의하기"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {tickets.some(t => t.unread_by_user) && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[9998] bg-black/20" onClick={handleClose} />

          {/* Panel */}
          <div className="fixed bottom-[88px] right-6 z-[9999] w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col" style={{ maxHeight: '560px', height: '560px' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-indigo-600 shrink-0">
              <div className="flex items-center gap-3">
                {activeTicket && (
                  <button onClick={startNewConversation} className="text-indigo-200 hover:text-white transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div>
                  <p className="text-white font-semibold text-sm">
                    {activeTicket ? (activeTicket.subject || '문의') : '운영팀 문의'}
                  </p>
                  {user && (
                    <p className="text-indigo-200 text-xs mt-0.5">{user.name}</p>
                  )}
                </div>
              </div>
              <button onClick={handleClose} className="text-indigo-200 hover:text-white transition-colors" aria-label="닫기">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Loading state */}
              {status === 'loading' && (
                <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
                  로딩 중...
                </div>
              )}

              {/* Unauthorized */}
              {status === 'unauthorized' && (
                <div className="flex items-center justify-center flex-1 px-5">
                  <p className="text-gray-500 text-sm text-center">로그인이 필요합니다.</p>
                </div>
              )}

              {/* Chat thread view */}
              {status !== 'loading' && status !== 'unauthorized' && activeTicket && (
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                  {(() => {
                    const messages = buildMessageList();
                    let lastDateKey = '';

                    return messages.map((msg) => {
                      const showDate = msg.dateKey !== lastDateKey;
                      lastDateKey = msg.dateKey;
                      const isMe = msg.type === 'user';

                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex justify-center my-3">
                              <span className="text-[11px] text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                                {formatDate(msg.time)}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                            <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                              {!isMe && (
                                <p className="text-[11px] text-gray-500 mb-1 ml-1">Referio 운영팀</p>
                              )}
                              <div className={`rounded-2xl px-3.5 py-2.5 ${
                                isMe
                                  ? 'bg-indigo-500 text-white rounded-tr-sm'
                                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                              }`}>
                                {msg.body && (
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                                )}
                                {msg.image_url && (
                                  <img
                                    src={msg.image_url}
                                    alt="첨부 이미지"
                                    className="max-w-full rounded-lg mt-1 cursor-pointer"
                                    style={{ maxHeight: '200px' }}
                                    onClick={() => window.open(msg.image_url!, '_blank')}
                                  />
                                )}
                              </div>
                              <p className={`text-[10px] text-gray-400 mt-0.5 ${isMe ? 'mr-1 text-right' : 'ml-1'}`}>
                                {formatTime(msg.time)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {/* Resolved notice */}
                  {isResolved && (
                    <div className="flex justify-center my-4">
                      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          <p className="text-sm font-medium text-green-700">해결 완료</p>
                        </div>
                        <p className="text-xs text-green-600">이 문의가 해결 완료되었습니다.</p>
                      </div>
                    </div>
                  )}

                  <div ref={threadEndRef} />
                </div>
              )}

              {/* No active ticket - new conversation / ticket list */}
              {status !== 'loading' && status !== 'unauthorized' && !activeTicket && (
                <div className="flex-1 overflow-y-auto">
                  {/* Welcome message */}
                  <div className="px-5 pt-5 pb-3">
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-indigo-700">안녕하세요 👋</p>
                      <p className="text-xs text-indigo-500 mt-1">
                        {'무엇이든 편하게 질문하세요.\n보통 몇 시간 안에 답변 드립니다.'}
                      </p>
                    </div>
                  </div>

                  {/* Recent tickets */}
                  {tickets.length > 0 && (
                    <div className="px-5 pb-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">최근 문의</p>
                      <div className="space-y-1.5">
                        {tickets.slice(0, 5).map(t => (
                          <button
                            key={t.id}
                            onClick={() => loadThread(t)}
                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {t.unread_by_user && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                )}
                                <p className="text-sm text-gray-700 truncate">
                                  {t.subject || t.message?.substring(0, 40)}
                                </p>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                                t.status === 'resolved'
                                  ? 'bg-green-100 text-green-600'
                                  : t.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-yellow-100 text-yellow-600'
                              }`}>
                                {t.status === 'resolved' ? '해결됨' : t.status === 'in_progress' ? '답변 완료' : '접수됨'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input area */}
            {status !== 'loading' && status !== 'unauthorized' && (
              <div className="border-t border-gray-100 shrink-0">
                {/* Reopen hint for resolved tickets */}
                {isResolved && activeTicket && (
                  <div className="px-3 pt-2">
                    <p className="text-xs text-gray-400 text-center">추가 문의를 남기면 문의가 다시 열립니다</p>
                  </div>
                )}

                {/* Image preview */}
                {imagePreview && (
                  <div className="px-3 pt-2 flex items-start gap-2">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="미리보기"
                        className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={clearImage}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-700"
                      >
                        x
                      </button>
                    </div>
                  </div>
                )}

                {pollUnstable && (
                  <div className="px-3 pt-1">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span className="text-yellow-700 text-xs">연결 상태가 불안정합니다</span>
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="px-3 pt-1 flex items-center gap-1">
                    <span className="text-red-500 text-xs">{errorMsg}</span>
                    <button
                      onClick={handleSubmit}
                      className="text-indigo-600 text-xs underline ml-2"
                    >
                      다시 시도
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2 p-3">
                  {/* File input button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-indigo-500 transition-colors shrink-0 pb-1"
                    title="이미지 첨부"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Text input */}
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                    placeholder={activeTicket ? '메시지를 입력하세요...' : '문의 내용을 입력하세요...'}
                    rows={1}
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none max-h-24 overflow-y-auto"
                    style={{ minHeight: '36px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = '36px';
                      target.style.height = Math.min(target.scrollHeight, 96) + 'px';
                    }}
                  />

                  {/* Send button */}
                  <button
                    onClick={handleSubmit}
                    disabled={status === 'sending' || (!message.trim() && !imageFile)}
                    className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    {status === 'sending' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                        <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
