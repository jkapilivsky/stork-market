"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`party-modal ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current?.();
      }}
    >
      {onClose && (
        <button
          type="button"
          className="party-modal-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
      )}
      {children}
    </dialog>
  );
}
