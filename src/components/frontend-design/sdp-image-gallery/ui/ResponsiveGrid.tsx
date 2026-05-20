import React from "react";
import styles from "../ImageGalleryLab.module.css";
import type { GalleryImage, LayoutMode } from "../engine/priority-loader";

interface ResponsiveGridProps {
  displayImages: GalleryImage[];
  layoutMode: LayoutMode;
  showMasonry: boolean;
  showReserveSpace: boolean;
  showErrors: boolean;
  showLazy: boolean;
  showPlaceholders: boolean;
  showIndex: boolean;
  canOpenLightbox: boolean;
  loadedSet: Set<string>;
  errorSet: Set<string>;
  openLightbox: (index: number) => void;
  retryImage: (id: string) => void;
}

export function ResponsiveGrid({
  displayImages,
  layoutMode,
  showMasonry,
  showReserveSpace,
  showErrors,
  showLazy,
  showPlaceholders,
  showIndex,
  canOpenLightbox,
  loadedSet,
  errorSet,
  openLightbox,
  retryImage,
}: ResponsiveGridProps) {
  const PICSUM_LIMIT = 48;

  const gridClass = React.useMemo(() => {
    if (!showMasonry) return styles.uniformGrid;
    if (layoutMode === "css-columns") return styles.cssColumnsGrid;
    return styles.cssGridMasonry;
  }, [showMasonry, layoutMode]);

  return (
    <div className={gridClass}>
      {displayImages.map((img) => {
        const isLoaded = loadedSet.has(img.id);
        const hasError = showErrors && errorSet.has(img.id);
        const rowSpan =
          layoutMode === "css-grid" && showMasonry
            ? Math.ceil(img.height / 20) + 1
            : undefined;
        const thumbW = 200;
        const thumbH = !showMasonry ? 200 : Math.round(thumbW / img.aspectRatio);
        const picsumUrl = `https://picsum.photos/seed/g${img.index}/${thumbW}/${thumbH}`;

        const isClickable = canOpenLightbox && !hasError;

        return (
          <div
            key={img.id}
            className={styles.imageCard}
            style={{
              aspectRatio: !showMasonry
                ? "1"
                : showReserveSpace
                ? `${img.width}/${img.height}`
                : undefined,
              minHeight: !showMasonry ? "28px" : showReserveSpace ? undefined : "40px",
              gridRow: rowSpan ? `span ${rowSpan}` : undefined,
            }}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-label={isClickable ? `Open image ${img.index + 1} in lightbox` : undefined}
            onClick={isClickable ? () => openLightbox(img.index) : undefined}
            onKeyDown={
              isClickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openLightbox(img.index);
                    }
                  }
                : undefined
            }
          >
            {hasError ? (
              <div
                className={styles.imageCardError}
                onClick={(e) => {
                  e.stopPropagation();
                  retryImage(img.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    retryImage(img.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Retry loading image ${img.index + 1}`}
              >
                <span>⟳ Retry</span>
              </div>
            ) : !isLoaded && showLazy ? (
              showPlaceholders ? (
                <div className={styles.imageCardPlaceholder}>
                  <div
                    className={styles.imageCardBlurFill}
                    style={{ background: `oklch(45% 0.12 ${img.hue})` }}
                  />
                </div>
              ) : (
                <div className={styles.imageCardPending} />
              )
            ) : img.index < PICSUM_LIMIT ? (
              <div className={styles.imageCardInner}>
                <img
                  src={picsumUrl}
                  alt={`Gallery image ${img.index + 1}`}
                  className={styles.imageCardImg}
                  loading="lazy"
                />
                {showIndex && (
                  <span className={styles.imageCardIndex}>{img.index + 1}</span>
                )}
              </div>
            ) : (
              <div className={styles.imageCardInner}>
                <div
                  className={styles.imageCardFill}
                  style={{ background: `oklch(50% 0.12 ${img.hue})` }}
                />
                {showIndex && (
                  <span className={styles.imageCardIndex}>{img.index + 1}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
export default ResponsiveGrid;
