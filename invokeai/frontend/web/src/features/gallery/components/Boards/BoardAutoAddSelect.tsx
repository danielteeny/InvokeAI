import type { ComboboxOnChange } from '@invoke-ai/ui-library';
import { Combobox, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { selectAutoAddBoardId, selectAutoAssignBoardOnClick } from 'features/gallery/store/gallerySelectors';
import { autoAddBoardIdChanged } from 'features/gallery/store/gallerySlice';
import type { BoardComboboxOption } from 'features/gallery/util/boardTreeUtils';
import { boardsToHierarchicalOptionsWithDepth } from 'features/gallery/util/boardTreeUtils';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useListAllBoardsQuery } from 'services/api/endpoints/boards';

import { BoardOption } from './BoardComboboxOption';

const BoardAutoAddSelect = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const autoAddBoardId = useAppSelector(selectAutoAddBoardId);
  const autoAssignBoardOnClick = useAppSelector(selectAutoAssignBoardOnClick);
  const { options, hasBoards } = useListAllBoardsQuery(
    {},
    {
      selectFromResult: ({ data }) => {
        const noneOption: BoardComboboxOption = {
          label: t('common.none'),
          value: 'none',
          depth: 0,
        };
        const hierarchicalOptions = data ? boardsToHierarchicalOptionsWithDepth(data) : [];
        return {
          options: [noneOption, ...hierarchicalOptions],
          hasBoards: hierarchicalOptions.length > 0,
        };
      },
    }
  );

  const onChange = useCallback<ComboboxOnChange>(
    (v) => {
      if (!v) {
        return;
      }
      dispatch(autoAddBoardIdChanged(v.value));
    },
    [dispatch]
  );

  const value = useMemo(() => options.find((o) => o.value === autoAddBoardId), [options, autoAddBoardId]);

  const noOptionsMessage = useCallback(() => t('boards.noMatching'), [t]);

  return (
    <FormControl isDisabled={!hasBoards || autoAssignBoardOnClick}>
      <FormLabel>{t('boards.autoAddBoard')}</FormLabel>
      <Combobox
        value={value}
        options={options}
        onChange={onChange}
        placeholder={t('boards.selectBoard')}
        noOptionsMessage={noOptionsMessage}
        components={{ Option: BoardOption }}
      />
    </FormControl>
  );
};
export default memo(BoardAutoAddSelect);
