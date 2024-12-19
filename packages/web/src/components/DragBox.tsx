interface DragBoxProps {
  dragStart: { x: number; y: number };
  dragEnd: { x: number; y: number };
}
export default function DragBox({ dragStart, dragEnd }: DragBoxProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: Math.min(dragStart.x, dragEnd.x),
        top: Math.min(dragStart.y, dragEnd.y),
        width: Math.abs(dragEnd.x - dragStart.x),
        height: Math.abs(dragEnd.y - dragStart.y),
        backgroundColor: 'rgba(66, 153, 225, 0.2)',
        border: '1px solid rgba(66, 153, 225, 0.5)',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    />
  );
}
