'use client';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';

interface Update {
  date: string;
  version: string;
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
    date: '2024.12.18',
    version: 'v1.7.1',
  },
  {
    date: '2024.12.06',
    version: 'v1.7.0',
  },
  {
    date: '2024.11.18',
    version: 'v1.6.0',
  },
  {
    date: '2024.11.15',
    version: 'v1.5.6',
  },
  {
    date: '2024.10.11',
    version: 'v1.4.0',
  },
  {
    date: '2024.09.22',
    version: 'v1.1.0',
  },
  {
    date: '2024.09.21',
    version: 'v1.0.0',
  },
  {
    date: '2024.09.03',
    version: 'v0.2.0',
  },
  {
    date: '2024.09.01',
    version: 'v0.1.0',
  },
  {
    date: '2024.08.28',
    version: 'v0.0.2',
  },
];

interface UpdateListProps extends LanguageType {}

export default function UpdateList({ lng }: UpdateListProps) {
  const { t } = useTranslation(lng);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto max-w-4xl space-y-12">
      {updates.map(update => (
        <motion.div key={update.version} variants={item} className="border-border border-b pb-8">
          <div className="mb-4 flex items-baseline gap-4">
            <h2 className="text-2xl font-semibold">{update.version}</h2>
            <span className="text-muted-foreground">{update.date}</span>
          </div>
          <h3 className="mb-4 text-xl">{t(`updates.versions.${update.version}.title`)}</h3>
          <ul className="list-inside list-disc space-y-2">
            {(t(`updates.versions.${update.version}.content`, { returnObjects: true }) as string[]).map(
              (item: string, index: number) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-muted-foreground">
                  {item}
                </motion.li>
              ),
            )}
          </ul>
        </motion.div>
      ))}
    </motion.div>
  );
}
