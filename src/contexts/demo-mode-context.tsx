'use client';

/**
 * DEMO[chabyulhwa] - 시연 모드 컨텍스트
 * 삭제 방법: 이 파일, 모든 useDemoMode() 호출, AdvertiserDemoProvider 래퍼 제거
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DemoModeContextType {
  advertiserId: string;
  isDemoMode: boolean;
  toggleDemoMode: () => void;
}

const DemoModeContext = createContext<DemoModeContextType>({
  advertiserId: '',
  isDemoMode: false,
  toggleDemoMode: () => {},
});

export function useDemoMode() {
  return useContext(DemoModeContext);
}

export function DemoModeProvider({
  advertiserId,
  children,
}: {
  advertiserId: string;
  children: ReactNode;
}) {
  const storageKey = `referio_demo_${advertiserId}`;
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDemoMode(localStorage.getItem(storageKey) === 'true');
    setMounted(true);
  }, [storageKey]);

  const toggleDemoMode = () => {
    setIsDemoMode(prev => {
      const next = !prev;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  };

  // Prevent hydration mismatch — render children only after mount
  if (!mounted) return <>{children}</>;

  return (
    <DemoModeContext.Provider value={{ advertiserId, isDemoMode, toggleDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}
