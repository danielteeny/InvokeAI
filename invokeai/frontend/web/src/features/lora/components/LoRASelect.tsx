import { Flex, FormLabel, IconButton, useToast } from '@invoke-ai/ui-library';
import { EMPTY_ARRAY } from 'app/store/constants';
import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import {
  DEFAULT_LORA_WEIGHT_CONFIG,
  loraAdded,
  lorasReplacedFromPreset,
  selectLoRAsSlice,
} from 'features/controlLayers/store/lorasSlice';
import { selectBase, selectMainModelConfig } from 'features/controlLayers/store/paramsSlice';
import type { LoRA } from 'features/controlLayers/store/types';
import { LoRAPicker } from 'features/lora/components/LoRAPicker';
import { SortLoRAsButton } from 'features/lora/components/SortLoRAsButton';
import { ToggleCategoryViewButton } from 'features/lora/components/ToggleCategoryViewButton';
import { zModelIdentifierField } from 'features/nodes/types/common';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PiBookmarkSimpleBold } from 'react-icons/pi';
import type { LoRAPresetRecordDTO } from 'services/api/endpoints/loraPresets';
import {
  useCreateLoRAPresetMutation,
  useDeleteLoRAPresetMutation,
  useListLoRAPresetsQuery,
} from 'services/api/endpoints/loraPresets';
import { useLoRAModels } from 'services/api/hooks/modelsByType';
import type { LoRAModelConfig } from 'services/api/types';
import { v4 as uuidv4 } from 'uuid';

const selectLoRAs = createMemoizedSelector(selectLoRAsSlice, ({ loras }) => loras);

const selectLoRAModelKeys = createMemoizedSelector(selectLoRAsSlice, ({ loras }) =>
  loras.map(({ model }) => model.key)
);

type PickerMode = 'lora' | 'preset';

const LoRASelect = () => {
  const dispatch = useAppDispatch();
  const [modelConfigs, { isLoading }] = useLoRAModels();
  const { t } = useTranslation();
  const toast = useToast();
  const loras = useAppSelector(selectLoRAs);
  const selectedModelKeys = useAppSelector(selectLoRAModelKeys);
  const [pickerMode, setPickerMode] = useState<PickerMode>('lora');
  const [createPreset, { isLoading: isCreating }] = useCreateLoRAPresetMutation();
  const [deletePreset] = useDeleteLoRAPresetMutation();
  const { data: presets, isLoading: isLoadingPresets } = useListLoRAPresetsQuery();

  const currentBaseModel = useAppSelector(selectBase);
  const mainModelConfig = useAppSelector(selectMainModelConfig);

  // Create a lookup map for all available LoRA models
  const modelConfigsMap = useMemo(() => {
    const map = new Map<string, LoRAModelConfig>();
    for (const config of modelConfigs) {
      map.set(config.key, config);
    }
    return map;
  }, [modelConfigs]);

  const toggleMode = useCallback(() => {
    setPickerMode((prev) => (prev === 'lora' ? 'preset' : 'lora'));
  }, []);

  const handleSavePreset = useCallback(
    async (name: string) => {
      if (loras.length === 0) {
        return;
      }
      try {
        await createPreset({
          name,
          preset_data: {
            loras: loras.map((lora) => ({
              model_key: lora.model.key,
              weight: lora.weight,
              is_enabled: lora.isEnabled,
            })),
          },
        }).unwrap();
        toast({
          title: t('lora.presetSaved'),
          description: t('lora.presetSavedDesc', { name }),
          status: 'success',
        });
      } catch (error) {
        const errorMessage =
          error && typeof error === 'object' && 'status' in error && error.status === 409
            ? t('lora.duplicatePresetName')
            : t('lora.presetSaveError');
        toast({
          title: t('lora.presetSaveError'),
          description: errorMessage,
          status: 'error',
        });
      }
    },
    [createPreset, loras, t, toast]
  );

  const handleSelectPreset = useCallback(
    (preset: LoRAPresetRecordDTO) => {
      const resolvedLoras: LoRA[] = [];
      const missingModels: string[] = [];
      const incompatibleModels: string[] = [];

      for (const item of preset.preset_data.loras) {
        const modelConfig = modelConfigsMap.get(item.model_key);
        if (modelConfig) {
          // Check base model compatibility
          if (currentBaseModel && modelConfig.base !== currentBaseModel) {
            incompatibleModels.push(modelConfig.name);
            continue; // Skip incompatible models
          }
          const parsedModel = zModelIdentifierField.parse(modelConfig);
          resolvedLoras.push({
            id: uuidv4(),
            model: parsedModel,
            weight: item.weight ?? modelConfig.default_settings?.weight ?? DEFAULT_LORA_WEIGHT_CONFIG.initial,
            isEnabled: item.is_enabled,
          });
        } else {
          missingModels.push(item.model_key);
        }
      }

      // Show warnings for missing or incompatible models
      if (missingModels.length > 0) {
        toast({
          title: t('lora.presetLoadWarning'),
          description: t('lora.someModelsNotFound', { count: missingModels.length }),
          status: 'warning',
        });
      }

      if (incompatibleModels.length > 0) {
        toast({
          title: t('lora.incompatibleModels'),
          description: t('lora.incompatibleModelsDesc', { count: incompatibleModels.length }),
          status: 'warning',
        });
      }

      if (resolvedLoras.length > 0) {
        dispatch(lorasReplacedFromPreset({ loras: resolvedLoras }));
      } else {
        toast({
          title: t('lora.presetLoadError'),
          description: t('lora.noModelsFound'),
          status: 'error',
        });
      }
    },
    [dispatch, modelConfigsMap, currentBaseModel, t, toast]
  );

  const handleDeletePreset = useCallback(
    async (presetId: string) => {
      try {
        await deletePreset(presetId).unwrap();
        toast({
          title: t('lora.presetDeleted'),
          description: t('lora.presetDeletedDesc'),
          status: 'success',
        });
      } catch {
        toast({
          title: t('lora.presetDeleteError'),
          description: t('lora.presetDeleteError'),
          status: 'error',
        });
      }
    },
    [deletePreset, t, toast]
  );

  // Filter to only show compatible LoRAs
  const compatibleLoRAs = useMemo(() => {
    if (!currentBaseModel) {
      return EMPTY_ARRAY;
    }
    return modelConfigs.filter((lora) => {
      // Base must match
      if (lora.base !== currentBaseModel) {
        return false;
      }
      // For Flux2, check variant compatibility
      // Note: currentBaseModel and lora.base are typed as string unions; use string comparison
      if ((currentBaseModel as string) === 'flux2' && mainModelConfig && 'variant' in mainModelConfig) {
        const mainVariant = mainModelConfig.variant as string | null | undefined;
        const loraVariant = 'variant' in lora ? (lora.variant as string | null | undefined) : null;
        // If LoRA has known variant, it must match (or be 9B compatible)
        if (loraVariant && mainVariant) {
          if (mainVariant === 'klein_4b' && loraVariant !== 'klein_4b') {
            return false;
          }
          if ((mainVariant === 'klein_9b' || mainVariant === 'klein_9b_base') && loraVariant === 'klein_4b') {
            return false;
          }
        }
      }
      return true;
    });
  }, [modelConfigs, currentBaseModel, mainModelConfig]);

  const getIsDisabled = useCallback(
    (model: LoRAModelConfig): boolean => {
      const isAdded = loras.some((l) => l.model.key === model.key);
      return isAdded;
    },
    [loras]
  );

  const onChange = useCallback(
    (model: LoRAModelConfig | null) => {
      if (!model) {
        return;
      }
      dispatch(loraAdded({ model }));
    },
    [dispatch]
  );

  const placeholder = useMemo(() => {
    if (isLoading) {
      return t('common.loading');
    }

    if (compatibleLoRAs.length === 0) {
      return currentBaseModel ? t('models.noCompatibleLoRAs') : t('models.selectModel');
    }

    return t('models.addLora');
  }, [isLoading, compatibleLoRAs.length, currentBaseModel, t]);

  return (
    <Flex flexDir="column" gap={2}>
      <Flex alignItems="center" gap={2}>
        <InformationalPopover feature="lora">
          <FormLabel>{t('models.concepts')}</FormLabel>
        </InformationalPopover>
        <LoRAPicker
          pickerId="lora-select"
          mode={pickerMode}
          modelConfigs={compatibleLoRAs}
          selectedModelKeys={selectedModelKeys}
          onChange={onChange}
          placeholder={placeholder}
          getIsOptionDisabled={getIsDisabled}
          noOptionsText={currentBaseModel ? t('models.noCompatibleLoRAs') : t('models.selectModel')}
          presets={presets}
          isLoadingPresets={isLoadingPresets}
          onSelectPreset={handleSelectPreset}
          onDeletePreset={handleDeletePreset}
          onSavePreset={handleSavePreset}
          canSavePreset={loras.length > 0}
          isSavingPreset={isCreating}
        />
        <IconButton
          size="sm"
          variant={pickerMode === 'preset' ? 'solid' : 'ghost'}
          onClick={toggleMode}
          tooltip={pickerMode === 'lora' ? t('lora.savedPresets') : t('models.addLora')}
          aria-label={pickerMode === 'lora' ? t('lora.savedPresets') : t('models.addLora')}
          icon={<PiBookmarkSimpleBold />}
        />
        <SortLoRAsButton />
        <ToggleCategoryViewButton />
      </Flex>
    </Flex>
  );
};

export default memo(LoRASelect);
