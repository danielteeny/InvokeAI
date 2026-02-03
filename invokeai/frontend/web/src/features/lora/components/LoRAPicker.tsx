import type { BoxProps, ButtonProps, SystemStyleObject } from '@invoke-ai/ui-library';
import {
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  Icon,
  IconButton,
  Input,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Spacer,
  Text,
} from '@invoke-ai/ui-library';
import { EMPTY_ARRAY } from 'app/store/constants';
import { useAppSelector } from 'app/store/storeHooks';
import type { Group, PickerContextState } from 'common/components/Picker/Picker';
import { buildGroup, getRegex, Picker, usePickerContext } from 'common/components/Picker/Picker';
import { useDisclosure } from 'common/hooks/useBoolean';
import { typedMemo } from 'common/util/typedMemo';
import { selectLoraCategoryViewEnabled } from 'features/controlLayers/store/lorasSlice';
import { ToggleCategoryViewButton } from 'features/lora/components/ToggleCategoryViewButton';
import { LORA_CATEGORIES_ORDER, LORA_CATEGORY_TO_COLOR, LORA_CATEGORY_TO_NAME } from 'features/modelManagerV2/models';
import { setInstallModelsTabByName } from 'features/modelManagerV2/store/installModelsStore';
import ModelImage from 'features/modelManagerV2/subpanels/ModelManagerPanel/ModelImage';
import { NavigateToModelManagerButton } from 'features/parameters/components/MainModel/NavigateToModelManagerButton';
import { navigationApi } from 'features/ui/layouts/navigation-api';
import { filesize } from 'filesize';
import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { PiCaretDownBold, PiFloppyDiskBold, PiLinkSimple, PiTrashSimpleBold, PiXBold } from 'react-icons/pi';
import { useListLoraCategoriesQuery } from 'services/api/endpoints/loraCategories';
import type { LoRAPresetRecordDTO } from 'services/api/endpoints/loraPresets';
import { useGetRelatedModelIdsBatchQuery } from 'services/api/endpoints/modelRelationships';
import type { LoRAModelConfig } from 'services/api/types';

type WithStarred<T> = T & { starred?: boolean };

const getOptionId = (modelConfig: WithStarred<LoRAModelConfig>) => modelConfig.key;

const ModelManagerLink = memo((props: ButtonProps) => {
  const onClick = useCallback(() => {
    navigationApi.switchToTab('models');
    setInstallModelsTabByName('launchpad');
  }, []);

  return <Button size="sm" flexGrow={0} variant="link" color="base.200" onClick={onClick} {...props} />;
});
ModelManagerLink.displayName = 'ModelManagerLink';

const components = {
  LinkComponent: <ModelManagerLink />,
};

const NoOptionsFallback = memo(({ noOptionsText }: { noOptionsText?: string }) => {
  const { t } = useTranslation();

  return (
    <Flex flexDir="column" gap={4} alignItems="center">
      <Text color="base.200">{noOptionsText ?? t('modelManager.modelPickerFallbackNoModelsInstalled')}</Text>
      <Text color="base.200">
        <Trans i18nKey="modelManager.modelPickerFallbackNoModelsInstalled2" components={components} />
      </Text>
    </Flex>
  );
});
NoOptionsFallback.displayName = 'NoOptionsFallback';

const relatedModelKeysQueryOptions = {
  selectFromResult: ({ data }) => {
    if (!data) {
      return { relatedModelKeys: EMPTY_ARRAY };
    }
    return { relatedModelKeys: data };
  },
} satisfies Parameters<typeof useGetRelatedModelIdsBatchQuery>[1];

const popperModifiers = [
  {
    name: 'preventOverflow',
    options: { padding: 16 },
  },
];

const removeStarred = <T,>(obj: WithStarred<T>): T => {
  const { starred: _, ...rest } = obj;
  return rest as T;
};

type LoRAPickerProps = {
  pickerId: string;
  mode: 'lora' | 'preset';
  // LoRA mode props
  modelConfigs: LoRAModelConfig[];
  selectedModelKeys: string[];
  onChange: (modelConfig: LoRAModelConfig) => void;
  getIsOptionDisabled?: (model: LoRAModelConfig) => boolean;
  placeholder?: string;
  isDisabled?: boolean;
  noOptionsText?: string;
  // Preset mode props
  presets?: LoRAPresetRecordDTO[];
  isLoadingPresets?: boolean;
  onSelectPreset?: (preset: LoRAPresetRecordDTO) => void;
  onDeletePreset?: (presetId: string) => Promise<void>;
  onSavePreset?: (name: string) => void;
  canSavePreset?: boolean;
  isSavingPreset?: boolean;
};

export const LoRAPicker = typedMemo(
  ({
    pickerId,
    mode,
    modelConfigs,
    selectedModelKeys,
    onChange,
    getIsOptionDisabled,
    placeholder,
    isDisabled,
    noOptionsText,
    presets,
    isLoadingPresets,
    onSelectPreset,
    onDeletePreset,
    onSavePreset,
    canSavePreset,
    isSavingPreset,
  }: LoRAPickerProps) => {
    const { t } = useTranslation();
    const categoryViewEnabled = useAppSelector(selectLoraCategoryViewEnabled);
    const [presetName, setPresetName] = useState('');

    const { relatedModelKeys } = useGetRelatedModelIdsBatchQuery(selectedModelKeys, {
      ...relatedModelKeysQueryOptions,
    });

    const { data: apiCategories } = useListLoraCategoriesQuery();

    // Build a lookup map for category info (API categories + hardcoded fallbacks)
    const categoryInfoMap = useMemo(() => {
      const map: Record<string, { name: string; color: string }> = {};
      // Add API categories first (includes both defaults and custom)
      if (apiCategories) {
        for (const cat of apiCategories) {
          map[cat.id] = { name: cat.name, color: cat.color };
        }
      }
      // Add hardcoded as fallback for any missing
      for (const [id, name] of Object.entries(LORA_CATEGORY_TO_NAME)) {
        if (!map[id]) {
          map[id] = { name, color: LORA_CATEGORY_TO_COLOR[id] ?? '#9E9E9E' };
        }
      }
      return map;
    }, [apiCategories]);

    const options = useMemo<WithStarred<LoRAModelConfig>[] | Group<WithStarred<LoRAModelConfig>>[]>(() => {
      // Add starred field to all models
      const modelsWithStarred = modelConfigs.map((model) => ({
        ...model,
        starred: relatedModelKeys.includes(model.key),
      })) as WithStarred<LoRAModelConfig>[];

      if (!categoryViewEnabled) {
        // Flat list, sorted with starred models first
        return modelsWithStarred.sort((a, b) => {
          if (a.starred && !b.starred) {
            return -1;
          }
          if (!a.starred && b.starred) {
            return 1;
          }
          return 0;
        });
      }

      // Group by category
      const groups: Record<string, Group<WithStarred<LoRAModelConfig>>> = {};

      for (const model of modelsWithStarred) {
        const categoryId = model.category ?? 'uncategorized';
        let group = groups[categoryId];
        if (!group) {
          // If category not found in API or hardcoded, show "Unknown" instead of raw UUID
          const catInfo = categoryInfoMap[categoryId] ?? { name: 'Unknown', color: '#9E9E9E' };
          group = buildGroup<WithStarred<LoRAModelConfig>>({
            id: categoryId,
            name: catInfo.name,
            shortName: catInfo.name,
            color: catInfo.color,
            getOptionCountString: (count) => t('common.model_withCount', { count }),
            options: [],
          });
          groups[categoryId] = group;
        }
        group.options.push(model);
      }

      // Sort options within each group (starred first)
      for (const group of Object.values(groups)) {
        group.options.sort((a, b) => {
          if (a.starred && !b.starred) {
            return -1;
          }
          if (!a.starred && b.starred) {
            return 1;
          }
          return 0;
        });
      }

      // Return groups in preferred order (LORA_CATEGORIES_ORDER)
      const orderedGroups: Group<WithStarred<LoRAModelConfig>>[] = [];
      for (const categoryId of LORA_CATEGORIES_ORDER) {
        const group = groups[categoryId];
        if (group && group.options.length > 0) {
          orderedGroups.push(group);
          delete groups[categoryId];
        }
      }
      // Add any remaining groups not in the order list
      for (const group of Object.values(groups)) {
        if (group.options.length > 0) {
          orderedGroups.push(group);
        }
      }

      return orderedGroups;
    }, [categoryViewEnabled, categoryInfoMap, modelConfigs, relatedModelKeys, t]);

    const popover = useDisclosure(false);
    const pickerRef = useRef<PickerContextState<WithStarred<LoRAModelConfig>>>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const onClose = useCallback(() => {
      popover.close();
      pickerRef.current?.$searchTerm.set('');
      setPresetName('');
    }, [popover]);

    const onSelect = useCallback(
      (model: WithStarred<LoRAModelConfig>) => {
        onClose();
        onChange(removeStarred(model));
      },
      [onChange, onClose]
    );

    const getIsDisabled = useCallback(
      (model: WithStarred<LoRAModelConfig>) => {
        return getIsOptionDisabled?.(model) ?? false;
      },
      [getIsOptionDisabled]
    );

    const NextToSearchBarContent = useMemo(
      () => (
        <Flex gap={1}>
          <ToggleCategoryViewButton />
          <NavigateToModelManagerButton />
        </Flex>
      ),
      []
    );

    const MAX_PRESET_NAME_LENGTH = 100;

    // Preset mode handlers
    const handlePresetNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      setPresetName(e.target.value);
    }, []);

    const presetNameError = useMemo(() => {
      const trimmed = presetName.trim();
      if (trimmed.length > MAX_PRESET_NAME_LENGTH) {
        return t('lora.nameTooLong', { max: MAX_PRESET_NAME_LENGTH });
      }
      return null;
    }, [presetName, t]);

    const isPresetNameValid = presetName.trim().length > 0 && presetName.trim().length <= MAX_PRESET_NAME_LENGTH;

    const handleSavePreset = useCallback(() => {
      if (!isPresetNameValid || !onSavePreset) {
        return;
      }
      onSavePreset(presetName.trim());
      setPresetName('');
    }, [onSavePreset, presetName, isPresetNameValid]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleSavePreset();
        }
      },
      [handleSavePreset]
    );

    const handleSelectPreset = useCallback(
      (preset: LoRAPresetRecordDTO) => {
        onSelectPreset?.(preset);
        onClose();
      },
      [onSelectPreset, onClose]
    );

    const handleDeletePreset = useCallback(
      async (presetId: string) => {
        await onDeletePreset?.(presetId);
      },
      [onDeletePreset]
    );

    const buttonPlaceholder = mode === 'lora' ? (placeholder ?? t('models.addLora')) : t('lora.presets');

    return (
      <Popover
        isOpen={popover.isOpen}
        onOpen={popover.open}
        onClose={onClose}
        initialFocusRef={mode === 'lora' ? pickerRef.current?.inputRef : inputRef}
        modifiers={popperModifiers}
      >
        <PopoverTrigger>
          <Button size="sm" flexGrow={1} variant="outline" isDisabled={isDisabled}>
            {buttonPlaceholder}
            <Spacer />
            <PiCaretDownBold />
          </Button>
        </PopoverTrigger>
        <Portal appendToParentPortal={false}>
          <PopoverContent p={0} w={400} h={400}>
            <PopoverArrow />
            <PopoverBody p={0} w="full" h="full" borderWidth={1} borderColor="base.700" borderRadius="base">
              {mode === 'lora' ? (
                <Picker<WithStarred<LoRAModelConfig>>
                  pickerId={pickerId}
                  handleRef={pickerRef}
                  optionsOrGroups={options}
                  getOptionId={getOptionId}
                  onSelect={onSelect}
                  selectedOption={undefined}
                  isMatch={isMatch}
                  OptionComponent={PickerOptionComponent}
                  noOptionsFallback={<NoOptionsFallback noOptionsText={noOptionsText} />}
                  noMatchesFallback={t('modelManager.noMatchingModels')}
                  NextToSearchBar={NextToSearchBarContent}
                  getIsOptionDisabled={getIsDisabled}
                  searchable
                />
              ) : (
                <Flex flexDir="column" h="full">
                  {/* Save preset input */}
                  <Flex p={2} gap={2} borderBottomWidth={1} borderColor="base.700" flexDir="column">
                    <Flex gap={2}>
                      <FormControl isInvalid={!!presetNameError} flex={1}>
                        <Input
                          ref={inputRef}
                          value={presetName}
                          onChange={handlePresetNameChange}
                          onKeyDown={handleKeyDown}
                          placeholder={t('lora.presetNamePlaceholder')}
                          size="sm"
                          maxLength={MAX_PRESET_NAME_LENGTH + 1}
                        />
                        {presetNameError && <FormErrorMessage>{presetNameError}</FormErrorMessage>}
                      </FormControl>
                      <IconButton
                        size="sm"
                        onClick={handleSavePreset}
                        isLoading={isSavingPreset}
                        isDisabled={!isPresetNameValid || !canSavePreset}
                        tooltip={canSavePreset ? t('lora.savePreset') : t('lora.noLoRAsToSave')}
                        aria-label={t('lora.savePreset')}
                        icon={<PiFloppyDiskBold />}
                        colorScheme="invokeGreen"
                      />
                    </Flex>
                  </Flex>
                  {/* Presets list */}
                  <Flex flexDir="column" flex={1} overflowY="auto" p={2} gap={1}>
                    {isLoadingPresets ? (
                      <Flex flex={1} alignItems="center" justifyContent="center">
                        <Text color="base.400">{t('common.loading')}</Text>
                      </Flex>
                    ) : presets && presets.length > 0 ? (
                      presets.map((preset) => (
                        <PresetItem
                          key={preset.id}
                          preset={preset}
                          onSelect={handleSelectPreset}
                          onDelete={handleDeletePreset}
                        />
                      ))
                    ) : (
                      <Flex flex={1} alignItems="center" justifyContent="center">
                        <Text color="base.400">{t('lora.noPresets')}</Text>
                      </Flex>
                    )}
                  </Flex>
                </Flex>
              )}
            </PopoverBody>
          </PopoverContent>
        </Portal>
      </Popover>
    );
  }
);
LoRAPicker.displayName = 'LoRAPicker';

// Preset item component
type PresetItemProps = {
  preset: LoRAPresetRecordDTO;
  onSelect: (preset: LoRAPresetRecordDTO) => void;
  onDelete: (presetId: string) => Promise<void>;
  isDeleting?: boolean;
};

const presetItemSx: SystemStyleObject = {
  p: 2,
  cursor: 'pointer',
  borderRadius: 'base',
  '&:hover': {
    bg: 'base.750',
  },
};

const PresetItem = memo(({ preset, onSelect, onDelete, isDeleting }: PresetItemProps) => {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleClick = useCallback(() => {
    if (confirmDelete) {
      return;
    }
    onSelect(preset);
  }, [onSelect, preset, confirmDelete]);

  const handleDeleteClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (confirmDelete) {
        onDelete(preset.id);
        setConfirmDelete(false);
      } else {
        setConfirmDelete(true);
      }
    },
    [onDelete, preset.id, confirmDelete]
  );

  const handleCancelDelete = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(false);
  }, []);

  return (
    <Flex sx={presetItemSx} onClick={handleClick} justifyContent="space-between" alignItems="center" gap={2}>
      <Text fontSize="sm" noOfLines={1} flex={1}>
        {preset.name}
      </Text>
      {confirmDelete ? (
        <Flex gap={1}>
          <IconButton
            size="xs"
            variant="ghost"
            onClick={handleCancelDelete}
            tooltip={t('common.cancel')}
            aria-label={t('common.cancel')}
            icon={<PiXBold />}
          />
          <IconButton
            size="xs"
            variant="solid"
            colorScheme="error"
            onClick={handleDeleteClick}
            isLoading={isDeleting}
            tooltip={t('lora.confirmDeletePreset')}
            aria-label={t('lora.confirmDeletePreset')}
            icon={<PiTrashSimpleBold />}
          />
        </Flex>
      ) : (
        <IconButton
          size="xs"
          variant="ghost"
          colorScheme="error"
          onClick={handleDeleteClick}
          tooltip={t('lora.deletePreset')}
          aria-label={t('lora.deletePreset')}
          icon={<PiTrashSimpleBold />}
        />
      )}
    </Flex>
  );
});
PresetItem.displayName = 'PresetItem';

const optionSx: SystemStyleObject = {
  p: 2,
  gap: 2,
  cursor: 'pointer',
  borderRadius: 'base',
  '&[data-selected="true"]': {
    bg: 'invokeBlue.300',
    color: 'base.900',
    '.extra-info': {
      color: 'base.700',
    },
    '.picker-option': {
      fontWeight: 'bold',
      '&[data-is-compact="true"]': {
        fontWeight: 'semibold',
      },
    },
    '&[data-active="true"]': {
      bg: 'invokeBlue.250',
    },
  },
  '&[data-active="true"]': {
    bg: 'base.750',
  },
  '&[data-disabled="true"]': {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  '&[data-is-compact="true"]': {
    px: 1,
    py: 0.5,
  },
  scrollMarginTop: '24px',
};

const optionNameSx: SystemStyleObject = {
  fontSize: 'sm',
  noOfLines: 1,
  fontWeight: 'semibold',
  '&[data-is-compact="true"]': {
    fontWeight: 'normal',
  },
};

const PickerOptionComponent = typedMemo(({ option, ...rest }: { option: WithStarred<LoRAModelConfig> } & BoxProps) => {
  const { isCompactView } = usePickerContext<WithStarred<LoRAModelConfig>>();

  return (
    <Flex {...rest} sx={optionSx} data-is-compact={isCompactView}>
      {!isCompactView && option.cover_image && <ModelImage image_url={option.cover_image} />}
      <Flex flexDir="column" gap={1} flex={1}>
        <Flex gap={2} alignItems="center">
          {option.starred && <Icon as={PiLinkSimple} color="invokeYellow.500" boxSize={4} />}
          <Text className="picker-option" sx={optionNameSx} data-is-compact={isCompactView}>
            {option.name}
          </Text>
          <Spacer />
          {option.file_size > 0 && (
            <Text
              className="extra-info"
              variant="subtext"
              fontStyle="italic"
              noOfLines={1}
              flexShrink={0}
              overflow="visible"
            >
              {filesize(option.file_size)}
            </Text>
          )}
        </Flex>
        {option.description && !isCompactView && (
          <Text className="extra-info" color="base.200">
            {option.description}
          </Text>
        )}
      </Flex>
    </Flex>
  );
});
PickerOptionComponent.displayName = 'PickerOptionComponent';

const isMatch = (model: WithStarred<LoRAModelConfig>, searchTerm: string) => {
  const regex = getRegex(searchTerm);
  const category = model.category ?? 'uncategorized';
  const categoryName = LORA_CATEGORY_TO_NAME[category] ?? category;
  const testString =
    `${model.name} ${model.base} ${model.type} ${model.description ?? ''} ${model.format} ${categoryName}`.toLowerCase();

  if (testString.includes(searchTerm) || regex.test(testString)) {
    return true;
  }

  return false;
};
