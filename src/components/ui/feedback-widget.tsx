'use client';

import { useState, useEffect, useRef } from 'react';

interface Ticket {
  id: string;
  message: string;
  created_at: string;
}

interface UserInfo {
  name: string;
  email: string;
}

type View = 'history' | 'new';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('history');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sending' | 'success' | 'error' | 'unauthorized'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchData = async () => {
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
    } catch {
      setStatus('error');
      setErrorMsg('정보를 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
      setView('history');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (view === 'new' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || '전송 실패');
        setStatus('error');
        return;
      }

      // 새 티켓을 목록 맨 앞에 추가
      if (data.ticket) {
        setTickets(prev => [data.ticket, ...prev]);
      }
      setMessage('');
      setStatus('idle');
      setView('history');
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStatus('idle');
    setErrorMsg('');
    setMessage('');
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9998] flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
        aria-label="문의하기"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        문의하기
      </button>

      {open && (
        <>
          {/* 배경 딤 */}
          <div className="fixed inset-0 z-[9998] bg-black/20" onClick={handleClose} />

          {/* 패널 */}
          <div className="fixed bottom-20 right-6 z-[9999] w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col" style={{ maxHeight: '480px' }}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 bg-indigo-600 shrink-0">
              <div>
                <p className="text-white font-semibold text-sm">문의 / 피드백</p>
                {user && (
                  <p className="text-indigo-200 text-xs mt-0.5">{user.name} · {user.email}</p>
                )}
              </div>
              <button onClick={handleClose} className="text-indigo-200 hover:text-white transition-colors" aria-label="닫기">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto">
              {/* 로딩 */}
              {status === 'loading' && (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">불러오는 중...</div>
              )}

              {/* 로그인 필요 */}
              {status === 'unauthorized' && (
                <div className="px-5 py-8 text-center">
                  <p className="text-gray-500 text-sm">로그인 후 이용하실 수 있습니다.</p>
                </div>
              )}

              {/* 이력 뷰 */}
              {status !== 'loading' && status !== 'unauthorized' && view === 'history' && (
                <div>
                  {tickets.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-gray-400 text-sm">아직 문의 내역이 없습니다.</p>
                      <p className="text-gray-400 text-xs mt-1">불편하신 점이 있으면 문의해 주세요.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {tickets.map(t => (
                        <div key={t.id} className="px-5 py-4">
                          <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">{t.message}</p>
                          <p className="text-gray-400 text-xs mt-1">{formatDate(t.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 새 문의 뷰 */}
              {status !== 'loading' && status !== 'unauthorized' && view === 'new' && (
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">문의 내용</label>
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="서비스 이용 중 불편하신 점이나 궁금한 점을 남겨주세요."
                      required
                      rows={6}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                    />
                  </div>

                  {status === 'error' && (
                    <p className="text-red-500 text-xs">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending' || !message.trim()}
                    className="w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {status === 'sending' ? '전송 중...' : '문의 보내기'}
                  </button>
                </form>
              )}
            </div>

            {/* 하단 탭 (로그인된 경우만) */}
            {status !== 'loading' && status !== 'unauthorized' && (
              <div className="border-t border-gray-100 flex shrink-0">
                <button
                  onClick={() => setView('history')}
                  className={`flex-1 py-3 text-xs font-medium transition-colors ${view === 'history' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  문의 내역
                </button>
                <button
                  onClick={() => setView('new')}
                  className={`flex-1 py-3 text-xs font-medium transition-colors ${view === 'new' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  + 새 문의
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
