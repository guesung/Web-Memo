'use client';

import { MOTION_VARIANTS } from '@extension/shared/constants';
import { LanguageType } from '@src/modules/i18n';
import { motion } from 'framer-motion';

import SettingCategoryForm from './SettingCategoryForm';
import SettingGuide from './SettingGuide';
import SettingLanguage from './SettingLanguage';

interface SettingProps extends LanguageType {}

export default function Setting({ lng }: SettingProps) {
  return (
    <motion.section
      className="grid gap-6"
      variants={MOTION_VARIANTS.fadeInAndOut}
      initial="initial"
      animate="animate"
      exit="exit">
      <SettingLanguage lng={lng} />
      <SettingGuide lng={lng} />
      <SettingCategoryForm lng={lng} />
    </motion.section>
  );
}
