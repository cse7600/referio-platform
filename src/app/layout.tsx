import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Referio - B2B 어필리에이트 플랫폼 | 파트너 추천이 만드는 B2B 파이프라인",
  description: "B2B 세일즈팀을 위한 어필리에이트 플랫폼. 추천 링크 하나로 리드 유입부터 CRM 연동, 파트너 정산까지. 리캐치, 세일즈맵, 허브스팟과 연동됩니다.",
  keywords: "B2B 어필리에이트, 파트너 프로그램, 추천 마케팅, CRM 연동, 리캐치, 세일즈맵, 파트너 정산, B2B 세일즈, Referio",
  openGraph: {
    title: "Referio - B2B 어필리에이트 플랫폼",
    description: "파트너 추천이 만드는 B2B 파이프라인. 추천 링크 하나로 리드 유입부터 CRM 연동, 파트너 정산까지.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
      </head>
      <body className="antialiased">
        <a
          href="https://puzl.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center bg-gray-900 text-white text-xs py-1.5 hover:bg-gray-800 transition-colors"
        >
          Powered by 퍼즐코퍼레이션
        </a>
        <div className="pt-8">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
