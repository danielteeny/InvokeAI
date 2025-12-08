import 'dockview/dist/styles/dockview.css';
import 'features/ui/styles/dockview-theme-invoke.css';

import { Flex } from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { useAppSelector } from 'app/store/storeHooks';
import Loading from 'common/components/Loading/Loading';
import { useViewportOrientation } from 'common/hooks/useViewportOrientation';
import { VerticalNavBar } from 'features/ui/components/VerticalNavBar';
import { CanvasTabAutoLayout } from 'features/ui/layouts/canvas-tab-auto-layout';
import { CanvasTabVerticalLayout } from 'features/ui/layouts/canvas-tab-vertical-layout';
import { GenerateTabAutoLayout } from 'features/ui/layouts/generate-tab-auto-layout';
import { GenerateTabVerticalLayout } from 'features/ui/layouts/generate-tab-vertical-layout';
import { ModelsTabAutoLayout } from 'features/ui/layouts/models-tab-auto-layout';
import { navigationApi } from 'features/ui/layouts/navigation-api';
import { QueueTabAutoLayout } from 'features/ui/layouts/queue-tab-auto-layout';
import { UpscalingTabAutoLayout } from 'features/ui/layouts/upscaling-tab-auto-layout';
import { WorkflowsTabAutoLayout } from 'features/ui/layouts/workflows-tab-auto-layout';
import { selectActiveTab } from 'features/ui/store/uiSelectors';
import { memo, useMemo } from 'react';

export const AppContent = memo(() => {
  return (
    <Flex position="relative" w="full" h="full" overflow="hidden">
      <VerticalNavBar />
      <TabContent />
    </Flex>
  );
});
AppContent.displayName = 'AppContent';

const TabContent = memo(() => {
  const tab = useAppSelector(selectActiveTab);
  const layoutMode = useAppSelector((s) => s.ui.layoutMode);
  const orientation = useViewportOrientation();

  // Determine if we should use vertical layout
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

  return (
    <Flex position="relative" w="full" h="full" overflow="hidden">
      {tab === 'generate' && (isVerticalLayout ? <GenerateTabVerticalLayout /> : <GenerateTabAutoLayout />)}
      {tab === 'canvas' && (isVerticalLayout ? <CanvasTabVerticalLayout /> : <CanvasTabAutoLayout />)}
      {tab === 'upscaling' && <UpscalingTabAutoLayout />}
      {tab === 'workflows' && <WorkflowsTabAutoLayout />}
      {tab === 'models' && <ModelsTabAutoLayout />}
      {tab === 'queue' && <QueueTabAutoLayout />}
      <SwitchingTabsLoader />
    </Flex>
  );
});
TabContent.displayName = 'TabContent';

const SwitchingTabsLoader = memo(() => {
  const isSwitchingTabs = useStore(navigationApi.$isLoading);

  if (isSwitchingTabs) {
    return <Loading />;
  }

  return null;
});
SwitchingTabsLoader.displayName = 'SwitchingTabsLoader';
