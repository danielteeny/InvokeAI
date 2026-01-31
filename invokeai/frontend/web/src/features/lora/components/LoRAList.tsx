import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { Box, Flex, Text } from '@invoke-ai/ui-library';
import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { colorTokenToCssVar } from 'common/util/colorTokenToCssVar';
import {
  lorasReordered,
  selectLoRASortMode,
  selectLoRAsSlice,
  selectManualOrder,
} from 'features/controlLayers/store/lorasSlice';
import type { LoRA } from 'features/controlLayers/store/types';
import { singleLoRADndSource } from 'features/dnd/dnd';
import { triggerPostMoveFlash } from 'features/dnd/util';
import { LoRACard } from 'features/lora/components/LoRACard';
import { LORA_CATEGORIES_ORDER, LORA_CATEGORY_TO_COLOR, LORA_CATEGORY_TO_NAME } from 'features/modelManagerV2/models';
import { memo, useEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useListLoraCategoriesQuery } from 'services/api/endpoints/loraCategories';
import { useLoRAModels } from 'services/api/hooks/modelsByType';
import type { LoRAModelConfig } from 'services/api/types';

// Type for LoRA config with optional category field
type LoRAModelConfigWithCategory = LoRAModelConfig & { category?: string | null };

const selectLoRAs = createMemoizedSelector(selectLoRAsSlice, (loras) => loras.loras);

// Group LoRAs by category
const groupLoRAsByCategory = (
  loras: LoRA[],
  modelConfigs: LoRAModelConfig[]
): Record<string, { lora: LoRA; config: LoRAModelConfigWithCategory | undefined }[]> => {
  const configMap = new Map(modelConfigs.map((config) => [config.key, config as LoRAModelConfigWithCategory]));
  const groups: Record<string, { lora: LoRA; config: LoRAModelConfigWithCategory | undefined }[]> = {};

  for (const categoryId of LORA_CATEGORIES_ORDER) {
    groups[categoryId] = [];
  }

  for (const lora of loras) {
    const config = configMap.get(lora.model.key);
    const category = config?.category ?? 'uncategorized';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push({ lora, config });
  }

  return groups;
};

export const LoRAList = memo(() => {
  const dispatch = useAppDispatch();
  const loras = useAppSelector(selectLoRAs);
  const sortMode = useAppSelector(selectLoRASortMode);
  const manualOrder = useAppSelector(selectManualOrder);
  const [modelConfigs] = useLoRAModels();
  const { data: categories } = useListLoraCategoriesQuery();

  // Build category info map from API or fallback to hardcoded
  const categoryInfoMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    if (categories) {
      for (const cat of categories) {
        map[cat.id] = { name: cat.name, color: cat.color };
      }
    }
    // Always include hardcoded as fallback
    for (const id of LORA_CATEGORIES_ORDER) {
      if (!map[id]) {
        map[id] = {
          name: LORA_CATEGORY_TO_NAME[id] ?? id,
          color: LORA_CATEGORY_TO_COLOR[id] ?? 'base',
        };
      }
    }
    return map;
  }, [categories]);

  // Get ordered category IDs from API or fallback
  const orderedCategoryIds = useMemo(() => {
    if (categories) {
      return categories.map((c) => c.id);
    }
    return LORA_CATEGORIES_ORDER as unknown as string[];
  }, [categories]);

  // Get sorted LoRAs based on sort mode
  const sortedLoras = useMemo(() => {
    switch (sortMode) {
      case 'manual': {
        // Return in manualOrder sequence
        const loraMap = new Map(loras.map((l) => [l.id, l]));
        const sorted: LoRA[] = [];
        for (const id of manualOrder) {
          const lora = loraMap.get(id);
          if (lora) {
            sorted.push(lora);
          }
        }
        // Add any LoRAs not in manualOrder (shouldn't happen but just in case)
        for (const lora of loras) {
          if (!manualOrder.includes(lora.id)) {
            sorted.push(lora);
          }
        }
        return sorted;
      }
      case 'alphabetical': {
        // Sort by model name A-Z
        const modelNameMap = new Map(modelConfigs.map((config) => [config.key, config.name]));
        return [...loras].sort((a, b) => {
          const nameA = (modelNameMap.get(a.model.key) ?? a.model.key).toLowerCase();
          const nameB = (modelNameMap.get(b.model.key) ?? b.model.key).toLowerCase();
          return nameA.localeCompare(nameB);
        });
      }
      case 'category':
        // Return as-is; grouping handled separately
        return loras;
    }
  }, [loras, sortMode, manualOrder, modelConfigs]);

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

        const indexOfSource = sortedLoras.findIndex((l) => l.id === sourceData.payload.id);
        const indexOfTarget = sortedLoras.findIndex((l) => l.id === targetData.payload.id);

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
                list: sortedLoras.map((l) => ({ id: l.id })),
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
  }, [dispatch, sortedLoras]);

  if (!loras.length) {
    return null;
  }

  // Render category groups when in category mode
  if (sortMode === 'category') {
    const groups = groupLoRAsByCategory(loras, modelConfigs);

    // Get all category IDs that have LoRAs, maintaining order
    const categoriesWithLoRAs = orderedCategoryIds.filter((catId) => (groups[catId]?.length ?? 0) > 0);

    // Also check for any LoRAs in categories not in the ordered list
    const extraCategories = Object.keys(groups).filter(
      (catId) => (groups[catId]?.length ?? 0) > 0 && !orderedCategoryIds.includes(catId)
    );

    const allCategoriesToRender = [...categoriesWithLoRAs, ...extraCategories];

    return (
      <Flex flexDir="column" gap={3}>
        {allCategoriesToRender.map((categoryId) => {
          const group = groups[categoryId];
          if (!group?.length) {
            return null;
          }
          const info = categoryInfoMap[categoryId] ?? { name: categoryId, color: 'base' };
          return (
            <Box key={categoryId} borderLeftWidth={3} borderLeftColor={`${info.color}.500`} pl={2}>
              <Text fontSize="xs" color={`${info.color}.300`} fontWeight="semibold" mb={1}>
                {info.name}
              </Text>
              <Flex flexWrap="wrap" gap={2}>
                {group.map(({ lora }) => (
                  <LoRACard key={lora.id} id={lora.id} />
                ))}
              </Flex>
            </Box>
          );
        })}
      </Flex>
    );
  }

  // Default: flat list (manual or alphabetical)
  return (
    <Flex flexWrap="wrap" gap={2}>
      {sortedLoras.map((lora) => (
        <LoRACard key={lora.id} id={lora.id} />
      ))}
    </Flex>
  );
});

LoRAList.displayName = 'LoRAList';
