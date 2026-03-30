'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, CheckCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';

interface Ticket {
  id: string;
  user_type: string;
  user_id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  unread_by_admin: boolean;
  created_at: string;
  replyCount: number;
}

interface Reply {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_name: string;
  body: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: '대기', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  in_progress: { label: '진행중', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  resolved: { label: '해결됨', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/admin/support');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetailLoading(true);
    setReplyText('');

    try {
      const res = await fetch(`/api/admin/support/${ticket.id}`);
      if (res.ok) {
        const data = await res.json();
        setReplies(data.replies || []);
        // Update unread status in local state
        setTickets(prev =>
          prev.map(t => t.id === ticket.id ? { ...t, unread_by_admin: false } : t)
        );
      }
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplies(prev => [...prev, data.reply]);
        setReplyText('');
        // Update ticket status locally
        setTickets(prev =>
          prev.map(t =>
            t.id === selectedTicket.id
              ? { ...t, status: 'in_progress', replyCount: t.replyCount + 1 }
              : t
          )
        );
        setSelectedTicket(prev => prev ? { ...prev, status: 'in_progress' } : null);
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedTicket) return;

    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setTickets(prev =>
          prev.map(t => t.id === selectedTicket.id ? { ...t, status } : t)
        );
        setSelectedTicket(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendReply();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">문의 관리</h1>
        <p className="text-sm text-gray-500 mt-1">고객 문의를 확인하고 답변합니다</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="flex h-full">
          {/* Left: Ticket List */}
          <div className={`w-full md:w-96 border-r flex flex-col ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm font-medium text-gray-700">
                전체 {tickets.length}건
                {tickets.filter(t => t.unread_by_admin).length > 0 && (
                  <span className="ml-2 text-red-600">
                    (미읽음 {tickets.filter(t => t.unread_by_admin).length})
                  </span>
                )}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageSquare className="w-12 h-12 mb-3" />
                  <p>문의가 없습니다</p>
                </div>
              ) : (
                tickets.map(ticket => {
                  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                  const isSelected = selectedTicket?.id === ticket.id;

                  return (
                    <button
                      key={ticket.id}
                      onClick={() => selectTicket(ticket)}
                      className={`w-full text-left p-4 border-b transition-colors hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      } ${ticket.unread_by_admin ? 'bg-red-50/50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {ticket.unread_by_admin && (
                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm text-gray-900 truncate">
                              {ticket.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {ticket.user_type === 'partner' ? '파트너' : '광고주'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {ticket.subject || ticket.message?.substring(0, 50)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge className={`${statusCfg.color} text-[10px] mb-1`}>
                            {statusCfg.label}
                          </Badge>
                          <p className="text-[11px] text-gray-400">{formatDate(ticket.created_at)}</p>
                        </div>
                      </div>
                      {ticket.replyCount > 0 && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          답변 {ticket.replyCount}개
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Thread Detail */}
          <div className={`flex-1 flex flex-col ${selectedTicket ? 'flex' : 'hidden md:flex'}`}>
            {selectedTicket ? (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="md:hidden text-gray-500 hover:text-gray-700"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{selectedTicket.name}</h3>
                        <span className="text-xs text-gray-400">{selectedTicket.email}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatFullDate(selectedTicket.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedTicket.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => updateStatus('resolved')}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        해결 완료
                      </Button>
                    )}
                    {selectedTicket.status === 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus('open')}
                      >
                        다시 열기
                      </Button>
                    )}
                  </div>
                </div>

                {/* Thread Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {detailLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">로딩 중...</p>
                    </div>
                  ) : (
                    <>
                      {/* Original message */}
                      <div className="flex justify-start">
                        <div className="max-w-[80%]">
                          <p className="text-xs text-gray-500 mb-1">
                            {selectedTicket.name} (고객)
                          </p>
                          <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                              {selectedTicket.message}
                            </p>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {formatFullDate(selectedTicket.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Replies */}
                      {replies.map(reply => (
                        <div
                          key={reply.id}
                          className={`flex ${reply.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="max-w-[80%]">
                            <p className={`text-xs mb-1 ${
                              reply.sender_type === 'admin' ? 'text-right text-blue-500' : 'text-gray-500'
                            }`}>
                              {reply.sender_name}
                              {reply.sender_type === 'admin' && ' (운영팀)'}
                            </p>
                            <div className={`rounded-2xl px-4 py-3 ${
                              reply.sender_type === 'admin'
                                ? 'bg-blue-500 text-white rounded-tr-sm'
                                : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                            </div>
                            <p className={`text-[11px] text-gray-400 mt-1 ${
                              reply.sender_type === 'admin' ? 'text-right' : ''
                            }`}>
                              {formatFullDate(reply.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}

                      <div ref={threadEndRef} />
                    </>
                  )}
                </div>

                {/* Reply Input */}
                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="답변을 입력하세요... (Ctrl+Enter로 전송)"
                      className="resize-none min-h-[80px]"
                      rows={3}
                    />
                    <Button
                      onClick={sendReply}
                      disabled={!replyText.trim() || sending}
                      className="self-end"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <MessageSquare className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">문의를 선택하세요</p>
                <p className="text-sm mt-1">왼쪽 목록에서 문의를 클릭하면 대화 내용이 표시됩니다</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
