import type { ComboboxOption } from '@invoke-ai/ui-library';
import { Combobox, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import type { SingleValue } from 'chakra-react-select';
import { selectGalleryMode, selectPaginationPageSize } from 'features/gallery/store/gallerySelectors';
import { paginationPageSizeChanged } from 'features/gallery/store/gallerySlice';
import type { PaginationPageSize } from 'features/gallery/store/types';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const pageSizeOptions: ComboboxOption[] = [
  { value: 'auto', label: 'Auto' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

const PageSizeCombobox = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const galleryMode = useAppSelector(selectGalleryMode);
  const paginationPageSize = useAppSelector(selectPaginationPageSize);

  const onChange = useCallback(
    (v: SingleValue<ComboboxOption>) => {
      if (!v) {
        return;
      }
      const value = v.value === 'auto' ? 'auto' : (parseInt(v.value, 10) as PaginationPageSize);
      dispatch(paginationPageSizeChanged(value));
    },
    [dispatch]
  );

  const value = useMemo(() => {
    const stringValue = paginationPageSize === 'auto' ? 'auto' : String(paginationPageSize);
    return pageSizeOptions.find((opt) => opt.value === stringValue);
  }, [paginationPageSize]);

  // Only show when pagination mode is active
  if (galleryMode !== 'pagination') {
    return null;
  }

  return (
    <FormControl>
      <FormLabel flexGrow={1} m={0}>
        {t('gallery.pageSize')}
      </FormLabel>
      <Combobox isSearchable={false} value={value} options={pageSizeOptions} onChange={onChange} />
    </FormControl>
  );
};

export default memo(PageSizeCombobox);
