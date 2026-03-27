'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const guides = [
  {
    id: 'blog',
    title: '블로거를 위한 가이드',
    icon: '✍️',
    description: '네이버 블로그, 티스토리 등에서 파트너 프로그램 서비스를 소개하는 방법을 알아보세요.',
    tips: [
      '서비스 사용 후기, 비교 리뷰, 추천 글 등의 콘텐츠를 작성하세요',
      '추천 링크(추천 코드)를 글 중간과 하단에 자연스럽게 배치하세요',
      '실제 사용 경험을 바탕으로 한 솔직한 리뷰가 전환율이 높습니다',
      '검색에 잘 걸리도록 서비스명, 카테고리 키워드를 제목과 본문에 포함하세요',
      '이미지, 캡처 화면 등 시각 자료를 함께 첨부하면 신뢰도가 높아집니다',
    ],
  },
  {
    id: 'instagram',
    title: '인스타그래머를 위한 가이드',
    icon: '📸',
    description: '인스타그램에서 시각적으로 매력적인 콘텐츠로 팔로워에게 서비스를 소개해보세요.',
    tips: [
      '서비스와 관련된 일상적인 장면을 자연스러운 사진으로 담아보세요',
      '스토리·릴스를 활용해 짧은 소개 영상이나 후기 영상을 올려보세요',
      '프로필 링크(링크트리 등)에 추천 링크를 등록해두세요',
      '관련 해시태그를 적극 활용하면 도달 범위가 넓어집니다',
      '피드 + 스토리를 함께 활용하면 노출이 배가됩니다',
    ],
  },
  {
    id: 'youtube',
    title: '유튜버를 위한 가이드',
    icon: '🎬',
    description: '유튜브 영상으로 서비스의 장점을 생생하게 전달하고 추천 링크로 수익을 만들어보세요.',
    tips: [
      '언박싱, 사용법, 실제 경험담 등의 영상을 제작하세요',
      '영상 설명란 상단에 추천 링크를 배치하고 영상 중간에 구두로 안내하세요',
      '댓글 고정으로 추천 링크를 안내하면 전환율이 높아집니다',
      '연관 키워드로 썸네일과 제목을 최적화하세요',
      '1~3분 분량의 짧고 임팩트 있는 쇼츠도 효과적입니다',
    ],
  },
  {
    id: 'referral',
    title: '지인 영업을 위한 가이드',
    icon: '🤝',
    description: '주변 지인, 동료, 이웃 사업장에 직접 추천하는 가장 확실한 방법입니다.',
    tips: [
      '서비스가 필요할 만한 지인이나 사업체를 먼저 파악해보세요',
      '직접 서비스를 경험한 경우 솔직한 경험담을 공유하세요',
      '추천 링크를 카카오톡, 문자로 개인에게 전달하세요',
      '서비스의 혜택을 핵심 포인트 위주로 간결하게 전달하세요',
      '여러 번 연락하기보다 필요한 시점에 맞춰 한 번 확실하게 안내하세요',
    ],
  },
  {
    id: 'community',
    title: '카톡방/카페 영업을 위한 가이드',
    icon: '💬',
    description: '온라인 커뮤니티에서 자연스럽게 서비스를 소개하고 관심 있는 분께 추천해보세요.',
    tips: [
      '관련 카페나 커뮤니티에서 유용한 정보를 먼저 제공하며 신뢰를 쌓으세요',
      '직접적인 광고보다 경험담이나 질문 답변 형태로 작성하세요',
      '커뮤니티 규정을 반드시 확인하고 준수하세요',
      '링크 공유 전 서비스의 핵심 장점을 한두 줄로 먼저 설명하세요',
      '반응이 좋은 그룹에 집중적으로 활동하는 것이 효율적입니다',
    ],
  },
]

const successTips = [
  { icon: '📅', text: '꾸준한 활동이 핵심입니다. 한 번보다 주 1~2회 꾸준히 올리는 게 훨씬 효과적입니다.' },
  { icon: '🔗', text: '추천 링크는 항상 프로필, 글 하단, 고정 댓글에 배치해두세요.' },
  { icon: '💡', text: '실제 경험에서 나온 진솔한 리뷰가 인위적인 광고보다 전환율이 2~3배 높습니다.' },
  { icon: '📊', text: '여러 채널을 동시에 활용하면 효과가 배가됩니다. 블로그 + 인스타 조합을 추천합니다.' },
  { icon: '🎯', text: '서비스가 필요한 상황에 있는 분을 타겟하면 전환율이 훨씬 높아집니다.' },
]

export default function GuidesPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">활동 가이드</h1>
        <p className="text-gray-500 mt-1">채널별 효과적인 파트너 활동 방법을 알아보세요</p>
      </div>

      {/* 시작 전 체크리스트 */}
      <Card className="bg-indigo-50 border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-indigo-900">시작 전 확인하세요</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2.5 text-sm text-indigo-800">
            <span className="text-base">✅</span>
            <span>프로그램 마켓플레이스에서 참가하고 싶은 프로그램에 신청하고 승인 받기</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-indigo-800">
            <span className="text-base">✅</span>
            <span>승인 후 대시보드에서 내 추천 링크 복사하기</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-indigo-800">
            <span className="text-base">✅</span>
            <span>아래 채널별 가이드를 참고해서 활동 시작하기</span>
          </div>
        </CardContent>
      </Card>

      {/* 채널별 가이드 */}
      <div className="space-y-4">
        {guides.map((guide) => (
          <Card key={guide.id} id={guide.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-xl">{guide.icon}</span>
                {guide.title}
              </CardTitle>
              <p className="text-sm text-gray-500">{guide.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {guide.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 성공 파트너 팁 */}
      <Card id="tips">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>🏆</span>
            성공 파트너들의 공통점
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {successTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{tip.icon}</span>
                <p className="text-sm text-gray-700">{tip.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 자주 묻는 질문 */}
      <Card id="faq">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>❓</span>
            자주 묻는 질문
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-gray-800">추천 링크는 어디서 확인하나요?</p>
            <p className="text-gray-500 mt-1">대시보드 메인 화면에서 참가 중인 프로그램을 선택하면 추천 링크를 복사할 수 있습니다.</p>
          </div>
          <div className="border-t pt-4">
            <p className="font-medium text-gray-800">수수료는 언제 지급되나요?</p>
            <p className="text-gray-500 mt-1">광고주가 유효 DB 또는 계약 완료로 처리하면 정산이 생성되고, 월 단위로 지급됩니다.</p>
          </div>
          <div className="border-t pt-4">
            <p className="font-medium text-gray-800">여러 프로그램에 동시에 참가할 수 있나요?</p>
            <p className="text-gray-500 mt-1">네, 가능합니다. 프로그램 마켓플레이스에서 원하는 프로그램에 신청하고 대시보드에서 전환해가며 사용할 수 있습니다.</p>
          </div>
          <div className="border-t pt-4">
            <p className="font-medium text-gray-800">내 추천으로 유입된 고객은 어디서 확인하나요?</p>
            <p className="text-gray-500 mt-1">대시보드 → 고객 현황 메뉴에서 내 추천으로 유입된 고객 목록과 상태를 확인할 수 있습니다.</p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center py-4">
        <p className="text-sm text-gray-400">
          더 궁금한 점이 있으신가요?{' '}
          <a href="mailto:referio@puzl.co.kr" className="text-indigo-600 hover:underline">referio@puzl.co.kr</a>로 문의해주세요
        </p>
      </div>
    </div>
  )
}
