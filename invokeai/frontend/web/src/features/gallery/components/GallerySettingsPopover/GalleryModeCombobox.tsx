import type { ComboboxOption } from '@invoke-ai/ui-library';
import { Combobox, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import type { SingleValue } from 'chakra-react-select';
import { selectGalleryMode } from 'features/gallery/store/gallerySelectors';
import { galleryModeChanged } from 'features/gallery/store/gallerySlice';
import type { GalleryMode } from 'features/gallery/store/types';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { assert } from 'tsafe';

const GalleryModeCombobox = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const galleryMode = useAppSelector(selectGalleryMode);

  const options = useMemo<ComboboxOption[]>(
    () => [
      { value: 'infinite-scroll', label: t('gallery.infiniteScroll') },
      { value: 'pagination', label: t('gallery.pagination') },
    ],
    [t]
  );

  const onChange = useCallback(
    (v: SingleValue<ComboboxOption>) => {
      assert(v?.value === 'infinite-scroll' || v?.value === 'pagination');
      dispatch(galleryModeChanged(v.value as GalleryMode));
    },
    [dispatch]
  );

  const value = useMemo(() => {
    return options.find((opt) => opt.value === galleryMode);
  }, [galleryMode, options]);

  return (
    <FormControl>
      <FormLabel flexGrow={1} m={0}>
        {t('gallery.galleryMode')}
      </FormLabel>
      <Combobox isSearchable={false} value={value} options={options} onChange={onChange} />
    </FormControl>
  );
};

export default memo(GalleryModeCombobox);
