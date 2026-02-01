import { Flex, IconButton, Input, InputGroup, InputRightElement, Tooltip } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import {
  selectFilteredModelType,
  selectSearchTerm,
  setSearchTerm,
} from 'features/modelManagerV2/store/modelManagerV2Slice';
import { t } from 'i18next';
import type { ChangeEventHandler } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { PiFoldersBold, PiXBold } from 'react-icons/pi';
import { modelConfigsAdapterSelectors, useGetModelConfigsQuery } from 'services/api/endpoints/models';
import type { AnyModelConfig, LoRAModelConfig } from 'services/api/types';

import { BaseModelTabs } from './BaseModelTabs';
import { useLoraCategoryManagerModal } from './ModelList';
import { ModelListBulkActions } from './ModelListBulkActions';
import { ModelManagerCategoryTabs } from './ModelManagerCategoryTabs';
import { ModelTypeFilter } from './ModelTypeFilter';
import { ToggleCategoryViewButton } from './ToggleCategoryViewButton';

export const ModelListNavigation = memo(() => {
  const dispatch = useAppDispatch();
  const searchTerm = useAppSelector(selectSearchTerm);
  const filteredModelType = useAppSelector(selectFilteredModelType);
  const categoryManagerModal = useLoraCategoryManagerModal();
  const { data } = useGetModelConfigsQuery();

  const isLoraFilter = filteredModelType === 'lora';

  // Get all model configs for base model tabs
  const modelConfigs = useMemo(() => {
    if (!data) {
      return [] as AnyModelConfig[];
    }
    const allConfigs = modelConfigsAdapterSelectors.selectAll(data);
    // Filter by model type if a filter is active
    if (filteredModelType) {
      if (filteredModelType === 'refiner') {
        return allConfigs.filter((m) => m.base === 'sdxl-refiner');
      }
      if (filteredModelType === 'main') {
        return allConfigs.filter((m) => m.type === 'main' && m.base !== 'sdxl-refiner');
      }
      return allConfigs.filter((m) => m.type === filteredModelType);
    }
    return allConfigs;
  }, [data, filteredModelType]);

  // Get LoRA configs for category tabs
  const loraConfigs = useMemo(() => {
    if (!data) {
      return [] as LoRAModelConfig[];
    }
    return modelConfigsAdapterSelectors.selectAll(data).filter((m) => m.type === 'lora') as LoRAModelConfig[];
  }, [data]);

  const handleOpenCategoryManager = useCallback(() => {
    categoryManagerModal.open();
  }, [categoryManagerModal]);

  const handleSearch: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      dispatch(setSearchTerm(event.target.value));
    },
    [dispatch]
  );

  const clearSearch = useCallback(() => {
    dispatch(setSearchTerm(''));
  }, [dispatch]);

  return (
    <Flex flexDirection="column" gap={2} bg="base.800" p={3} pb={2} rounded="base">
      <Flex gap={2} alignItems="center">
        <Flex alignItems="center" w="100%">
          <InputGroup>
            <Input
              placeholder={t('modelManager.search')}
              value={searchTerm || ''}
              data-testid="board-search-input"
              onChange={handleSearch}
            />

            {!!searchTerm?.length && (
              <InputRightElement h="full" pe={2}>
                <IconButton
                  size="sm"
                  variant="link"
                  aria-label={t('boards.clearSearch')}
                  icon={<PiXBold />}
                  onClick={clearSearch}
                />
              </InputRightElement>
            )}
          </InputGroup>
        </Flex>
        <Flex shrink={0}>
          <ModelTypeFilter />
        </Flex>
        <Tooltip label={t('modelManager.manageCategories')}>
          <IconButton
            aria-label={t('modelManager.manageCategories')}
            icon={<PiFoldersBold />}
            onClick={handleOpenCategoryManager}
            size="sm"
            variant="ghost"
          />
        </Tooltip>
        {isLoraFilter && <ToggleCategoryViewButton />}
      </Flex>
      <ModelListBulkActions />
      <BaseModelTabs modelConfigs={modelConfigs} />
      {isLoraFilter && <ModelManagerCategoryTabs loraConfigs={loraConfigs} />}
    </Flex>
  );
});

ModelListNavigation.displayName = 'ModelListNavigation';
