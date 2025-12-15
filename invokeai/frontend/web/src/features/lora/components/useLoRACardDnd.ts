import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { singleLoRADndSource } from 'features/dnd/dnd';
import { type DndListTargetState, idle } from 'features/dnd/types';
import { firefoxDndFix } from 'features/dnd/util';
import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

export const useLoRACardDnd = (cardRef: RefObject<HTMLElement>, dragHandleRef: RefObject<HTMLElement>, id: string) => {
  const [dndListState, setDndListState] = useState<DndListTargetState>(idle);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const cardElement = cardRef.current;
    const dragHandleElement = dragHandleRef.current;
    if (!cardElement || !dragHandleElement) {
      return;
    }
    return combine(
      firefoxDndFix(cardElement),
      draggable({
        element: dragHandleElement, // Only drag handle is draggable
        getInitialData() {
          return singleLoRADndSource.getData({ id });
        },
        onDragStart() {
          setDndListState({ type: 'is-dragging' });
          setIsDragging(true);
        },
        onDrop() {
          setDndListState(idle);
          setIsDragging(false);
        },
      }),
      dropTargetForElements({
        element: cardElement, // Entire card is drop target
        canDrop({ source }) {
          return singleLoRADndSource.typeGuard(source.data);
        },
        getData({ input }) {
          const data = singleLoRADndSource.getData({ id });
          return attachClosestEdge(data, {
            element: cardElement,
            input,
            allowedEdges: ['top', 'bottom'],
          });
        },
        getIsSticky() {
          return true;
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data);
          setDndListState({ type: 'is-dragging-over', closestEdge });
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data);
          setDndListState((current) => {
            if (current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current;
            }
            return { type: 'is-dragging-over', closestEdge };
          });
        },
        onDragLeave() {
          setDndListState(idle);
        },
        onDrop() {
          setDndListState(idle);
        },
      })
    );
  }, [id, cardRef, dragHandleRef]);

  return [dndListState, isDragging] as const;
};
