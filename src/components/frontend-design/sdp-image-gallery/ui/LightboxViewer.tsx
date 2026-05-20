import React, { useEffect, useRef } from "react";
import styles from "../ImageGalleryLab.module.css";

interface LightboxViewerProps {
  isOpen: boolean;
  index: number;
  images: { index: number; aspectRatio: number }[];
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  focusedElement: "prev" | "next" | "close";
  setFocusedElement: (el: "prev" | "next" | "close") => void;
}

export function LightboxViewer({
  isOpen,
  index,
  images,
  onClose,
  onNext,
  onPrev,
  focusedElement,
  setFocusedElement,
}: LightboxViewerProps) {
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const currentImage = images[index];

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight") onNext();
    if (e.key === "ArrowLeft") onPrev();
    if (e.key === "Tab") {
      e.preventDefault();
      const order: ("prev" | "next" | "close")[] = ["prev", "next", "close"];
      const idx = order.indexOf(focusedElement);
      const nextIdx = e.shiftKey
        ? (idx - 1 + order.length) % order.length
        : (idx + 1) % order.length;
      const nextEl = order[nextIdx];
      setFocusedElement(nextEl);

      if (nextEl === "prev") prevBtnRef.current?.focus();
      if (nextEl === "next") nextBtnRef.current?.focus();
      if (nextEl === "close") closeBtnRef.current?.focus();
    }
  };

  if (!isOpen || !currentImage) return null;

  return (
    <div
      className={styles.lightboxOverlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${index + 1} of ${images.length}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className={styles.lightboxInner}>
        <div className={styles.lightboxContent}>
          <img
            src={`https://picsum.photos/seed/g${currentImage.index}/800/${Math.round(
              800 / currentImage.aspectRatio
            )}`}
            alt={`Gallery image ${currentImage.index + 1}`}
            className={styles.lightboxImg}
          />
        </div>
        <div className={styles.lightboxControls}>
          <button
            ref={prevBtnRef}
            type="button"
            className={styles.lightboxButton}
            data-focused={focusedElement === "prev" ? "true" : undefined}
            onClick={onPrev}
            aria-label="Previous image"
          >
            Prev
          </button>
          <button
            ref={nextBtnRef}
            type="button"
            className={styles.lightboxButton}
            data-focused={focusedElement === "next" ? "true" : undefined}
            onClick={onNext}
            aria-label="Next image"
          >
            Next
          </button>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.lightboxButton}
            data-focused={focusedElement === "close" ? "true" : undefined}
            onClick={onClose}
            aria-label="Close lightbox"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
