'use client';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface NotFoundPresenterProps extends LanguageType {}

const NotFoundPresenter = ({ lng }: NotFoundPresenterProps) => {
  const { t } = useTranslation(lng);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-lg text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-9xl font-bold text-gray-300">
          404
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6">
          <h1 className="text-4xl font-bold text-gray-900">{t('error.404.title', '페이지를 찾을 수 없습니다')}</h1>

          <p className="text-lg text-gray-600">
            {t('error.404.description', '요청하신 페이지가 사라졌거나 잘못된 경로입니다.')}
          </p>

          <div className="relative">
            <motion.div
              animate={{
                x: [-20, 20, -20],
                y: [-10, 10, -10],
              }}
              transition={{
                repeat: Infinity,
                duration: 5,
              }}
              className="mx-auto h-32 w-32">
              <img src="/images/error/lost-astronaut.svg" alt="Lost in Space" className="h-full w-full" />
            </motion.div>
          </div>

          <Link
            href="/"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700">
            {t('error.404.backToHome', '홈으로 돌아가기')}
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFoundPresenter;
