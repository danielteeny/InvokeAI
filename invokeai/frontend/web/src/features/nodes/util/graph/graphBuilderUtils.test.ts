import type { RootState } from 'app/store/store';
import { describe, expect, it } from 'vitest';

import { getBoardField, selectCanvasOutputFields } from './graphBuilderUtils';

const getState = (arg: {
  activeTab: 'generate' | 'canvas';
  autoAddBoardId: string;
  autoAssignmentRulesMasterEnabled?: boolean;
  saveAllImagesToGallery?: boolean;
}) =>
  ({
    ui: {
      activeTab: arg.activeTab,
    },
    gallery: {
      autoAddBoardId: arg.autoAddBoardId,
      autoAssignmentRulesMasterEnabled: arg.autoAssignmentRulesMasterEnabled ?? true,
    },
    canvasSettings: {
      saveAllImagesToGallery: arg.saveAllImagesToGallery ?? false,
    },
    canvasStagingArea: {
      sessionId: 'canvas-session',
    },
  }) as RootState;

describe('graphBuilderUtils board fields', () => {
  it('omits the board when auto-add board is none', () => {
    expect(getBoardField(getState({ activeTab: 'generate', autoAddBoardId: 'none' }))).toBeUndefined();
  });

  it('includes the selected auto-add board even when auto-assignment rules are disabled', () => {
    expect(
      getBoardField(
        getState({ activeTab: 'generate', autoAddBoardId: 'selected-board', autoAssignmentRulesMasterEnabled: false })
      )
    ).toEqual({ board_id: 'selected-board' });
  });

  it('includes the selected auto-add board on generated gallery outputs', () => {
    expect(selectCanvasOutputFields(getState({ activeTab: 'generate', autoAddBoardId: 'selected-board' }))).toEqual(
      expect.objectContaining({
        is_intermediate: false,
        board: { board_id: 'selected-board' },
      })
    );
  });

  it('includes the selected auto-add board on canvas outputs saved directly to gallery', () => {
    expect(
      selectCanvasOutputFields(
        getState({ activeTab: 'canvas', autoAddBoardId: 'selected-board', saveAllImagesToGallery: true })
      )
    ).toEqual(
      expect.objectContaining({
        is_intermediate: false,
        board: { board_id: 'selected-board' },
      })
    );
  });

  it('omits the board on intermediate canvas outputs staged outside the gallery', () => {
    expect(
      selectCanvasOutputFields(
        getState({ activeTab: 'canvas', autoAddBoardId: 'selected-board', saveAllImagesToGallery: false })
      )
    ).toEqual(
      expect.objectContaining({
        is_intermediate: true,
        board: undefined,
      })
    );
  });
});
