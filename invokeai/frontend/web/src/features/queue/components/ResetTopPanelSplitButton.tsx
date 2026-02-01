import { IconButton } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { useViewportOrientation } from 'common/hooks/useViewportOrientation';
import { navigationApi } from 'features/ui/layouts/navigation-api';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiArrowsHorizontalBold } from 'react-icons/pi';

export const ResetTopPanelSplitButton = memo(() => {
  const { t } = useTranslation();
  const layoutMode = useAppSelector((s) => s.ui.layoutMode);
  const orientation = useViewportOrientation();

  const isVerticalLayout = useMemo(() => {
    if (layoutMode === 'vertical') {
      return true;
    }
    if (layoutMode === 'horizontal') {
      return false;
    }
    // Auto mode - use viewport orientation
    return orientation.isVertical;
  }, [layoutMode, orientation.isVertical]);

  const onClick = useCallback(() => {
    navigationApi.resetTopPanelSplit();
  }, []);

  // Only show in vertical layout
  if (!isVerticalLayout) {
    return null;
  }

  return (
    <IconButton
      aria-label={t('accessibility.resetTopPanelSplit')}
      tooltip={t('accessibility.resetTopPanelSplit')}
      icon={<PiArrowsHorizontalBold />}
      onClick={onClick}
      size="lg"
      colorScheme="base"
      data-testid="reset-top-panel-split-button"
    />
  );
});

ResetTopPanelSplitButton.displayName = 'ResetTopPanelSplitButton';
