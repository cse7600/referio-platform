'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, ArrowLeft, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';

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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: '접수됨', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: '답변 완료', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: '해결됨', color: 'bg-green-100 text-green-700' },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PartnerSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newSending, setNewSending] = useState(false);
  const [newError, setNewError] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/feedback');
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

  const selectTicket = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setDetailLoading(true);
    setReplyText('');

    try {
      const res = await fetch(`/api/feedback/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setReplies(data.replies || []);
        // Update unread locally
        setTickets(prev =>
          prev.map(t => t.id === ticketId ? { ...t, unread_by_user: false } : t)
        );
      }
    } catch (err) {
      console.error('Failed to fetch thread:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedTicketId || !replyText.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch(`/api/feedback/${selectedTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplies(prev => [...prev, data.reply]);
        setReplyText('');
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendReply();
    }
  };

  const submitNewInquiry = async () => {
    if (!newMessage.trim() || newSending) return;
    setNewSending(true);
    setNewError('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim(),
          subject: newSubject.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setNewError(data.error || '전송에 실패했습니다');
        return;
      }

      // Success: reset form and refresh list
      setNewSubject('');
      setNewMessage('');
      setShowNewForm(false);
      setNewError('');
      await fetchTickets();
    } catch {
      setNewError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setNewSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  // Detail view (mobile or selected)
  if (selectedTicketId && selectedTicket) {
    return (
      <div>
        <div className="mb-4">
          <button
            onClick={() => { setSelectedTicketId(null); setSelectedTicket(null); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </button>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
          {/* Header */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">
                {selectedTicket.subject || selectedTicket.message?.substring(0, 50)}
              </p>
              <Badge className={STATUS_CONFIG[selectedTicket.status]?.color || ''}>
                {STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">{formatDate(selectedTicket.created_at)}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100% - 180px)' }}>
            {detailLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-400">로딩 중...</p>
              </div>
            ) : (
              <>
                {/* Original message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%]">
                    <p className="text-xs text-right text-gray-500 mb-1">나</p>
                    <div className="bg-indigo-500 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                      <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                    </div>
                    <p className="text-[11px] text-right text-gray-400 mt-1">
                      {formatDate(selectedTicket.created_at)}
                    </p>
                  </div>
                </div>

                {/* Replies */}
                {replies.map(reply => (
                  <div
                    key={reply.id}
                    className={`flex ${reply.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[80%]">
                      <p className={`text-xs mb-1 ${
                        reply.sender_type === 'user' ? 'text-right text-gray-500' : 'text-indigo-500'
                      }`}>
                        {reply.sender_type === 'admin' ? 'Referio 운영팀' : '나'}
                      </p>
                      <div className={`rounded-2xl px-4 py-3 ${
                        reply.sender_type === 'user'
                          ? 'bg-indigo-500 text-white rounded-tr-sm'
                          : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                        {reply.image_url && (
                          <img
                            src={reply.image_url}
                            alt="Attachment"
                            className="max-w-full rounded-lg mt-2 cursor-pointer"
                            style={{ maxHeight: '240px' }}
                            onClick={() => window.open(reply.image_url!, '_blank')}
                          />
                        )}
                      </div>
                      <p className={`text-[11px] text-gray-400 mt-1 ${
                        reply.sender_type === 'user' ? 'text-right' : ''
                      }`}>
                        {formatDate(reply.created_at)}
                      </p>
                    </div>
                  </div>
                ))}

                <div ref={threadEndRef} />
              </>
            )}
          </div>

          {/* Reply input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="추가 문의를 입력하세요... (Ctrl+Enter)"
                className="resize-none"
                rows={2}
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
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내 문의</h1>
          <p className="text-sm text-gray-500 mt-1">운영팀에 보낸 문의와 답변을 확인합니다</p>
        </div>
        <Button
          onClick={() => setShowNewForm(!showNewForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          새 문의하기
        </Button>
      </div>

      {/* New inquiry inline form */}
      {showNewForm && (
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">새 문의 작성</h2>
          <div className="space-y-3">
            <Input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="문의 제목 (선택사항)"
              className="text-sm"
            />
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="문의 내용을 입력하세요..."
              rows={3}
              className="resize-none text-sm"
            />
            {newError && (
              <p className="text-red-500 text-xs">{newError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewForm(false);
                  setNewSubject('');
                  setNewMessage('');
                  setNewError('');
                }}
              >
                취소
              </Button>
              <Button
                onClick={submitNewInquiry}
                disabled={!newMessage.trim() || newSending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {newSending ? '전송 중...' : '문의 전송'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-1">문의 내역이 없습니다</p>
          <p className="text-sm text-gray-400">위의 &apos;새 문의하기&apos; 버튼으로 문의를 남겨주세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => {
            const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

            return (
              <button
                key={ticket.id}
                onClick={() => selectTicket(ticket.id)}
                className={`w-full text-left bg-white rounded-xl border shadow-sm p-4 hover:border-indigo-200 transition-colors ${
                  ticket.unread_by_user ? 'border-l-4 border-l-indigo-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {ticket.unread_by_user && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                      )}
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {ticket.subject || ticket.message?.substring(0, 50)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{ticket.message}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge className={`${statusCfg.color} text-[10px]`}>
                      {statusCfg.label}
                    </Badge>
                    <p className="text-[11px] text-gray-400 mt-1">{formatDate(ticket.created_at)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
