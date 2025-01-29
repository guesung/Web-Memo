'use client';

import { URL } from '@extension/shared/constants';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import { motion } from 'framer-motion';
import { MailIcon, MessageCircleIcon, YoutubeIcon } from 'lucide-react';
import Link from 'next/link';

interface FooterProps extends LanguageType {}

export default function Footer({ lng }: FooterProps) {
  const { t } = useTranslation(lng);

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background border-t py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col items-center justify-center">
          <h2 className="mb-2 text-2xl font-bold">{t('introduce.footer.title')}</h2>
          <p className="text-muted-foreground">{t('introduce.footer.description')}</p>
        </div>

        <div className="mb-8 flex justify-center gap-6">
          <Link
            href={URL.email}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors">
            <span className="flex items-center gap-2">
              <MailIcon className="h-5 w-5" />
              <span>{t('introduce.footer.social.email')}</span>
            </span>
          </Link>

          <Link
            href={URL.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors">
            <span className="flex items-center gap-2">
              <YoutubeIcon className="h-5 w-5" />
              <span>{t('introduce.footer.social.youtube')}</span>
            </span>
          </Link>

          <Link
            href={URL.kakaoTalk}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors">
            <span className="flex items-center gap-2">
              <MessageCircleIcon className="h-5 w-5" />
              <span>{t('introduce.footer.social.kakaotalk')}</span>
            </span>
          </Link>
        </div>

        <div className="text-muted-foreground text-center text-sm">
          <p>&copy; 2024 {t('introduce.footer.copyright')}</p>
        </div>
      </div>
    </motion.footer>
  );
}
