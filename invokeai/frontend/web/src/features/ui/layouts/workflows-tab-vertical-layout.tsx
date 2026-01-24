import type { DockviewApi, GridviewApi, IDockviewReactProps, IGridviewReactProps } from 'dockview';
import { DockviewReact, GridviewReact, LayoutPriority, Orientation } from 'dockview';
import { BoardsPanel } from 'features/gallery/components/BoardsListPanelContent';
import { GalleryPanel } from 'features/gallery/components/GalleryPanel';
import { ImageViewerPanel } from 'features/gallery/components/ImageViewer/ImageViewerPanel';
import NodeEditor from 'features/nodes/components/NodeEditor';
import WorkflowsTabLeftPanel from 'features/nodes/components/sidePanel/WorkflowsTabLeftPanel';
import { FloatingLeftPanelButtons } from 'features/ui/components/FloatingLeftPanelButtons';
import type {
  AutoLayoutDockviewComponents,
  AutoLayoutGridviewComponents,
  DockviewPanelParameters,
  GridviewPanelParameters,
  RootLayoutGridviewComponents,
} from 'features/ui/layouts/auto-layout-context';
import { AutoLayoutProvider, useAutoLayoutContext, withPanelContainer } from 'features/ui/layouts/auto-layout-context';
import type { TabName } from 'features/ui/store/uiTypes';
import { dockviewTheme } from 'features/ui/styles/theme';
import { t } from 'i18next';
import { memo, useCallback, useEffect } from 'react';

import { DockviewTab } from './DockviewTab';
import { DockviewTabLaunchpad } from './DockviewTabLaunchpad';
import { DockviewTabProgress } from './DockviewTabProgress';
import { navigationApi } from './navigation-api';
import { PanelHotkeysLogical } from './PanelHotkeysLogical';
import {
  BOARD_PANEL_DEFAULT_HEIGHT_PX,
  BOARD_PANEL_MIN_HEIGHT_PX,
  BOARDS_PANEL_ID,
  DOCKVIEW_TAB_ID,
  DOCKVIEW_TAB_LAUNCHPAD_ID,
  DOCKVIEW_TAB_PROGRESS_ID,
  GALLERY_PANEL_DEFAULT_HEIGHT_PX,
  GALLERY_PANEL_ID,
  GALLERY_PANEL_MIN_HEIGHT_PX,
  LAUNCHPAD_PANEL_ID,
  MAIN_PANEL_ID,
  MAIN_PANEL_MIN_HEIGHT_PX,
  SETTINGS_PANEL_ID,
  TOP_PANEL_ID,
  TOP_PANEL_MIN_HEIGHT_PX,
  VIEWER_PANEL_ID,
  WORKSPACE_PANEL_ID,
} from './shared';
import { WorkflowsLaunchpadPanel } from './WorkflowsLaunchpadPanel';

// Panel IDs for vertical layout
const GALLERY_CONTAINER_PANEL_ID = 'gallery-container-panel';

const tabComponents = {
  [DOCKVIEW_TAB_ID]: DockviewTab,
  [DOCKVIEW_TAB_PROGRESS_ID]: DockviewTabProgress,
  [DOCKVIEW_TAB_LAUNCHPAD_ID]: DockviewTabLaunchpad,
};

const mainPanelComponents: AutoLayoutDockviewComponents = {
  [LAUNCHPAD_PANEL_ID]: withPanelContainer(WorkflowsLaunchpadPanel),
  [WORKSPACE_PANEL_ID]: withPanelContainer(NodeEditor),
  [VIEWER_PANEL_ID]: withPanelContainer(ImageViewerPanel),
};

const initializeMainPanelLayout = (tab: TabName, api: DockviewApi) => {
  navigationApi.registerContainer(tab, 'main', api, () => {
    const launchpad = api.addPanel<DockviewPanelParameters>({
      id: LAUNCHPAD_PANEL_ID,
      component: LAUNCHPAD_PANEL_ID,
      title: t('ui.panels.launchpad'),
      tabComponent: DOCKVIEW_TAB_LAUNCHPAD_ID,
      params: {
        tab,
        focusRegion: 'launchpad',
        i18nKey: 'ui.panels.launchpad',
      },
    });

    api.addPanel<DockviewPanelParameters>({
      id: WORKSPACE_PANEL_ID,
      component: WORKSPACE_PANEL_ID,
      title: t('ui.panels.workflowEditor'),
      tabComponent: DOCKVIEW_TAB_ID,
      params: {
        tab,
        focusRegion: 'workflows',
        i18nKey: 'ui.panels.workflowEditor',
      },
      position: {
        direction: 'within',
        referencePanel: launchpad.id,
      },
    });

    api.addPanel<DockviewPanelParameters>({
      id: VIEWER_PANEL_ID,
      component: VIEWER_PANEL_ID,
      title: t('ui.panels.imageViewer'),
      tabComponent: DOCKVIEW_TAB_PROGRESS_ID,
      params: {
        tab,
        focusRegion: 'viewer',
        i18nKey: 'ui.panels.imageViewer',
      },
      position: {
        direction: 'within',
        referencePanel: launchpad.id,
      },
    });

    launchpad.api.setActive();
  });
};

const MainPanel = memo(() => {
  const { tab } = useAutoLayoutContext();

  const onReady = useCallback<IDockviewReactProps['onReady']>(
    ({ api }) => {
      initializeMainPanelLayout(tab, api);
    },
    [tab]
  );
  return (
    <>
      <DockviewReact
        disableDnd={true}
        locked={true}
        disableFloatingGroups={true}
        dndEdges={false}
        tabComponents={tabComponents}
        components={mainPanelComponents}
        onReady={onReady}
        theme={dockviewTheme}
      />
      <FloatingLeftPanelButtons />
      <PanelHotkeysLogical />
    </>
  );
});
MainPanel.displayName = 'MainPanel';

// Gallery container panel (right side of top panel) - contains boards and gallery stacked vertically
const galleryContainerPanelComponents: AutoLayoutGridviewComponents = {
  [BOARDS_PANEL_ID]: withPanelContainer(BoardsPanel),
  [GALLERY_PANEL_ID]: withPanelContainer(GalleryPanel),
};

const initializeGalleryContainerPanelLayout = (tab: TabName, api: GridviewApi) => {
  navigationApi.registerContainer(tab, 'galleryContainer', api, () => {
    const gallery = api.addPanel<GridviewPanelParameters>({
      id: GALLERY_PANEL_ID,
      component: GALLERY_PANEL_ID,
      minimumHeight: GALLERY_PANEL_MIN_HEIGHT_PX,
      params: {
        tab,
        focusRegion: 'gallery',
      },
    });

    const boards = api.addPanel<GridviewPanelParameters>({
      id: BOARDS_PANEL_ID,
      component: BOARDS_PANEL_ID,
      minimumHeight: BOARD_PANEL_MIN_HEIGHT_PX,
      params: {
        tab,
        focusRegion: 'boards',
      },
      position: {
        direction: 'above',
        referencePanel: gallery.id,
      },
    });

    gallery.api.setSize({ height: GALLERY_PANEL_DEFAULT_HEIGHT_PX });
    boards.api.setSize({ height: BOARD_PANEL_DEFAULT_HEIGHT_PX });
  });
};

const GalleryContainerPanel = memo(() => {
  const { tab } = useAutoLayoutContext();

  const onReady = useCallback<IGridviewReactProps['onReady']>(
    ({ api }) => {
      initializeGalleryContainerPanelLayout(tab, api);
    },
    [tab]
  );
  return (
    <GridviewReact
      className="dockview-theme-invoke"
      orientation={Orientation.VERTICAL}
      components={galleryContainerPanelComponents}
      onReady={onReady}
    />
  );
});
GalleryContainerPanel.displayName = 'GalleryContainerPanel';

// Top panel - contains settings on left and gallery container on right (horizontal split)
const topPanelComponents: RootLayoutGridviewComponents = {
  [SETTINGS_PANEL_ID]: withPanelContainer(WorkflowsTabLeftPanel),
  [GALLERY_CONTAINER_PANEL_ID]: GalleryContainerPanel,
};

const initializeTopPanelLayout = (tab: TabName, api: GridviewApi) => {
  navigationApi.registerContainer(tab, 'top', api, () => {
    const settings = api.addPanel<GridviewPanelParameters>({
      id: SETTINGS_PANEL_ID,
      component: SETTINGS_PANEL_ID,
      size: 1,
      params: {
        tab,
        focusRegion: 'settings',
      },
    });

    api.addPanel<GridviewPanelParameters>({
      id: GALLERY_CONTAINER_PANEL_ID,
      component: GALLERY_CONTAINER_PANEL_ID,
      size: 1,
      position: {
        direction: 'right',
        referencePanel: settings.id,
      },
    });
  });
};

const TopPanel = memo(() => {
  const { tab } = useAutoLayoutContext();

  const onReady = useCallback<IGridviewReactProps['onReady']>(
    ({ api }) => {
      initializeTopPanelLayout(tab, api);
    },
    [tab]
  );
  return (
    <GridviewReact
      className="dockview-theme-invoke"
      orientation={Orientation.HORIZONTAL}
      components={topPanelComponents}
      onReady={onReady}
      proportionalLayout={true}
    />
  );
});
TopPanel.displayName = 'TopPanel';

// Root panel components - top panel and main panel (vertical split)
const rootPanelComponents: RootLayoutGridviewComponents = {
  [TOP_PANEL_ID]: TopPanel,
  [MAIN_PANEL_ID]: MainPanel,
};

const initializeRootPanelLayout = (tab: TabName, api: GridviewApi) => {
  navigationApi.registerContainer(tab, 'root', api, () => {
    const main = api.addPanel<GridviewPanelParameters>({
      id: MAIN_PANEL_ID,
      component: MAIN_PANEL_ID,
      priority: LayoutPriority.High,
      minimumHeight: MAIN_PANEL_MIN_HEIGHT_PX,
    });

    api.addPanel<GridviewPanelParameters>({
      id: TOP_PANEL_ID,
      component: TOP_PANEL_ID,
      priority: LayoutPriority.Low,
      minimumHeight: TOP_PANEL_MIN_HEIGHT_PX,
      position: {
        direction: 'above',
        referencePanel: main.id,
      },
    });
  });

  // Apply constraints after registration (handles restored layouts too)
  const topPanel = api.getPanel(TOP_PANEL_ID);
  const mainPanel = api.getPanel(MAIN_PANEL_ID);
  topPanel?.api.setConstraints({ minimumHeight: TOP_PANEL_MIN_HEIGHT_PX });
  mainPanel?.api.setConstraints({ minimumHeight: MAIN_PANEL_MIN_HEIGHT_PX });
};

export const WorkflowsTabVerticalLayout = memo(() => {
  const onReady = useCallback<IGridviewReactProps['onReady']>(({ api }) => {
    initializeRootPanelLayout('workflows', api);
  }, []);

  useEffect(
    () => () => {
      navigationApi.unregisterTab('workflows');
    },
    []
  );

  return (
    <AutoLayoutProvider tab="workflows">
      <GridviewReact
        className="dockview-theme-invoke"
        components={rootPanelComponents}
        onReady={onReady}
        orientation={Orientation.VERTICAL}
        proportionalLayout={true}
      />
    </AutoLayoutProvider>
  );
});
WorkflowsTabVerticalLayout.displayName = 'WorkflowsTabVerticalLayout';
