import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { Flex } from '@invoke-ai/ui-library';
import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { colorTokenToCssVar } from 'common/util/colorTokenToCssVar';
import { lorasReordered, selectLoRAsSlice } from 'features/controlLayers/store/lorasSlice';
import { singleLoRADndSource } from 'features/dnd/dnd';
import { triggerPostMoveFlash } from 'features/dnd/util';
import { LoRACard } from 'features/lora/components/LoRACard';
import { memo, useEffect } from 'react';
import { flushSync } from 'react-dom';

const selectLoRAs = createMemoizedSelector(selectLoRAsSlice, (loras) => loras.loras);

export const LoRAList = memo(() => {
  const dispatch = useAppDispatch();
  const loras = useAppSelector(selectLoRAs);
  const ids = loras.map(({ id }) => id);

  useEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return singleLoRADndSource.typeGuard(source.data);
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;

        if (!singleLoRADndSource.typeGuard(sourceData) || !singleLoRADndSource.typeGuard(targetData)) {
          return;
        }

        const indexOfSource = loras.findIndex((l) => l.id === sourceData.payload.id);
        const indexOfTarget = loras.findIndex((l) => l.id === targetData.payload.id);

        if (indexOfTarget < 0 || indexOfSource < 0 || indexOfSource === indexOfTarget) {
          return;
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData);

        let edgeIndexDelta = 0;
        if (closestEdgeOfTarget === 'bottom') {
          edgeIndexDelta = 1;
        } else if (closestEdgeOfTarget === 'top') {
          edgeIndexDelta = -1;
        }

        if (indexOfSource === indexOfTarget + edgeIndexDelta) {
          return;
        }

        flushSync(() => {
          dispatch(
            lorasReordered({
              loraIds: reorderWithEdge({
                list: loras.map((l) => ({ id: l.id })),
                startIndex: indexOfSource,
                indexOfTarget,
                closestEdgeOfTarget,
                axis: 'vertical',
              }).map((item) => item.id),
            })
          );
        });

        const element = document.querySelector(`[data-entity-id="${sourceData.payload.id}"]`);
        if (element instanceof HTMLElement) {
          triggerPostMoveFlash(element, colorTokenToCssVar('base.700'));
        }
      },
    });
  }, [dispatch, loras]);

  if (!ids.length) {
    return null;
  }

  return (
    <Flex flexWrap="wrap" gap={2}>
      {ids.map((id) => (
        <LoRACard key={id} id={id} />
      ))}
    </Flex>
  );
});

LoRAList.displayName = 'LoRAList';
