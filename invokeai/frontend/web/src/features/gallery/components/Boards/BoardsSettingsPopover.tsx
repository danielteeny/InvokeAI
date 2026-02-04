import {
  Divider,
  Flex,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Text,
} from '@invoke-ai/ui-library';
import BoardAutoAddSelect from 'features/gallery/components/Boards/BoardAutoAddSelect';
import AutoAssignBoardCheckbox from 'features/gallery/components/GallerySettingsPopover/AutoAssignBoardCheckbox';
import AutoAssignmentRulesMasterToggle from 'features/gallery/components/GallerySettingsPopover/AutoAssignmentRulesMasterToggle';
import ShowArchivedBoardsCheckbox from 'features/gallery/components/GallerySettingsPopover/ShowArchivedBoardsCheckbox';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiGearSixFill } from 'react-icons/pi';

import { BoardsListSortControls } from './BoardsListSortControls';

export const BoardsSettingsPopover = memo(() => {
  const { t } = useTranslation();

  return (
    <Popover isLazy>
      <PopoverTrigger>
        <IconButton
          size="sm"
          variant="link"
          alignSelf="stretch"
          aria-label={t('gallery.boardsSettings')}
          icon={<PiGearSixFill />}
          tooltip={t('gallery.boardsSettings')}
        />
      </PopoverTrigger>
      <Portal>
        <PopoverContent minW={320}>
          <PopoverArrow />
          <PopoverBody>
            <Flex direction="column" gap={2}>
              <Text fontWeight="semibold" color="base.300">
                Boards Settings
              </Text>

              <Divider />

              <AutoAssignBoardCheckbox />
              <AutoAssignmentRulesMasterToggle />
              <ShowArchivedBoardsCheckbox />
              <BoardAutoAddSelect />

              <Divider />

              <BoardsListSortControls />
            </Flex>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
});
BoardsSettingsPopover.displayName = 'BoardsSettingsPopover';
