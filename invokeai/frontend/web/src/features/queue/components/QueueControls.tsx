import { Flex, Spacer, useShiftModifier } from '@invoke-ai/ui-library';
import { DeleteAllExceptCurrentIconButton } from 'features/queue/components/DeleteAllExceptCurrentIconButton';
import { DeleteCurrentQueueItemIconButton } from 'features/queue/components/DeleteCurrentQueueItemIconButton';
import { QueueActionsMenuButton } from 'features/queue/components/QueueActionsMenuButton';
import { ResetTopPanelSplitButton } from 'features/queue/components/ResetTopPanelSplitButton';
import { ToggleSettingsFullHeightButton } from 'features/queue/components/ToggleSettingsFullHeightButton';
import ProgressBar from 'features/system/components/ProgressBar';
import { memo } from 'react';

import { CancelAllExceptCurrentIconButton } from './CancelAllExceptCurrentIconButton';
import { CancelCurrentQueueItemIconButton } from './CancelCurrentQueueItemIconButton';
import { InvokeButton } from './InvokeQueueBackButton';

const QueueControls = () => {
  return (
    <Flex w="full" position="relative" borderRadius="base" gap={2} flexDir="column">
      <Flex gap={2}>
        <InvokeButton />
        <Spacer />
        <ResetTopPanelSplitButton />
        <ToggleSettingsFullHeightButton />
        <QueueActionsMenuButton />
        <CancelIconButton />
      </Flex>
      <ProgressBar />
    </Flex>
  );
};

export default memo(QueueControls);

const DeleteIconButton = memo(() => {
  const shift = useShiftModifier();

  if (!shift) {
    return <DeleteCurrentQueueItemIconButton />;
  }

  return <DeleteAllExceptCurrentIconButton />;
});

DeleteIconButton.displayName = 'DeleteIconButton';

const CancelIconButton = memo(() => {
  const shift = useShiftModifier();

  if (!shift) {
    return <CancelCurrentQueueItemIconButton />;
  }

  return <CancelAllExceptCurrentIconButton />;
});

CancelIconButton.displayName = 'CancelIconButton';
