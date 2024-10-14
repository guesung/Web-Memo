'use client';

import { useState } from 'react';
import MemoGrid from './MemoGrid';
import MemoTable from './MemoTable';

export default function MemoView() {
  const [view, setView] = useState<'grid' | 'table'>('grid');

  if (view === 'grid') return <MemoGrid />;
  if (view === 'table') return <MemoTable />;
  return null;
}
