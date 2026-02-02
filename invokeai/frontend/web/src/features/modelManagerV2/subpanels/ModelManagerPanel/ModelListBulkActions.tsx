import type { SystemStyleObject } from '@invoke-ai/ui-library';
import { Button, Checkbox, Flex, Menu, MenuButton, MenuItem, MenuList, Text } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import type { FilterableModelType } from 'features/modelManagerV2/store/modelManagerV2Slice';
import {
  modelSelectionChanged,
  selectFilteredModelType,
  selectSearchTerm,
  selectSelectedBaseModel,
  selectSelectedLoraCategory,
  selectSelectedModelKeys,
} from 'features/modelManagerV2/store/modelManagerV2Slice';
import type { BaseModelType } from 'features/nodes/types/common';
import { t } from 'i18next';
import { memo, useCallback, useMemo } from 'react';
import { PiCaretDownBold, PiFolderSimpleBold, PiTrashSimpleBold } from 'react-icons/pi';
import {
  modelConfigsAdapterSelectors,
  useGetMissingModelsQuery,
  useGetModelConfigsQuery,
} from 'services/api/endpoints/models';
import type { AnyModelConfig, LoRAModelConfig } from 'services/api/types';

// Type for LoRA config with optional category field
type LoRAModelConfigWithCategory = LoRAModelConfig & { category?: string | null };

import { useBulkDeleteModal, useBulkSetCategoryModal } from './ModelList';

const ModelListBulkActionsSx: SystemStyleObject = {
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
};

type ModelListBulkActionsProps = {
  sx?: SystemStyleObject;
};

export const ModelListBulkActions = memo(({ sx }: ModelListBulkActionsProps) => {
  const dispatch = useAppDispatch();
  const filteredModelType = useAppSelector(selectFilteredModelType);
  const selectedModelKeys = useAppSelector(selectSelectedModelKeys);
  const searchTerm = useAppSelector(selectSearchTerm);
  const selectedBaseModel = useAppSelector(selectSelectedBaseModel);
  const selectedLoraCategory = useAppSelector(selectSelectedLoraCategory);
  const { data: allModelsData } = useGetModelConfigsQuery();
  const { data: missingModelsData } = useGetMissingModelsQuery();
  const bulkDeleteModal = useBulkDeleteModal();
  const bulkSetCategoryModal = useBulkSetCategoryModal();

  const handleBulkDelete = useCallback(() => {
    bulkDeleteModal.open();
  }, [bulkDeleteModal]);

  const handleBulkSetCategory = useCallback(() => {
    bulkSetCategoryModal.open();
  }, [bulkSetCategoryModal]);

  // Calculate displayed (filtered) model keys
  const displayedModelKeys = useMemo(() => {
    // Use missing models data when the filter is 'missing'
    const data = filteredModelType === 'missing' ? missingModelsData : allModelsData;
    const modelConfigs = modelConfigsAdapterSelectors.selectAll(data ?? { ids: [], entities: {} });

    // For missing models filter, only apply search term filter
    if (filteredModelType === 'missing') {
      const filtered = modelConfigs.filter(
        (m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.base.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return filtered.map((m) => m.key);
    }

    const filteredModels = modelsFilter(modelConfigs, searchTerm, filteredModelType, selectedBaseModel, selectedLoraCategory);
    return filteredModels.map((m) => m.key);
  }, [allModelsData, missingModelsData, searchTerm, filteredModelType, selectedBaseModel, selectedLoraCategory]);

  const { allSelected, someSelected } = useMemo(() => {
    if (displayedModelKeys.length === 0) {
      return { allSelected: false, someSelected: false };
    }
    const selectedSet = new Set(selectedModelKeys);
    const displayedSelectedCount = displayedModelKeys.filter((key) => selectedSet.has(key)).length;
    return {
      allSelected: displayedSelectedCount === displayedModelKeys.length,
      someSelected: displayedSelectedCount > 0 && displayedSelectedCount < displayedModelKeys.length,
    };
  }, [displayedModelKeys, selectedModelKeys]);

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      // Deselect all displayed models
      const displayedSet = new Set(displayedModelKeys);
      const newSelection = selectedModelKeys.filter((key) => !displayedSet.has(key));
      dispatch(modelSelectionChanged(newSelection));
    } else {
      // Select all displayed models (merge with existing selection)
      const selectedSet = new Set(selectedModelKeys);
      displayedModelKeys.forEach((key) => selectedSet.add(key));
      dispatch(modelSelectionChanged(Array.from(selectedSet)));
    }
  }, [allSelected, displayedModelKeys, selectedModelKeys, dispatch]);

  const selectionCount = selectedModelKeys.length;

  return (
    <Flex sx={{ ...ModelListBulkActionsSx, sx }}>
      <Checkbox
        isChecked={allSelected}
        isIndeterminate={someSelected}
        onChange={handleToggleAll}
        isDisabled={displayedModelKeys.length === 0}
        aria-label={t('modelManager.selectAll')}
      >
        <Text variant="subtext1" color="base.400">
          {t('modelManager.selectAll')}
        </Text>
      </Checkbox>

      <Flex alignItems="center" gap={4}>
        <Text variant="subtext" color="base.400">
          {selectionCount} {t('common.selected')}
        </Text>
        <Menu placement="bottom-end">
          <MenuButton
            as={Button}
            disabled={selectionCount === 0}
            size="sm"
            rightIcon={<PiCaretDownBold />}
            flexShrink={0}
            variant="outline"
          >
            {t('modelManager.actions')}
          </MenuButton>
          <MenuList>
            <MenuItem icon={<PiFolderSimpleBold />} onClick={handleBulkSetCategory}>
              {t('modelManager.setCategory')}
            </MenuItem>
            <MenuItem icon={<PiTrashSimpleBold />} onClick={handleBulkDelete} color="error.300">
              {t('modelManager.deleteModels', { count: selectionCount })}
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Flex>
  );
});

ModelListBulkActions.displayName = 'ModelListBulkActions';

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
