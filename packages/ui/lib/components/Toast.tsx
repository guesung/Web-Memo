import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose?: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose && onClose();
    }, 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <button className="toast toast-end" onClick={onClose}>
      <div className="alert alert-success">
        <span>{message}</span>
      </div>
    </button>
  );
}
