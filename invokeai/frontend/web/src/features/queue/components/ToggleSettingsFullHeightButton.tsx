import { IconButton } from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { useAppSelector } from 'app/store/storeHooks';
import { useViewportOrientation } from 'common/hooks/useViewportOrientation';
import { navigationApi } from 'features/ui/layouts/navigation-api';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiArrowsInLineVerticalBold, PiArrowsOutLineVerticalBold } from 'react-icons/pi';

export const ToggleSettingsFullHeightButton = memo(() => {
  const { t } = useTranslation();
  const layoutMode = useAppSelector((s) => s.ui.layoutMode);
  const orientation = useViewportOrientation();
  const isSettingsFullHeight = useStore(navigationApi.$isSettingsFullHeight);

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
    navigationApi.toggleMainPanelForFullSettings();
  }, []);

  // Only show in vertical layout
  if (!isVerticalLayout) {
    return null;
  }

  return (
    <IconButton
      aria-label={t('accessibility.toggleSettingsFullHeight')}
      tooltip={t('accessibility.toggleSettingsFullHeight')}
      icon={isSettingsFullHeight ? <PiArrowsInLineVerticalBold /> : <PiArrowsOutLineVerticalBold />}
      onClick={onClick}
      size="lg"
      colorScheme={isSettingsFullHeight ? 'invokeBlue' : 'base'}
      data-testid="toggle-settings-full-height-button"
    />
  );
});

ToggleSettingsFullHeightButton.displayName = 'ToggleSettingsFullHeightButton';
