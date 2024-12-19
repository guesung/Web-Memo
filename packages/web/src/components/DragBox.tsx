'use client';

import { cn } from '@extension/ui';

interface DragBoxProps {
  dragStart: { x: number; y: number };
  dragEnd: { x: number; y: number };
  className?: string;
}

export default function DragBox({ dragStart, dragEnd, className }: DragBoxProps) {
  return (
    <div
      className={cn('bg-primary/20 border-primary/50 pointer-events-none fixed z-[1000] border', className)}
      style={{
        left: Math.min(dragStart.x, dragEnd.x),
        top: Math.min(dragStart.y, dragEnd.y),
        width: Math.abs(dragEnd.x - dragStart.x),
        height: Math.abs(dragEnd.y - dragStart.y),
      }}
    />
  );
}
