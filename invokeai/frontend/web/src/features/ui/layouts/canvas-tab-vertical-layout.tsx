import type { DockviewApi, GridviewApi, IDockviewReactProps, IGridviewReactProps } from 'dockview';
import { DockviewReact, GridviewReact, LayoutPriority, Orientation } from 'dockview';
import { CanvasLayersPanel } from 'features/controlLayers/components/CanvasLayersPanelContent';
import { BoardsPanel } from 'features/gallery/components/BoardsListPanelContent';
import { GalleryPanel } from 'features/gallery/components/GalleryPanel';
import { ImageViewerPanel } from 'features/gallery/components/ImageViewer/ImageViewerPanel';
import type {
  AutoLayoutDockviewComponents,
  AutoLayoutGridviewComponents,
  DockviewPanelParameters,
  GridviewPanelParameters,
  RootLayoutGridviewComponents,
} from 'features/ui/layouts/auto-layout-context';
import { AutoLayoutProvider, useAutoLayoutContext, withPanelContainer } from 'features/ui/layouts/auto-layout-context';
import { CanvasLaunchpadPanel } from 'features/ui/layouts/CanvasLaunchpadPanel';
import type { TabName } from 'features/ui/store/uiTypes';
import { dockviewTheme } from 'features/ui/styles/theme';
import { t } from 'i18next';
import { memo, useCallback, useEffect } from 'react';

import { CanvasTabLeftPanel } from './CanvasTabLeftPanel';
import { CanvasWorkspacePanel } from './CanvasWorkspacePanel';
import { DockviewTabCanvasViewer } from './DockviewTabCanvasViewer';
import { DockviewTabCanvasWorkspace } from './DockviewTabCanvasWorkspace';
import { DockviewTabLaunchpad } from './DockviewTabLaunchpad';
import { navigationApi } from './navigation-api';
import { PanelHotkeysLogical } from './PanelHotkeysLogical';
import {
  BOARD_PANEL_MIN_HEIGHT_PX,
  BOARDS_PANEL_ID,
  CANVAS_BOARD_PANEL_DEFAULT_HEIGHT_PX,
  DOCKVIEW_TAB_CANVAS_VIEWER_ID,
  DOCKVIEW_TAB_CANVAS_WORKSPACE_ID,
  DOCKVIEW_TAB_LAUNCHPAD_ID,
  GALLERY_PANEL_DEFAULT_HEIGHT_PX,
  GALLERY_PANEL_ID,
  GALLERY_PANEL_MIN_HEIGHT_PX,
  LAUNCHPAD_PANEL_ID,
  LAYERS_PANEL_ID,
  LAYERS_PANEL_MIN_HEIGHT_PX,
  MAIN_PANEL_ID,
  SETTINGS_PANEL_ID,
  VIEWER_PANEL_ID,
  WORKSPACE_PANEL_ID,
} from './shared';

// Panel IDs for vertical layout
const TOP_PANEL_ID = 'top-panel';
const RIGHT_CONTAINER_PANEL_ID = 'right-container-panel';

const tabComponents = {
  [DOCKVIEW_TAB_LAUNCHPAD_ID]: DockviewTabLaunchpad,
  [DOCKVIEW_TAB_CANVAS_VIEWER_ID]: DockviewTabCanvasViewer,
  [DOCKVIEW_TAB_CANVAS_WORKSPACE_ID]: DockviewTabCanvasWorkspace,
};

const mainPanelComponents: AutoLayoutDockviewComponents = {
  [LAUNCHPAD_PANEL_ID]: withPanelContainer(CanvasLaunchpadPanel),
  [WORKSPACE_PANEL_ID]: withPanelContainer(CanvasWorkspacePanel),
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
      title: t('ui.panels.canvas'),
      tabComponent: DOCKVIEW_TAB_CANVAS_WORKSPACE_ID,
      params: {
        tab,
        focusRegion: 'canvas',
        i18nKey: 'ui.panels.canvas',
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
      tabComponent: DOCKVIEW_TAB_CANVAS_VIEWER_ID,
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
      <PanelHotkeysLogical />
    </>
  );
});
MainPanel.displayName = 'MainPanel';

// Right container panel (right side of top panel) - contains boards, gallery, and layers stacked vertically
const rightContainerPanelComponents: AutoLayoutGridviewComponents = {
  [BOARDS_PANEL_ID]: withPanelContainer(BoardsPanel),
  [GALLERY_PANEL_ID]: withPanelContainer(GalleryPanel),
  [LAYERS_PANEL_ID]: withPanelContainer(CanvasLayersPanel),
};

const initializeRightContainerPanelLayout = (tab: TabName, api: GridviewApi) => {
  navigationApi.registerContainer(tab, 'rightContainer', api, () => {
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

    api.addPanel<GridviewPanelParameters>({
      id: LAYERS_PANEL_ID,
      component: LAYERS_PANEL_ID,
      minimumHeight: LAYERS_PANEL_MIN_HEIGHT_PX,
      params: {
        tab,
        focusRegion: 'layers',
      },
      position: {
        direction: 'below',
        referencePanel: gallery.id,
      },
    });

    gallery.api.setSize({ height: GALLERY_PANEL_DEFAULT_HEIGHT_PX });
    boards.api.setSize({ height: CANVAS_BOARD_PANEL_DEFAULT_HEIGHT_PX });
  });
};

const RightContainerPanel = memo(() => {
  const { tab } = useAutoLayoutContext();

  const onReady = useCallback<IGridviewReactProps['onReady']>(
    ({ api }) => {
      initializeRightContainerPanelLayout(tab, api);
    },
    [tab]
  );
  return (
    <GridviewReact
      className="dockview-theme-invoke"
      orientation={Orientation.VERTICAL}
      components={rightContainerPanelComponents}
      onReady={onReady}
    />
  );
});
RightContainerPanel.displayName = 'RightContainerPanel';

// Top panel - contains settings on left and right container on right (horizontal split)
const topPanelComponents: RootLayoutGridviewComponents = {
  [SETTINGS_PANEL_ID]: withPanelContainer(CanvasTabLeftPanel),
  [RIGHT_CONTAINER_PANEL_ID]: RightContainerPanel,
};

const initializeTopPanelLayout = (tab: TabName, api: GridviewApi) => {
  navigationApi.registerContainer(tab, 'top', api, () => {
    const settings = api.addPanel<GridviewPanelParameters>({
      id: SETTINGS_PANEL_ID,
      component: SETTINGS_PANEL_ID,
      params: {
        tab,
        focusRegion: 'settings',
      },
    });

    const rightContainer = api.addPanel<GridviewPanelParameters>({
      id: RIGHT_CONTAINER_PANEL_ID,
      component: RIGHT_CONTAINER_PANEL_ID,
      position: {
        direction: 'right',
        referencePanel: settings.id,
      },
    });

    // Set 50/50 split
    settings.api.setSize({ width: 50 });
    rightContainer.api.setSize({ width: 50 });
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
    });

    api.addPanel<GridviewPanelParameters>({
      id: TOP_PANEL_ID,
      component: TOP_PANEL_ID,
      priority: LayoutPriority.Low,
      position: {
        direction: 'above',
        referencePanel: main.id,
      },
    });
  });
};

export const CanvasTabVerticalLayout = memo(() => {
  const onReady = useCallback<IGridviewReactProps['onReady']>(({ api }) => {
    initializeRootPanelLayout('canvas', api);
  }, []);

  useEffect(
    () => () => {
      navigationApi.unregisterTab('canvas');
    },
    []
  );

  return (
    <AutoLayoutProvider tab="canvas">
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
CanvasTabVerticalLayout.displayName = 'CanvasTabVerticalLayout';
