import type { ComboboxOnChange, ComboboxOption } from '@invoke-ai/ui-library';
import {
  Button,
  Checkbox,
  Combobox,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Tooltip,
} from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import ScrollableContent from 'common/components/OverlayScrollbars/ScrollableContent';
import { useInstallModel } from 'features/modelManagerV2/hooks/useInstallModel';
import {
  selectShouldInstallInPlace,
  shouldInstallInPlaceChanged,
} from 'features/modelManagerV2/store/modelManagerV2Slice';
import type { ChangeEvent, ChangeEventHandler } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PiXBold } from 'react-icons/pi';
import { useListLoraCategoriesQuery } from 'services/api/endpoints/loraCategories';
import type { ScanFolderResponse } from 'services/api/endpoints/models';

import { ScanModelResultItem } from './ScanFolderResultItem';
import type { ScanFolderSortMode } from './scanFolderResultsUtils';
import { filterAndSortScanResults } from './scanFolderResultsUtils';

type ScanModelResultsProps = {
  results: ScanFolderResponse;
};

export const ScanModelsResults = memo(({ results }: ScanModelResultsProps) => {
  const inplace = useAppSelector(selectShouldInstallInPlace);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<ScanFolderSortMode>('name_asc');
  const [installModel] = useInstallModel();
  const { data: loraCategories } = useListLoraCategoriesQuery();

  const sortOptions = useMemo<ComboboxOption[]>(
    () => [
      { label: t('modelManager.scanSortNameAZ'), value: 'name_asc' },
      { label: t('modelManager.scanSortNameZA'), value: 'name_desc' },
      { label: t('modelManager.scanSortDateNewest'), value: 'modified_desc' },
      { label: t('modelManager.scanSortDateOldest'), value: 'modified_asc' },
    ],
    [t]
  );

  const categoryOptions = useMemo<ComboboxOption[]>(() => {
    const options: ComboboxOption[] = [{ label: t('modelManager.scanCategoryUncategorized'), value: '' }];
    if (loraCategories) {
      options.push(
        ...loraCategories.map((category) => ({
          label: category.name,
          value: category.id,
        }))
      );
    }
    return options;
  }, [loraCategories, t]);

  const selectedSortOption = useMemo(
    () => sortOptions.find((option) => option.value === sortMode),
    [sortMode, sortOptions]
  );

  const selectedCategoryOption = useMemo(
    () => categoryOptions.find((option) => option.value === (selectedCategory ?? '')),
    [categoryOptions, selectedCategory]
  );

  const filteredResults = useMemo(
    () => filterAndSortScanResults(results, searchTerm, sortMode),
    [results, searchTerm, sortMode]
  );

  const handleSearch: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const onChangeSort = useCallback<ComboboxOnChange>((option) => {
    if (!option) {
      return;
    }
    setSortMode(option.value as ScanFolderSortMode);
  }, []);

  const onChangeCategory = useCallback<ComboboxOnChange>((option) => {
    setSelectedCategory(option?.value || null);
  }, []);

  const onChangeInplace = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dispatch(shouldInstallInPlaceChanged(e.target.checked));
    },
    [dispatch]
  );

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const installConfig = useMemo(
    () => (selectedCategory ? { category: selectedCategory } : undefined),
    [selectedCategory]
  );

  const handleAddAll = useCallback(() => {
    for (const result of filteredResults) {
      if (result.is_installed) {
        continue;
      }
      installModel({ source: result.path, inplace, config: installConfig });
    }
  }, [filteredResults, inplace, installConfig, installModel]);

  const handleInstallOne = useCallback(
    (source: string) => {
      installModel({ source, inplace, config: installConfig });
    },
    [inplace, installConfig, installModel]
  );

  return (
    <>
      <Divider />
      <Flex flexDir="column" gap={3} height="100%">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading size="sm">{t('modelManager.scanResults')}</Heading>
          <Flex alignItems="center" gap={3} flexWrap="wrap">
            <FormControl w={52}>
              <FormLabel m={0}>{t('modelManager.category')}</FormLabel>
              <Combobox
                value={selectedCategoryOption}
                options={categoryOptions}
                onChange={onChangeCategory}
                size="sm"
                isSearchable={false}
                isClearable={false}
              />
            </FormControl>
            <FormControl w={56}>
              <FormLabel m={0}>{t('modelManager.scanSort')}</FormLabel>
              <Combobox
                value={selectedSortOption}
                options={sortOptions}
                onChange={onChangeSort}
                size="sm"
                isSearchable={false}
                isClearable={false}
              />
            </FormControl>
            <Tooltip label={t('modelManager.inplaceInstallDesc')} hasArrow>
              <FormControl w="min-content">
                <FormLabel m={0}>{t('modelManager.inplaceInstall')}</FormLabel>
                <Checkbox isChecked={inplace} onChange={onChangeInplace} size="md" />
              </FormControl>
            </Tooltip>
            <Button size="sm" onClick={handleAddAll} isDisabled={filteredResults.length === 0}>
              {t('modelManager.installAll')}
            </Button>
            <InputGroup w={64} size="xs">
              <Input
                placeholder={t('modelManager.search')}
                value={searchTerm}
                data-testid="board-search-input"
                onChange={handleSearch}
                size="xs"
              />

              {searchTerm && (
                <InputRightElement h="full" pe={2}>
                  <IconButton
                    size="sm"
                    variant="link"
                    aria-label={t('boards.clearSearch')}
                    icon={<PiXBold />}
                    onClick={clearSearch}
                    flexShrink={0}
                  />
                </InputRightElement>
              )}
            </InputGroup>
          </Flex>
        </Flex>
        <Flex height="100%" layerStyle="second" borderRadius="base" px={2}>
          <ScrollableContent>
            <Flex flexDir="column">
              {filteredResults.map((result) => (
                <ScanModelResultItem key={result.path} result={result} installModel={handleInstallOne} />
              ))}
            </Flex>
          </ScrollableContent>
        </Flex>
      </Flex>
    </>
  );
});

ScanModelsResults.displayName = 'ScanModelsResults';
