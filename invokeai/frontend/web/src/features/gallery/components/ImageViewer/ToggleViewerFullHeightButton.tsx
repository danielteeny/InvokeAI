import { IconButton } from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { useAppSelector } from 'app/store/storeHooks';
import { useViewportOrientation } from 'common/hooks/useViewportOrientation';
import { navigationApi } from 'features/ui/layouts/navigation-api';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiArrowsInLineVerticalBold, PiArrowsOutLineVerticalBold } from 'react-icons/pi';

export const ToggleViewerFullHeightButton = memo(() => {
  const { t } = useTranslation();
  const layoutMode = useAppSelector((s) => s.ui.layoutMode);
  const orientation = useViewportOrientation();
  const isViewerFullHeight = useStore(navigationApi.$isViewerFullHeight);

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
    navigationApi.toggleTopPanelForFullViewer();
  }, []);

  // Only show in vertical layout
  if (!isVerticalLayout) {
    return null;
  }

  return (
    <IconButton
      aria-label={t('accessibility.toggleViewerFullHeight')}
      tooltip={t('accessibility.toggleViewerFullHeight')}
      icon={isViewerFullHeight ? <PiArrowsInLineVerticalBold /> : <PiArrowsOutLineVerticalBold />}
      onClick={onClick}
      variant="link"
      alignSelf="stretch"
      colorScheme={isViewerFullHeight ? 'invokeBlue' : 'base'}
      data-testid="toggle-viewer-full-height-button"
    />
  );
});

ToggleViewerFullHeightButton.displayName = 'ToggleViewerFullHeightButton';
