import { useAppSelector } from 'app/store/storeHooks';
import { useViewportOrientation } from 'common/hooks/useViewportOrientation';
import { useRegisteredHotkeys } from 'features/system/components/HotkeysModal/useHotkeyData';
import { navigationApi } from 'features/ui/layouts/navigation-api';
import { memo, useCallback, useMemo } from 'react';

export const PanelHotkeysLogical = memo(() => {
  const layoutMode = useAppSelector((s) => s.ui.layoutMode);
  const orientation = useViewportOrientation();

  const isVerticalLayout = useMemo(() => {
    if (layoutMode === 'vertical') {
      return true;
    }
    if (layoutMode === 'horizontal') {
      return false;
    }
    return orientation.isVertical; // Auto mode
  }, [layoutMode, orientation.isVertical]);

  const togglePanelsCallback = useCallback(() => {
    if (isVerticalLayout) {
      navigationApi.toggleTopPanelForFullViewer();
    } else {
      navigationApi.toggleLeftAndRightPanels();
    }
  }, [isVerticalLayout]);

  useRegisteredHotkeys({
    category: 'app',
    id: 'toggleLeftPanel',
    callback: navigationApi.toggleLeftPanel,
  });
  useRegisteredHotkeys({
    category: 'app',
    id: 'toggleRightPanel',
    callback: navigationApi.toggleRightPanel,
  });
  useRegisteredHotkeys({
    category: 'app',
    id: 'resetPanelLayout',
    callback: navigationApi.resetLeftAndRightPanels,
  });
  useRegisteredHotkeys({
    category: 'app',
    id: 'togglePanels',
    callback: togglePanelsCallback,
    dependencies: [togglePanelsCallback],
  });
  useRegisteredHotkeys({
    category: 'app',
    id: 'toggleSettingsFullHeight',
    callback: navigationApi.toggleMainPanelForFullSettings,
    options: { enabled: isVerticalLayout },
    dependencies: [isVerticalLayout],
  });

  return null;
});

PanelHotkeysLogical.displayName = 'PanelHotkeysLogical';
