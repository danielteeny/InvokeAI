import type { BoxProps, ButtonProps, SystemStyleObject } from '@invoke-ai/ui-library';
import {
  Button,
  Flex,
  Icon,
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
import { memo, useCallback, useMemo, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { PiCaretDownBold, PiLinkSimple } from 'react-icons/pi';
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
  modelConfigs: LoRAModelConfig[];
  selectedModelKeys: string[];
  onChange: (modelConfig: LoRAModelConfig) => void;
  getIsOptionDisabled?: (model: LoRAModelConfig) => boolean;
  placeholder?: string;
  isDisabled?: boolean;
  noOptionsText?: string;
};

export const LoRAPicker = typedMemo(
  ({
    pickerId,
    modelConfigs,
    selectedModelKeys,
    onChange,
    getIsOptionDisabled,
    placeholder,
    isDisabled,
    noOptionsText,
  }: LoRAPickerProps) => {
    const { t } = useTranslation();
    const categoryViewEnabled = useAppSelector(selectLoraCategoryViewEnabled);

    const { relatedModelKeys } = useGetRelatedModelIdsBatchQuery(selectedModelKeys, {
      ...relatedModelKeysQueryOptions,
    });

    const options = useMemo<
      WithStarred<LoRAModelConfig>[] | Group<WithStarred<LoRAModelConfig>>[]
    >(() => {
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
          group = buildGroup<WithStarred<LoRAModelConfig>>({
            id: categoryId,
            name: LORA_CATEGORY_TO_NAME[categoryId] ?? categoryId,
            shortName: (LORA_CATEGORY_TO_NAME[categoryId] ?? categoryId).slice(0, 4),
            color: `${LORA_CATEGORY_TO_COLOR[categoryId] ?? 'base'}.300`,
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
    }, [categoryViewEnabled, modelConfigs, relatedModelKeys, t]);

    const popover = useDisclosure(false);
    const pickerRef = useRef<PickerContextState<WithStarred<LoRAModelConfig>>>(null);

    const onClose = useCallback(() => {
      popover.close();
      pickerRef.current?.$searchTerm.set('');
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

    return (
      <Popover
        isOpen={popover.isOpen}
        onOpen={popover.open}
        onClose={onClose}
        initialFocusRef={pickerRef.current?.inputRef}
        modifiers={popperModifiers}
      >
        <PopoverTrigger>
          <Button size="sm" flexGrow={1} variant="outline" isDisabled={isDisabled}>
            {placeholder ?? 'Select LoRA'}
            <Spacer />
            <PiCaretDownBold />
          </Button>
        </PopoverTrigger>
        <Portal appendToParentPortal={false}>
          <PopoverContent p={0} w={400} h={400}>
            <PopoverArrow />
            <PopoverBody p={0} w="full" h="full" borderWidth={1} borderColor="base.700" borderRadius="base">
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
            </PopoverBody>
          </PopoverContent>
        </Portal>
      </Popover>
    );
  }
);
LoRAPicker.displayName = 'LoRAPicker';

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

const PickerOptionComponent = typedMemo(
  ({ option, ...rest }: { option: WithStarred<LoRAModelConfig> } & BoxProps) => {
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
  }
);
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
