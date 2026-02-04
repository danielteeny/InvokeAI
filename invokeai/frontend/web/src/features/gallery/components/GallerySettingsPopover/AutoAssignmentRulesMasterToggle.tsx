import { Checkbox, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { selectAutoAssignmentRulesMasterEnabled } from 'features/gallery/store/gallerySelectors';
import { autoAssignmentRulesMasterEnabledChanged } from 'features/gallery/store/gallerySlice';
import type { ChangeEvent } from 'react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const AutoAssignmentRulesMasterToggle = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const autoAssignmentRulesMasterEnabled = useAppSelector(selectAutoAssignmentRulesMasterEnabled);

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dispatch(autoAssignmentRulesMasterEnabledChanged(e.target.checked));
    },
    [dispatch]
  );

  return (
    <FormControl>
      <FormLabel flexGrow={1}>{t('boards.autoAssignmentRulesEnabled')}</FormLabel>
      <Checkbox isChecked={autoAssignmentRulesMasterEnabled} onChange={onChange} />
    </FormControl>
  );
};

export default memo(AutoAssignmentRulesMasterToggle);
