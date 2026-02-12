import { Box, type SystemStyleObject } from '@invoke-ai/ui-library';
import { GridviewPanel, type GridviewPanelApi, type IGridviewPanel } from 'dockview';
import type { TabName } from 'features/ui/store/uiTypes';
import { memo, type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { navigationApi } from './navigation-api';
import { MAIN_PANEL_ID, SETTINGS_PANEL_ID, TOP_PANEL_ID } from './shared';
import { calculateJointResize, type JointResizeCalculationInput } from './verticalLayoutJointResizeUtils';

type Props = {
  tab: TabName;
  rightContainerPanelId: string;
};

type GridPanel = IGridviewPanel<GridviewPanelApi>;

type PanelSet = {
  top: GridPanel;
  main: GridPanel;
  settings: GridPanel;
  right: GridPanel;
};

type DragState = JointResizeCalculationInput & {
  pointerId: number;
  startClientX: number;
  startClientY: number;
};

type Anchor = {
  x: number;
  y: number;
};

const sx: SystemStyleObject = {
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  zIndex: 1100,
  w: '1.05rem',
  h: '1.05rem',
  minW: '1.05rem',
  minH: '1.05rem',
  borderRadius: 'full',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: 'invokeYellow.500',
  bg: 'invokeYellow.500',
  boxShadow: '0 0 0 1px var(--invoke-colors-base-900)',
  pointerEvents: 'auto',
  userSelect: 'none',
  touchAction: 'none',
  _hover: {
    bg: 'invokeYellow.300',
    borderColor: 'invokeYellow.300',
  },
  _active: {
    bg: 'invokeYellow.300',
  },
  _focusVisible: {
    outline: '2px solid',
    outlineColor: 'invokeYellow.300',
    outlineOffset: '2px',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: '-8px',
    borderRadius: 'full',
  },
};

const getGridPanel = (tab: TabName, panelId: string): GridPanel | null => {
  const panel = navigationApi.getPanel(tab, panelId);
  if (!panel || !(panel instanceof GridviewPanel)) {
    return null;
  }
  return panel;
};

const resolvePanels = (tab: TabName, rightContainerPanelId: string): PanelSet | null => {
  const top = getGridPanel(tab, TOP_PANEL_ID);
  const main = getGridPanel(tab, MAIN_PANEL_ID);
  const settings = getGridPanel(tab, SETTINGS_PANEL_ID);
  const right = getGridPanel(tab, rightContainerPanelId);

  if (!top || !main || !settings || !right) {
    return null;
  }

  return {
    top,
    main,
    settings,
    right,
  };
};

export const VerticalLayoutJointResizeHandle = memo((props: Props) => {
  const { tab, rightContainerPanelId } = props;
  const { t } = useTranslation();

  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleRef = useRef<HTMLButtonElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dragPanelsRef = useRef<PanelSet | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateAnchor = useCallback(() => {
    const panels = resolvePanels(tab, rightContainerPanelId);
    if (!panels) {
      setAnchor(null);
      return;
    }

    const nextAnchor = {
      x: panels.settings.width,
      y: panels.top.height,
    };

    if (!Number.isFinite(nextAnchor.x) || !Number.isFinite(nextAnchor.y)) {
      setAnchor(null);
      return;
    }

    setAnchor((currentAnchor) => {
      if (currentAnchor && currentAnchor.x === nextAnchor.x && currentAnchor.y === nextAnchor.y) {
        return currentAnchor;
      }
      return nextAnchor;
    });
  }, [rightContainerPanelId, tab]);

  const scheduleAnchorUpdate = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      updateAnchor();
    });
  }, [updateAnchor]);

  useEffect(() => {
    let intervalId: number | null = null;
    let disposables: Array<{ dispose: () => void }> = [];

    const attachListeners = (): boolean => {
      const panels = resolvePanels(tab, rightContainerPanelId);
      if (!panels) {
        setAnchor(null);
        return false;
      }

      scheduleAnchorUpdate();

      const onDimensionChange = () => {
        scheduleAnchorUpdate();
      };

      disposables = [
        panels.top.api.onDidDimensionsChange(onDimensionChange),
        panels.main.api.onDidDimensionsChange(onDimensionChange),
        panels.settings.api.onDidDimensionsChange(onDimensionChange),
        panels.right.api.onDidDimensionsChange(onDimensionChange),
      ];

      return true;
    };

    const attached = attachListeners();

    if (!attached) {
      intervalId = window.setInterval(() => {
        if (attachListeners() && intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      }, 100);
    }

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      disposables.forEach((disposable) => disposable.dispose());
      disposables = [];

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [rightContainerPanelId, scheduleAnchorUpdate, tab]);

  const releaseCapturedPointer = useCallback((pointerId: number) => {
    const handle = handleRef.current;
    if (!handle) {
      return;
    }

    if (handle.hasPointerCapture(pointerId)) {
      try {
        handle.releasePointerCapture(pointerId);
      } catch {
        // no-op
      }
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) {
        return;
      }

      let panels = resolvePanels(tab, rightContainerPanelId);
      if (!panels) {
        return;
      }

      // If settings are full-height (main/viewer collapsed), grabbing the joint handle
      // should restore the viewer and continue directly into the same drag gesture.
      if (panels.main.height === 0) {
        navigationApi.toggleMainPanelForFullSettings();

        const restoredPanels = resolvePanels(tab, rightContainerPanelId);
        if (!restoredPanels) {
          scheduleAnchorUpdate();
          return;
        }

        const totalRootHeight = restoredPanels.top.height + restoredPanels.main.height;
        const minTopHeight = restoredPanels.top.minimumHeight ?? 0;
        const minMainHeight = restoredPanels.main.minimumHeight ?? 0;
        const targetTopHeight = Math.max(minTopHeight, totalRootHeight - minMainHeight);
        const targetMainHeight = Math.max(0, totalRootHeight - targetTopHeight);

        restoredPanels.top.api.setSize({ height: targetTopHeight });
        restoredPanels.main.api.setSize({ height: targetMainHeight });

        panels = restoredPanels;
        setAnchor({
          x: panels.settings.width,
          y: targetTopHeight,
        });
      }

      const calculationInput: JointResizeCalculationInput = {
        deltaX: 0,
        deltaY: 0,
        startSettingsWidth: panels.settings.width,
        startTopHeight: panels.top.height,
        totalTopWidth: panels.settings.width + panels.right.width,
        totalRootHeight: panels.top.height + panels.main.height,
        minSettingsWidth: panels.settings.minimumWidth ?? 0,
        minRightWidth: panels.right.minimumWidth ?? 0,
        minTopHeight: panels.top.minimumHeight ?? 0,
        minMainHeight: panels.main.minimumHeight ?? 0,
      };

      const dragState: DragState = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        ...calculationInput,
      };

      if (!calculateJointResize(calculationInput)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      dragPanelsRef.current = panels;
      dragStateRef.current = dragState;
      setAnchor({
        x: dragState.startSettingsWidth,
        y: dragState.startTopHeight,
      });
      setIsDragging(true);

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // no-op
      }
    },
    [rightContainerPanelId, scheduleAnchorUpdate, tab]
  );

  const endDrag = useCallback(
    (pointerId: number) => {
      if (!dragStateRef.current || dragStateRef.current.pointerId !== pointerId) {
        return;
      }

      dragStateRef.current = null;
      dragPanelsRef.current = null;
      setIsDragging(false);
      releaseCapturedPointer(pointerId);
      scheduleAnchorUpdate();
    },
    [releaseCapturedPointer, scheduleAnchorUpdate]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== e.pointerId) {
        return;
      }

      const panels = dragPanelsRef.current ?? resolvePanels(tab, rightContainerPanelId);
      if (!panels) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const result = calculateJointResize({
        deltaX: e.clientX - dragState.startClientX,
        deltaY: e.clientY - dragState.startClientY,
        startSettingsWidth: dragState.startSettingsWidth,
        startTopHeight: dragState.startTopHeight,
        totalTopWidth: dragState.totalTopWidth,
        totalRootHeight: dragState.totalRootHeight,
        minSettingsWidth: dragState.minSettingsWidth,
        minRightWidth: dragState.minRightWidth,
        minTopHeight: dragState.minTopHeight,
        minMainHeight: dragState.minMainHeight,
      });

      if (!result) {
        return;
      }

      panels.settings.api.setSize({ width: result.settingsWidth });
      panels.top.api.setSize({ height: result.topHeight });

      const nextAnchor = {
        x: result.settingsWidth,
        y: result.topHeight,
      };

      const handle = handleRef.current;
      if (handle) {
        handle.style.left = `${nextAnchor.x}px`;
        handle.style.top = `${nextAnchor.y}px`;
      }

      setAnchor((currentAnchor) => {
        if (currentAnchor && currentAnchor.x === nextAnchor.x && currentAnchor.y === nextAnchor.y) {
          return currentAnchor;
        }
        return nextAnchor;
      });
    },
    [rightContainerPanelId, tab]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      endDrag(e.pointerId);
    },
    [endDrag]
  );

  const handlePointerCancel = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      endDrag(e.pointerId);
    },
    [endDrag]
  );

  const handleLostPointerCapture = useCallback(() => {
    dragStateRef.current = null;
    dragPanelsRef.current = null;
    setIsDragging(false);
    scheduleAnchorUpdate();
  }, [scheduleAnchorUpdate]);

  if (!anchor) {
    return null;
  }

  return (
    <Box
      as="button"
      ref={handleRef}
      type="button"
      aria-label={t('ui.layout.jointResizeHandleAriaLabel')}
      sx={sx}
      style={{ left: `${anchor.x}px`, top: `${anchor.y}px`, cursor: isDragging ? 'grabbing' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
    />
  );
});

VerticalLayoutJointResizeHandle.displayName = 'VerticalLayoutJointResizeHandle';
