import { describe, expect, it } from 'vitest';

import { calculateJointResize } from './verticalLayoutJointResizeUtils';

describe('calculateJointResize', () => {
  it('applies drag deltas when they are within bounds', () => {
    const result = calculateJointResize({
      deltaX: 64,
      deltaY: -32,
      startSettingsWidth: 420,
      startTopHeight: 360,
      totalTopWidth: 1200,
      totalRootHeight: 900,
      minSettingsWidth: 300,
      minRightWidth: 300,
      minTopHeight: 100,
      minMainHeight: 200,
    });

    expect(result).toEqual({
      settingsWidth: 484,
      topHeight: 328,
    });
  });

  it('clamps to minimum sizes when dragging too far negative', () => {
    const result = calculateJointResize({
      deltaX: -500,
      deltaY: -500,
      startSettingsWidth: 420,
      startTopHeight: 360,
      totalTopWidth: 1200,
      totalRootHeight: 900,
      minSettingsWidth: 300,
      minRightWidth: 300,
      minTopHeight: 100,
      minMainHeight: 200,
    });

    expect(result).toEqual({
      settingsWidth: 300,
      topHeight: 100,
    });
  });

  it('clamps to maximum sizes derived from opposite-panel minimums', () => {
    const result = calculateJointResize({
      deltaX: 1000,
      deltaY: 1000,
      startSettingsWidth: 420,
      startTopHeight: 360,
      totalTopWidth: 1200,
      totalRootHeight: 900,
      minSettingsWidth: 300,
      minRightWidth: 300,
      minTopHeight: 100,
      minMainHeight: 200,
    });

    expect(result).toEqual({
      settingsWidth: 900,
      topHeight: 700,
    });
  });

  it('returns null for degenerate totals or impossible constraints', () => {
    const result = calculateJointResize({
      deltaX: 20,
      deltaY: 20,
      startSettingsWidth: 420,
      startTopHeight: 360,
      totalTopWidth: 500,
      totalRootHeight: 250,
      minSettingsWidth: 300,
      minRightWidth: 300,
      minTopHeight: 100,
      minMainHeight: 200,
    });

    expect(result).toBeNull();
  });
});
