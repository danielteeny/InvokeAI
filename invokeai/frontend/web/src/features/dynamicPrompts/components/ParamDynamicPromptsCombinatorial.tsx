import { Checkbox, Flex, FormControl, FormLabel, IconButton, Tooltip } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import {
  combinatorialChanged,
  dynamicPromptsShuffled,
  selectDynamicPromptsCombinatorial,
  selectDynamicPromptsIsLoading,
} from 'features/dynamicPrompts/store/dynamicPromptsSlice';
import type { ChangeEvent } from 'react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiDiceFiveBold } from 'react-icons/pi';

const ParamDynamicPromptsCombinatorial = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const combinatorial = useAppSelector(selectDynamicPromptsCombinatorial);
  const isLoading = useAppSelector(selectDynamicPromptsIsLoading);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dispatch(combinatorialChanged(e.target.checked));
    },
    [dispatch]
  );

  const handleShuffle = useCallback(() => {
    dispatch(dynamicPromptsShuffled());
  }, [dispatch]);

  return (
    <FormControl w="min-content">
      <InformationalPopover feature="dynamicPromptsCombinatorial" inPortal={false}>
        <FormLabel m={0}>{t('dynamicPrompts.combinatorial')}</FormLabel>
      </InformationalPopover>
      <Flex gap={2} alignItems="center">
        <Checkbox isChecked={combinatorial} onChange={handleChange} />
        <Tooltip label={t('dynamicPrompts.shuffle')}>
          <IconButton
            aria-label={t('dynamicPrompts.shuffle')}
            icon={<PiDiceFiveBold />}
            size="sm"
            variant="ghost"
            onClick={handleShuffle}
            isDisabled={combinatorial || isLoading}
          />
        </Tooltip>
      </Flex>
    </FormControl>
  );
};

export default memo(ParamDynamicPromptsCombinatorial);
