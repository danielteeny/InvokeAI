import { Flex, FormLabel } from '@invoke-ai/ui-library';
import { EMPTY_ARRAY } from 'app/store/constants';
import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import { loraAdded, selectLoRAsSlice } from 'features/controlLayers/store/lorasSlice';
import { selectBase } from 'features/controlLayers/store/paramsSlice';
import { LoRAPicker } from 'features/lora/components/LoRAPicker';
import { SortLoRAsButton } from 'features/lora/components/SortLoRAsButton';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLoRAModels } from 'services/api/hooks/modelsByType';
import type { LoRAModelConfig } from 'services/api/types';

const selectLoRAIds = createMemoizedSelector(selectLoRAsSlice, ({ loras }) => loras.map(({ id }) => id));

const selectLoRAs = createMemoizedSelector(selectLoRAsSlice, ({ loras }) => loras);

const selectLoRAModelKeys = createMemoizedSelector(selectLoRAsSlice, ({ loras }) =>
  loras.map(({ model }) => model.key)
);

const LoRASelect = () => {
  const dispatch = useAppDispatch();
  const [modelConfigs, { isLoading }] = useLoRAModels();
  const { t } = useTranslation();
  const addedLoRAIds = useAppSelector(selectLoRAIds);
  const loras = useAppSelector(selectLoRAs);
  const selectedModelKeys = useAppSelector(selectLoRAModelKeys);

  const currentBaseModel = useAppSelector(selectBase);

  // Filter to only show compatible LoRAs
  const compatibleLoRAs = useMemo(() => {
    if (!currentBaseModel) {
      return EMPTY_ARRAY;
    }
    return modelConfigs.filter((model) => model.base === currentBaseModel);
  }, [modelConfigs, currentBaseModel]);

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
          modelConfigs={compatibleLoRAs}
          selectedModelKeys={selectedModelKeys}
          onChange={onChange}
          placeholder={placeholder}
          getIsOptionDisabled={getIsDisabled}
          noOptionsText={currentBaseModel ? t('models.noCompatibleLoRAs') : t('models.selectModel')}
        />
        <SortLoRAsButton loraIds={addedLoRAIds} />
      </Flex>
    </Flex>
  );
};

export default memo(LoRASelect);
