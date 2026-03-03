'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const guides = [
  {
    id: 'blog',
    title: '블로거를 위한 가이드',
    description: '네이버 블로그, 티스토리 등에서 B2B 서비스를 소개하는 방법을 알아보세요.',
    tips: [
      '보안 카메라 설치 후기, 비교 리뷰 등의 콘텐츠를 작성하세요',
      '추천 코드를 자연스럽게 본문에 포함시키세요',
      '설치 전후 비교 사진을 활용하면 효과적입니다',
      'SEO 키워드: CCTV 설치, 보안 카메라 추천, 사무실 보안 등',
    ],
  },
  {
    id: 'instagram',
    title: '인스타그래머를 위한 가이드',
    description: '인스타그램에서 시각적으로 매력적인 보안 솔루션 콘텐츠를 만들어보세요.',
    tips: [
      '설치된 카메라의 깔끔한 인테리어 사진을 공유하세요',
      '스토리/릴스를 활용한 짧은 리뷰 영상을 올려보세요',
      '프로필 링크에 추천 링크를 넣어두세요',
      '해시태그를 적극 활용하세요: #보안카메라 #CCTV추천',
    ],
  },
  {
    id: 'youtube',
    title: '유튜버를 위한 가이드',
    description: '유튜브 영상으로 보안 솔루션의 장점을 생생하게 전달해보세요.',
    tips: [
      '언박싱, 설치 과정, 앱 사용법 등의 영상을 제작하세요',
      '영상 설명란에 추천 링크를 삽입하세요',
      '실제 영상 품질 비교(주간/야간)를 보여주면 효과적입니다',
      '댓글 고정으로 추천 링크를 안내하세요',
    ],
  },
  {
    id: 'referral',
    title: '지인 영업을 위한 가이드',
    description: '주변 지인, 사업체에 직접 추천하여 수수료를 획득하세요.',
    tips: [
      '소규모 사업장, 매장, 사무실 등에 보안 필요성을 안내하세요',
      '추천 코드가 적힌 명함이나 안내장을 활용하세요',
      '실제 설치 사례와 만족도를 공유하면 신뢰도가 높아집니다',
      '가격 대비 성능의 장점을 강조하세요',
    ],
  },
  {
    id: 'community',
    title: '카톡방/카페 영업을 위한 가이드',
    description: '온라인 커뮤니티에서 자연스럽게 보안 솔루션을 소개해보세요.',
    tips: [
      '관련 카페나 커뮤니티에서 유용한 정보를 먼저 제공하세요',
      '직접적인 광고보다는 경험담 형태로 작성하세요',
      '질문에 답변하는 형태로 자연스럽게 추천하세요',
      '커뮤니티 규정을 반드시 확인하고 준수하세요',
    ],
  },
]

export default function GuidesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">활동 가이드</h1>
        <p className="text-gray-500 mt-1">채널별 효과적인 파트너 활동 방법을 알아보세요</p>
      </div>

      <div className="space-y-6">
        {guides.map((guide) => (
          <Card key={guide.id} id={guide.id}>
            <CardHeader>
              <CardTitle className="text-lg">{guide.title}</CardTitle>
              <p className="text-sm text-gray-500">{guide.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {guide.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">
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

      <Card id="tips">
        <CardHeader>
          <CardTitle className="text-lg">성공 파트너들의 팁</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>- 꾸준한 콘텐츠 업로드가 가장 중요합니다</p>
          <p>- 다양한 채널을 동시에 활용하면 효과가 배가됩니다</p>
          <p>- 실제 사용 경험을 바탕으로 한 솔직한 리뷰가 전환율이 높습니다</p>
        </CardContent>
      </Card>

      <Card id="promotion">
        <CardHeader>
          <CardTitle className="text-lg">프로모션 안내</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <p>현재 진행 중인 프로모션은 대시보드에서 확인하실 수 있습니다. 프로모션 기간에는 추가 보너스가 지급됩니다.</p>
        </CardContent>
      </Card>
    </div>
  )
}
