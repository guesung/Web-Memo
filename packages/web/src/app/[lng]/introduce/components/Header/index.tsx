'use client';

import { PATHS } from '@extension/shared/constants';
import { Button } from '@extension/ui';
import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface HeaderProps {
  lng: string;
}

export default function Header({ lng }: HeaderProps) {
  const { t } = useTranslation(lng);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('introduce.navigation.title')}</div>
        <div className="space-x-4">
          <Button variant="ghost">
            <Link href={PATHS.login}>{t('introduce.navigation.login')}</Link>
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}
