import { useState } from 'react';

interface DragPosition {
  x: number;
  y: number;
}

export function useDrag() {
  const [dragStart, setDragStart] = useState<DragPosition>({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState<DragPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  return {
    dragStart,
    setDragStart,
    dragEnd,
    setDragEnd,
    isDragging,
    setIsDragging,
  };
}
