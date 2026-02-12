export type JointResizeCalculationInput = {
  deltaX: number;
  deltaY: number;
  startSettingsWidth: number;
  startTopHeight: number;
  totalTopWidth: number;
  totalRootHeight: number;
  minSettingsWidth: number;
  minRightWidth: number;
  minTopHeight: number;
  minMainHeight: number;
};

export type JointResizeCalculationResult = {
  settingsWidth: number;
  topHeight: number;
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

export const calculateJointResize = (
  input: JointResizeCalculationInput
): JointResizeCalculationResult | null => {
  if (Object.values(input).some((value) => !isFiniteNumber(value))) {
    return null;
  }

  const minSettingsWidth = Math.max(0, input.minSettingsWidth);
  const minRightWidth = Math.max(0, input.minRightWidth);
  const minTopHeight = Math.max(0, input.minTopHeight);
  const minMainHeight = Math.max(0, input.minMainHeight);

  const maxSettingsWidth = input.totalTopWidth - minRightWidth;
  const maxTopHeight = input.totalRootHeight - minMainHeight;

  if (
    input.totalTopWidth <= 0 ||
    input.totalRootHeight <= 0 ||
    maxSettingsWidth < minSettingsWidth ||
    maxTopHeight < minTopHeight
  ) {
    return null;
  }

  const settingsWidth = clamp(input.startSettingsWidth + input.deltaX, minSettingsWidth, maxSettingsWidth);
  const topHeight = clamp(input.startTopHeight + input.deltaY, minTopHeight, maxTopHeight);

  return {
    settingsWidth,
    topHeight,
  };
};
