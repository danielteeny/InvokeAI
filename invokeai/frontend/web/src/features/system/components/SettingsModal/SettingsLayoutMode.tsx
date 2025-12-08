import type { ComboboxOnChange } from '@invoke-ai/ui-library';
import { Combobox, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { selectLayoutMode } from 'features/ui/store/uiSelectors';
import { setLayoutMode } from 'features/ui/store/uiSlice';
import type { LayoutMode } from 'features/ui/store/uiTypes';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const isLayoutMode = (v: unknown): v is LayoutMode => {
  return v === 'auto' || v === 'horizontal' || v === 'vertical';
};

export const SettingsLayoutMode = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const layoutMode = useAppSelector(selectLayoutMode);

  const options = useMemo(
    () => [
      { label: t('settings.layoutMode.auto'), value: 'auto' as LayoutMode },
      { label: t('settings.layoutMode.horizontal'), value: 'horizontal' as LayoutMode },
      { label: t('settings.layoutMode.vertical'), value: 'vertical' as LayoutMode },
    ],
    [t]
  );

  const value = useMemo(() => options.find((o) => o.value === layoutMode), [layoutMode, options]);

  const onChange = useCallback<ComboboxOnChange>(
    (v) => {
      if (!isLayoutMode(v?.value)) {
        return;
      }
      dispatch(setLayoutMode(v.value));
    },
    [dispatch]
  );

  return (
    <FormControl>
      <FormLabel>{t('settings.layoutMode.label')}</FormLabel>
      <Combobox value={value} options={options} onChange={onChange} isSearchable={false} />
    </FormControl>
  );
});

SettingsLayoutMode.displayName = 'SettingsLayoutMode';
