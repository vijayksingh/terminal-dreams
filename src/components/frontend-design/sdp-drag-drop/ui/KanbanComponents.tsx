import React, { useState, useRef, useCallback, useEffect } from "react";
import { useDragDrop } from "../drag-drop-context";
import { calculateDropIndex } from "../engine/drag-helpers";
import type { DragItem, DropZone } from "../drag-drop-context";
import styles from "../DragDropLab.module.css";

export function KanbanBoard() {
  const {
    zones, dragState, dropIndicator, selectedItems,
    startDrag, updateDrag, endDrag, cancelDrag, setDropIndicator,
    isActive, activeStep, previewStrategy,
  } = useDragDrop();
  const [a11yAnnouncement, setA11yAnnouncement] = useState("");
  const boardRef = useRef<HTMLDivElement>(null);
  const canDrag = activeStep >= 4;
  const showKeyboard = isActive("keyboardDrag");

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragState.status !== "dragging") return;
    updateDrag(e.clientX, e.clientY);

    // Pointer capture (set on the dragged item) retargets pointermove to that
    // element, so sibling columns never fire their own onPointerMove. Resolve
    // the drop target here via DOM hit-test, which is unaffected by capture.
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const columnEl = hit?.closest<HTMLElement>("[data-zone-id]");
    if (!columnEl) {
      setDropIndicator(null);
      return;
    }
    const zoneId = columnEl.dataset.zoneId!;
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    const bodyEl = columnEl.querySelector<HTMLElement>("[data-zone-body]") ?? columnEl;
    const rect = bodyEl.getBoundingClientRect();
    const index = calculateDropIndex(e.clientY, rect, zone.items.length);
    setDropIndicator({ zoneId, index });
  }, [dragState.status, updateDrag, zones, setDropIndicator]);

  const handlePointerUp = useCallback(() => {
    if (dragState.status !== "dragging") return;
    endDrag();
  }, [dragState.status, endDrag]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragState.status === "dragging") cancelDrag();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [dragState.status, cancelDrag]);

  return (
    <div
      ref={boardRef}
      className={styles.board}
      onPointerMove={canDrag ? handlePointerMove : undefined}
      onPointerUp={canDrag ? handlePointerUp : undefined}
      role="region"
      aria-label="Kanban board"
    >
      {zones.map(zone => (
        <KanbanColumn
          key={zone.id}
          zone={zone}
          canDrag={canDrag}
          showKeyboard={showKeyboard}
          announce={setA11yAnnouncement}
        />
      ))}

      {dragState.status === "dragging" && (
        <DragPreview />
      )}

      <div className={styles.srOnly} aria-live="assertive" role="status">{a11yAnnouncement}</div>
    </div>
  );
}

export function KanbanColumn({ zone, canDrag, showKeyboard, announce }: {
  zone: DropZone;
  canDrag: boolean;
  showKeyboard: boolean;
  announce: (msg: string) => void;
}) {
  const { dragState, dropIndicator, selectedItems, isActive } = useDragDrop();

  const isDragOver = dropIndicator?.zoneId === zone.id;
  const showPlaceholder = isActive("placeholder");

  return (
    <div
      className={styles.column}
      data-zone-id={zone.id}
      data-drag-over={isDragOver ? "true" : undefined}
    >
      <div className={styles.columnHeader}>
        <span className={styles.columnTitle}>{zone.label}</span>
        <span className={styles.columnCount}>{zone.items.length}</span>
      </div>
      <div data-zone-body="" className={styles.columnBody}>
        {zone.items.map((item, idx) => {
          const isDragging = dragState.status === "dragging" && dragState.itemId === item.id;
          const isSelected = selectedItems.has(item.id);
          const showIndicatorBefore = showPlaceholder && isDragOver && dropIndicator?.index === idx;

          return (
            <React.Fragment key={item.id}>
              {showIndicatorBefore && <div className={styles.dropIndicator} />}
              <KanbanItem
                item={item}
                zoneId={zone.id}
                isDragging={isDragging}
                isSelected={isSelected}
                canDrag={canDrag}
                showKeyboard={showKeyboard}
                announce={announce}
              />
            </React.Fragment>
          );
        })}
        {showPlaceholder && isDragOver && dropIndicator?.index === zone.items.length && (
          <div className={styles.dropIndicator} />
        )}
        {zone.items.length === 0 && (
          <div className={styles.emptyZone}>Drop here</div>
        )}
      </div>
    </div>
  );
}

export function KanbanItem({ item, zoneId, isDragging, isSelected, canDrag, showKeyboard, announce }: {
  item: DragItem;
  zoneId: string;
  isDragging: boolean;
  isSelected: boolean;
  canDrag: boolean;
  showKeyboard: boolean;
  announce: (msg: string) => void;
}) {
  const { startDrag, toggleSelectItem, moveItemKeyboard, isActive } = useDragDrop();
  const itemRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!canDrag) return;
    e.preventDefault();
    const rect = itemRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startDrag(item.id, zoneId, e.clientX, e.clientY, e.clientX - rect.left, e.clientY - rect.top);
  }, [canDrag, item.id, zoneId, startDrag]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showKeyboard) return;
    if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const dir = e.key === "ArrowUp" ? "up" : e.key === "ArrowDown" ? "down" : e.key === "ArrowLeft" ? "left" : "right";
      moveItemKeyboard(item.id, zoneId, dir);
      const dirLabel = dir === "up" ? "up" : dir === "down" ? "down" : dir === "left" ? "to previous column" : "to next column";
      announce(`Moved ${item.label} ${dirLabel}`);
    }
    if (e.key === " " && isActive("crossContainer")) {
      e.preventDefault();
      toggleSelectItem(item.id);
      announce(`${isSelected ? "Deselected" : "Selected"} ${item.label}`);
    }
  }, [showKeyboard, item.id, item.label, zoneId, moveItemKeyboard, toggleSelectItem, isActive, isSelected, announce]);

  return (
    <div
      ref={itemRef}
      className={styles.kanbanItem}
      data-dragging={isDragging ? "true" : undefined}
      data-selected={isSelected ? "true" : undefined}
      onPointerDown={canDrag ? handlePointerDown : undefined}
      onKeyDown={showKeyboard ? handleKeyDown : undefined}
      tabIndex={showKeyboard ? 0 : undefined}
      role={showKeyboard ? "option" : undefined}
      aria-roledescription={showKeyboard ? "draggable item" : undefined}
      aria-label={`${item.label}, in ${zoneId}`}
      style={{ borderLeftColor: item.color }}
    >
      <span className={styles.itemLabel}>{item.label}</span>
      {isSelected && <span className={styles.itemCheck}>✓</span>}
    </div>
  );
}

export function DragPreview() {
  const { dragState, zones, previewStrategy } = useDragDrop();
  if (dragState.status !== "dragging") return null;

  const item = zones.flatMap(z => z.items).find(i => i.id === dragState.itemId);
  if (!item) return null;

  const x = dragState.pointerX - dragState.offsetX;
  const y = dragState.pointerY - dragState.offsetY;

  return (
    <div
      className={styles.dragPreview}
      data-strategy={previewStrategy}
      style={{ transform: `translate(${x}px, ${y}px)`, borderLeftColor: item.color }}
    >
      <span className={styles.itemLabel}>{item.label}</span>
    </div>
  );
}
