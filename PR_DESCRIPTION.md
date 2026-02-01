# feat(ui): Add vertical layout mode for portrait displays

## Summary

This PR adds automatic vertical layout optimization for portrait-oriented displays (monitors with aspect ratios like 9:16, 9:21, etc.). The feature provides a better user experience for users with vertically-oriented monitors by reorganizing the UI to maximize the available screen space.

**Key Changes:**
- **Automatic viewport detection** - Detects when the display is portrait-oriented (aspect ratio < 0.9)
- **Vertical layout mode** - Splits the UI into top (50% - settings/gallery) and bottom (50% - canvas/viewer) sections
- **User control** - Settings option to override automatic detection with "Auto", "Horizontal", or "Vertical" modes
- **Redux migration** - Includes proper state migration for the new `layoutMode` setting
- **Clean implementation** - Removed floating panel toggle buttons that don't apply to vertical layouts

## Related Issues / Discussions

This feature was developed to address the needs of users with portrait-oriented displays who find the default horizontal layout inefficient for their screen orientation.

## QA Instructions

### Testing Automatic Detection:
1. **On a standard horizontal display:**
   - Start InvokeAI
   - Verify the UI shows in the normal horizontal layout (left sidebar, main panel, right panels)

2. **Simulate vertical display:**
   - Open browser dev tools (F12)
   - Use responsive design mode
   - Set dimensions to portrait orientation (e.g., 1080x1920)
   - Reload the page
   - Verify the UI automatically switches to vertical layout:
     - Top 50%: Settings panel (left) and Gallery/Boards/Layers panels (right)
     - Bottom 50%: Full-width canvas/launchpad/viewer

3. **Test manual override:**
   - Open Settings (gear icon)
   - Find "Layout Mode" setting under "UI" section
   - Test all three options:
     - "Auto (Based on Screen)" - should use viewport detection
     - "Horizontal" - forces horizontal layout even on portrait display
     - "Vertical" - forces vertical layout even on landscape display
   - Verify layout changes immediately when setting is changed

4. **Test both tabs:**
   - Generate tab: Settings → Launchpad/Viewer panels → Gallery/Boards
   - Canvas tab: Settings → Launchpad/Canvas/Viewer panels → Gallery/Boards/Layers
   - Verify vertical layout works correctly on both tabs

### Expected Behavior:
- Layout should adapt smoothly when viewport changes
- No floating panel toggle buttons should appear in vertical layout
- All panels should be properly sized and functional
- State should persist across page reloads

## Merge Plan

No special merge considerations needed. This is a self-contained feature addition that doesn't affect existing functionality for users with horizontal displays.

## Checklist

- [x] _The PR has a short but descriptive title, suitable for a changelog_
- [ ] _Tests added / updated (if applicable)_ - No tests written (UI layout feature, visual testing required)
- [x] _Changes to a redux slice have a corresponding migration_ - Migration added (version 4→5)
- [ ] _Documentation added / updated (if applicable)_ - No docs needed (user-facing feature with UI control)
- [ ] _Updated `What's New` copy (if doing a release after this PR)_

## Technical Details

### Files Modified:
- `src/common/hooks/useViewportOrientation.ts` - New hook for viewport detection
- `src/features/ui/store/uiTypes.ts` - Added `layoutMode` to UI state
- `src/features/ui/store/uiSlice.ts` - Added state, action, and migration for `layoutMode`
- `src/features/ui/store/uiSelectors.ts` - Added selector for `layoutMode`
- `src/features/ui/components/AppContent.tsx` - Layout switching logic
- `src/features/ui/layouts/generate-tab-vertical-layout.tsx` - New vertical layout for Generate tab
- `src/features/ui/layouts/canvas-tab-vertical-layout.tsx` - New vertical layout for Canvas tab
- `src/features/system/components/SettingsModal/SettingsLayoutMode.tsx` - New settings component
- `src/features/system/components/SettingsModal/SettingsModal.tsx` - Integrated settings component
- `public/locales/en.json` - Added translation keys

### Architecture Decisions:
- **Separate layout files** - Vertical and horizontal layouts are completely separate for cleaner code
- **Redux for persistence** - Layout mode preference persists across sessions
- **Viewport hook** - Uses `matchMedia` and resize events for efficient detection
- **Threshold of 0.9** - Aspect ratio < 0.9 (height > width * 1.11) triggers vertical mode

## Screenshots

_Screenshots should be added here showing:_
1. Horizontal layout on standard display
2. Vertical layout on portrait display (Generate tab)
3. Vertical layout on portrait display (Canvas tab)
4. Settings UI showing the Layout Mode dropdown

---

**Note:** Before merging, please review if this aligns with InvokeAI's vision for UI adaptability and multi-monitor support.
