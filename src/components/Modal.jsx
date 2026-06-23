import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      {children}
    </div>,
    document.body
  );
}