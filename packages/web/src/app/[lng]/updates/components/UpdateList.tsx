'use client';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';

interface UpdateListProps {}

interface Update {
  date: string;
  version: string;
  title: string;
  content: string[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const updates: Update[] = [
  {
    date: '2024.12.06',
    version: 'v1.7.0',
    title: '캘린더 뷰 및 메모 관리 기능 추가',
    content: ['캘린더 뷰 추가', '메모 그룹 선택하여 삭제 및 변경 가능', '카테고리 설정 기능', '가이드 다시하기 기능'],
  },
  {
    date: '2024.11.18',
    version: 'v1.6.0',
    title: '카테고리 기능',
    content: ['카테고리 기능 추가'],
  },
  {
    date: '2024.11.15',
    version: 'v1.5.6',
    title: '위시리스트',
    content: ['위시 리스트 기능 추가'],
  },
  {
    date: '2024.10.11',
    version: 'v1.4.0',
    title: '로그인 및 데이터 저장',
    content: ['OAuth(kakao, google) 로그인', 'Supabase를 이용한 데이터 영구 저장'],
  },
  {
    date: '2024.09.22',
    version: 'v1.1.0',
    title: '웹사이트 마이그레이션',
    content: ['기존 new-tab에서 자사 사이트로 마이그레이션'],
  },
  {
    date: '2024.09.21',
    version: 'v1.0.0',
    title: '정식 출시',
    content: ['소통 창구(구글폼, 인스타그램, 카카오톡) 오픈', '라이트모드 버그 픽스'],
  },
  {
    date: '2024.09.03',
    version: 'v0.2.0',
    title: '주요 기능 업데이트',
    content: [
      '단축키 추가: alt + s(window) / option + s(mac)',
      '트리거 버튼을 action button으로 변경',
      '요약본 저장 기능',
      '메모 기능',
      'New Tab에서 메모 보기 기능',
    ],
  },
  {
    date: '2024.09.01',
    version: 'v0.1.0',
    title: '초기 업데이트',
    content: [
      'Content-ui에서 Side Panel로 마이그레이션',
      'Streaming 방식 데이터 전달',
      '버튼 클릭을 통한 다시 데이터 요청',
    ],
  },
  {
    date: '2024.08.28',
    version: 'v0.0.2',
    title: '서비스 출시',
    content: ['크롬 웹스토어 첫 출시'],
  },
];

interface UpdateListProps extends LanguageType {}

export default function UpdateList({ lng }: UpdateListProps) {
  const { t } = useTranslation(lng);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-12">
      {updates.map(update => (
        <motion.div key={update.version} variants={item} className="border-border border-b pb-8">
          <div className="mb-4 flex items-baseline gap-4">
            <h2 className="text-2xl font-semibold">{update.version}</h2>
            <span className="text-muted-foreground">{update.date}</span>
          </div>
          <h3 className="mb-4 text-xl">{update.title}</h3>
          <ul className="list-inside list-disc space-y-2">
            {update.content.map((item, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-muted-foreground">
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      ))}
    </motion.div>
  );
}
