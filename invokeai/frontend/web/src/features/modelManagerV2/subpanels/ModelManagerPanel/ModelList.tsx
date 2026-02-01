import { Box, Flex, Text, useToast } from '@invoke-ai/ui-library';
import { logger } from 'app/logging/logger';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import ScrollableContent from 'common/components/OverlayScrollbars/ScrollableContent';
import { buildUseDisclosure } from 'common/hooks/useBoolean';
import { LoraCategoryManagerModal } from 'features/modelManagerV2/components/LoraCategoryManager';
import {
  LORA_CATEGORIES_ORDER,
  LORA_CATEGORY_TO_COLOR,
  LORA_CATEGORY_TO_NAME,
  MODEL_CATEGORIES_AS_LIST,
} from 'features/modelManagerV2/models';
import {
  clearModelSelection,
  type FilterableModelType,
  selectCategoryViewEnabled,
  selectFilteredModelType,
  selectSearchTerm,
  selectSelectedBaseModel,
  selectSelectedLoraCategory,
  selectSelectedModelKeys,
  setSelectedModelKey,
} from 'features/modelManagerV2/store/modelManagerV2Slice';
import type { BaseModelType } from 'features/nodes/types/common';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { serializeError } from 'serialize-error';
import { useListLoraCategoriesQuery } from 'services/api/endpoints/loraCategories';
import {
  modelConfigsAdapterSelectors,
  useBulkDeleteModelsMutation,
  useGetModelConfigsQuery,
  useUpdateModelMutation,
} from 'services/api/endpoints/models';
import type { AnyModelConfig, LoRAModelConfig } from 'services/api/types';

import { BulkDeleteModelsModal } from './BulkDeleteModelsModal';
import { BulkSetCategoryModal } from './BulkSetCategoryModal';
import { FetchingModelsLoader } from './FetchingModelsLoader';
import ModelListItem from './ModelListItem';
import { ModelListWrapper } from './ModelListWrapper';

// Type for LoRA config with optional category field
type LoRAModelConfigWithCategory = LoRAModelConfig & { category?: string | null };

const log = logger('models');

export const [useBulkDeleteModal] = buildUseDisclosure(false);
export const [useBulkSetCategoryModal] = buildUseDisclosure(false);
export const [useLoraCategoryManagerModal] = buildUseDisclosure(false);

const ModelList = () => {
  const dispatch = useAppDispatch();
  const filteredModelType = useAppSelector(selectFilteredModelType);
  const searchTerm = useAppSelector(selectSearchTerm);
  const selectedModelKeys = useAppSelector(selectSelectedModelKeys);
  const selectedBaseModel = useAppSelector(selectSelectedBaseModel);
  const selectedLoraCategory = useAppSelector(selectSelectedLoraCategory);
  const categoryViewEnabled = useAppSelector(selectCategoryViewEnabled);
  const { t } = useTranslation();
  const toast = useToast();
  const { isOpen: isDeleteOpen, close: closeDelete } = useBulkDeleteModal();
  const { isOpen: isCategoryOpen, close: closeCategory } = useBulkSetCategoryModal();
  const { isOpen: isCategoryManagerOpen, close: closeCategoryManager } = useLoraCategoryManagerModal();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);

  const { data, isLoading } = useGetModelConfigsQuery();
  const { data: loraCategories } = useListLoraCategoriesQuery();
  const [bulkDeleteModels] = useBulkDeleteModelsMutation();
  const [updateModel] = useUpdateModelMutation();

  // Build category info map from API or fallback to hardcoded
  const categoryInfoMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    if (loraCategories) {
      for (const cat of loraCategories) {
        map[cat.id] = { name: cat.name, color: cat.color };
      }
    }
    // Always include hardcoded as fallback
    for (const id of LORA_CATEGORIES_ORDER) {
      if (!map[id]) {
        map[id] = {
          name: LORA_CATEGORY_TO_NAME[id] ?? id,
          color: LORA_CATEGORY_TO_COLOR[id] ?? '#9E9E9E',
        };
      }
    }
    return map;
  }, [loraCategories]);

  // Get ordered category IDs from API or fallback
  const orderedCategoryIds = useMemo(() => {
    if (loraCategories) {
      return loraCategories.map((c) => c.id);
    }
    return LORA_CATEGORIES_ORDER as unknown as string[];
  }, [loraCategories]);

  const models = useMemo(() => {
    const modelConfigs = modelConfigsAdapterSelectors.selectAll(data ?? { ids: [], entities: {} });
    const baseFilteredModelConfigs = modelsFilter(
      modelConfigs,
      searchTerm,
      filteredModelType,
      selectedBaseModel,
      selectedLoraCategory
    );
    const byCategory: { i18nKey: string; configs: AnyModelConfig[] }[] = [];
    const total = baseFilteredModelConfigs.length;
    let renderedTotal = 0;
    for (const { i18nKey, filter } of MODEL_CATEGORIES_AS_LIST) {
      const configs = baseFilteredModelConfigs.filter(filter);
      renderedTotal += configs.length;
      byCategory.push({ i18nKey, configs });
    }
    if (renderedTotal !== total) {
      const ctx = { total, renderedTotal, difference: total - renderedTotal };
      log.warn(
        ctx,
        `ModelList: Not all models were categorized - ensure all possible models are covered in MODEL_CATEGORIES`
      );
    }
    return { total, byCategory, filteredConfigs: baseFilteredModelConfigs };
  }, [data, filteredModelType, searchTerm, selectedBaseModel, selectedLoraCategory]);

  // Group LoRAs by category for category view
  const lorasByCategory = useMemo(() => {
    if (!categoryViewEnabled || filteredModelType !== 'lora') {
      return null;
    }

    const loraConfigs = models.filteredConfigs.filter((m) => m.type === 'lora') as LoRAModelConfigWithCategory[];
    const groups: Record<string, LoRAModelConfigWithCategory[]> = {};

    for (const categoryId of orderedCategoryIds) {
      groups[categoryId] = [];
    }
    groups['uncategorized'] = [];

    for (const lora of loraConfigs) {
      const category = lora.category ?? 'uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(lora);
    }

    // Get categories that have LoRAs
    const categoriesWithLoRAs = orderedCategoryIds.filter((catId) => (groups[catId]?.length ?? 0) > 0);

    // Also check for any LoRAs in categories not in the ordered list
    const extraCategories = Object.keys(groups).filter(
      (catId) => (groups[catId]?.length ?? 0) > 0 && !orderedCategoryIds.includes(catId)
    );

    return {
      groups,
      orderedCategories: [...categoriesWithLoRAs, ...extraCategories],
    };
  }, [categoryViewEnabled, filteredModelType, models.filteredConfigs, orderedCategoryIds]);

  const handleConfirmBulkDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await bulkDeleteModels({ keys: selectedModelKeys }).unwrap();

      // Clear selection and close modal
      dispatch(clearModelSelection());
      dispatch(setSelectedModelKey(null));
      closeDelete();

      // Show success/failure toast
      if (result.failed.length === 0) {
        toast({
          id: 'BULK_DELETE_SUCCESS',
          title: t('modelManager.modelsDeleted', {
            count: result.deleted.length,
            defaultValue: `Successfully deleted ${result.deleted.length} model(s)`,
          }),
          status: 'success',
        });
      } else if (result.deleted.length === 0) {
        toast({
          id: 'BULK_DELETE_FAILED',
          title: t('modelManager.modelsDeleteFailed', {
            defaultValue: 'Failed to delete models',
          }),
          description: t('modelManager.someModelsFailedToDelete', {
            count: result.failed.length,
            defaultValue: `${result.failed.length} model(s) could not be deleted`,
          }),
          status: 'error',
        });
      } else {
        // Partial success
        toast({
          id: 'BULK_DELETE_PARTIAL',
          title: t('modelManager.modelsDeletedPartial', {
            defaultValue: 'Partially completed',
          }),
          description: t('modelManager.someModelsDeleted', {
            deleted: result.deleted.length,
            failed: result.failed.length,
            defaultValue: `${result.deleted.length} deleted, ${result.failed.length} failed`,
          }),
          status: 'warning',
        });
      }

      log.info(`Bulk delete completed: ${result.deleted.length} deleted, ${result.failed.length} failed`);
    } catch (err) {
      log.error({ error: serializeError(err as Error) }, 'Bulk delete error');
      toast({
        id: 'BULK_DELETE_ERROR',
        title: t('modelManager.modelsDeleteError', {
          defaultValue: 'Error deleting models',
        }),
        status: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [bulkDeleteModels, selectedModelKeys, dispatch, closeDelete, toast, t]);

  const handleConfirmBulkSetCategory = useCallback(
    async (category: string) => {
      setIsUpdatingCategory(true);
      const modelConfigs = modelConfigsAdapterSelectors.selectAll(data ?? { ids: [], entities: {} });

      // Filter to only LoRA models from the selection
      const loraKeys = selectedModelKeys.filter((key) => {
        const model = modelConfigs.find((m) => m.key === key);
        return model?.type === 'lora';
      });

      if (loraKeys.length === 0) {
        toast({
          id: 'BULK_SET_CATEGORY_NO_LORAS',
          title: t('modelManager.noLoRAsSelected', {
            defaultValue: 'No LoRA models selected',
          }),
          description: t('modelManager.onlyLoRAsHaveCategories', {
            defaultValue: 'Only LoRA models support categories.',
          }),
          status: 'warning',
        });
        setIsUpdatingCategory(false);
        closeCategory();
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const key of loraKeys) {
        try {
          // Cast to 'as any' since the OpenAPI schema types don't include 'category' yet
          // The API accepts this field for LoRA models
          await updateModel({
            key,
            body: { category } as Record<string, unknown>,
          }).unwrap();
          successCount++;
        } catch (err) {
          log.error({ error: serializeError(err as Error), key }, 'Failed to update model category');
          failCount++;
        }
      }

      // Clear selection and close modal
      dispatch(clearModelSelection());
      closeCategory();

      // Show result toast
      if (failCount === 0) {
        toast({
          id: 'BULK_SET_CATEGORY_SUCCESS',
          title: t('modelManager.categoryUpdated', {
            count: successCount,
            defaultValue: `Updated category for ${successCount} model(s)`,
          }),
          status: 'success',
        });
      } else if (successCount === 0) {
        toast({
          id: 'BULK_SET_CATEGORY_FAILED',
          title: t('modelManager.categoryUpdateFailed', {
            defaultValue: 'Failed to update categories',
          }),
          status: 'error',
        });
      } else {
        toast({
          id: 'BULK_SET_CATEGORY_PARTIAL',
          title: t('modelManager.categoryUpdatePartial', {
            defaultValue: 'Partially completed',
          }),
          description: t('modelManager.someCategoriesUpdated', {
            updated: successCount,
            failed: failCount,
            defaultValue: `${successCount} updated, ${failCount} failed`,
          }),
          status: 'warning',
        });
      }

      log.info(`Bulk category update completed: ${successCount} updated, ${failCount} failed`);
      setIsUpdatingCategory(false);
    },
    [data, selectedModelKeys, updateModel, dispatch, closeCategory, toast, t]
  );

  return (
    <>
      <Flex flexDirection="column" w="full" h="full">
        <ScrollableContent>
          <Flex flexDirection="column" w="full" h="full" gap={4}>
            {isLoading && <FetchingModelsLoader loadingMessage="Loading..." />}
            {lorasByCategory
              ? // Category grouping view for LoRAs
                lorasByCategory.orderedCategories.map((categoryId) => {
                  const group = lorasByCategory.groups[categoryId];
                  if (!group?.length) {
                    return null;
                  }
                  const info = categoryInfoMap[categoryId] ?? { name: categoryId, color: '#9E9E9E' };
                  return (
                    <Box key={categoryId} borderLeftWidth={3} borderLeftColor={info.color} pl={3}>
                      <Text fontSize="sm" color={info.color} fontWeight="semibold" mb={2}>
                        {info.name} ({group.length})
                      </Text>
                      <Flex flexDir="column" gap={1}>
                        {group.map((model) => (
                          <ModelListItem key={model.key} model={model} />
                        ))}
                      </Flex>
                    </Box>
                  );
                })
              : // Default category view (grouped by model type)
                models.byCategory.map(({ i18nKey, configs }) => (
                  <ModelListWrapper key={i18nKey} title={t(i18nKey)} modelList={configs} />
                ))}
            {!isLoading && models.total === 0 && (
              <Flex w="full" h="full" alignItems="center" justifyContent="center">
                <Text>{t('modelManager.noMatchingModels')}</Text>
              </Flex>
            )}
          </Flex>
        </ScrollableContent>
      </Flex>

      <BulkDeleteModelsModal
        isOpen={isDeleteOpen}
        onClose={closeDelete}
        onConfirm={handleConfirmBulkDelete}
        modelCount={selectedModelKeys.length}
        isDeleting={isDeleting}
      />

      <BulkSetCategoryModal
        isOpen={isCategoryOpen}
        onClose={closeCategory}
        onConfirm={handleConfirmBulkSetCategory}
        modelCount={selectedModelKeys.length}
        isUpdating={isUpdatingCategory}
      />

      <LoraCategoryManagerModal isOpen={isCategoryManagerOpen} onClose={closeCategoryManager} />
    </>
  );
};

export default memo(ModelList);

const modelsFilter = <T extends AnyModelConfig>(
  data: T[],
  nameFilter: string,
  filteredModelType: FilterableModelType | null,
  selectedBaseModel: BaseModelType | null,
  selectedLoraCategory: string | null
): T[] => {
  return data.filter((model) => {
    const matchesFilter =
      model.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
      model.base.toLowerCase().includes(nameFilter.toLowerCase()) ||
      model.type.toLowerCase().includes(nameFilter.toLowerCase()) ||
      model.description?.toLowerCase().includes(nameFilter.toLowerCase()) ||
      model.format.toLowerCase().includes(nameFilter.toLowerCase());

    const matchesType = getMatchesType(model, filteredModelType);

    // Filter by base model
    const matchesBaseModel = selectedBaseModel ? model.base === selectedBaseModel : true;

    // Filter by LoRA category (only applies to LoRA models)
    let matchesLoraCategory = true;
    if (selectedLoraCategory && model.type === 'lora') {
      const loraModel = model as LoRAModelConfigWithCategory;
      const modelCategory = loraModel.category ?? 'uncategorized';
      matchesLoraCategory = modelCategory === selectedLoraCategory;
    }

    return matchesFilter && matchesType && matchesBaseModel && matchesLoraCategory;
  });
};

const getMatchesType = (modelConfig: AnyModelConfig, filteredModelType: FilterableModelType | null): boolean => {
  if (filteredModelType === 'refiner') {
    return modelConfig.base === 'sdxl-refiner';
  }

  if (filteredModelType === 'main' && modelConfig.base === 'sdxl-refiner') {
    return false;
  }

  return filteredModelType ? modelConfig.type === filteredModelType : true;
};
