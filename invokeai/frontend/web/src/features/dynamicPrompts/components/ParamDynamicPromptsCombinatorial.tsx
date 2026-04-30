import { Checkbox, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import {
  combinatorialChanged,
  selectDynamicPromptsCombinatorial,
} from 'features/dynamicPrompts/store/dynamicPromptsSlice';
import type { ChangeEvent } from 'react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const ParamDynamicPromptsCombinatorial = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const combinatorial = useAppSelector(selectDynamicPromptsCombinatorial);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dispatch(combinatorialChanged(e.target.checked));
    },
    [dispatch]
  );

  return (
    <FormControl w="min-content">
      <InformationalPopover feature="dynamicPromptsCombinatorial" inPortal={false}>
        <FormLabel m={0}>{t('dynamicPrompts.combinatorial')}</FormLabel>
      </InformationalPopover>
      <Checkbox isChecked={combinatorial} onChange={handleChange} />
    </FormControl>
  );
};

export default memo(ParamDynamicPromptsCombinatorial);
