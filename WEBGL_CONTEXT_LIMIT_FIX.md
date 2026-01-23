# WebGL Context Limit Fix

## Problem

The application shows this error 4 times (once per viewer panel):

```
Failed to initialize VTK interactor: TypeError: Cannot create proxy with a non-object as target or handler
Canvas: <canvas element>
Container: <div element>
```

And the DICOM reader shows:
```
Could not read the input DICOM file
```

## Root Cause

**You've hit the browser's WebGL context limit.**

Browsers limit the number of **active WebGL contexts** per page/tab:
- Chrome/Edge: ~16 contexts
- Firefox: ~16 contexts
- Safari: ~8 contexts

RADSIM uses **4 viewer panels** (Axial, Sagittal, Coronal, 3D), so it needs **4 WebGL contexts** just for the initial view.

If you've:
1. Reloaded the page multiple times without hard refresh
2. Have other tabs open with 3D content
3. Previous contexts weren't properly cleaned up

...you'll exceed the limit and WebGL context creation will fail, causing:
- Black/empty viewer panels
- Images fail to load
- "Cannot create proxy" errors

## Immediate Solutions

### Solution 1: Hard Reload the Page ⭐ RECOMMENDED
**Press: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows/Linux)**

This forces a complete page reload and clears all WebGL contexts.

### Solution 2: Close Other Tabs
Close any other tabs that might be using WebGL:
- Other medical imaging viewers
- 3D modeling sites
- WebGL games
- Google Maps 3D view
- Any page with 3D graphics

### Solution 3: Restart Your Browser
If hard reload doesn't work:
1. Close ALL browser windows
2. Wait 5 seconds
3. Reopen browser
4. Navigate to RADSIM

### Solution 4: Check WebGL Status
Visit `chrome://gpu` (Chrome) or `about:support` (Firefox) and verify:
- **WebGL:** Enabled
- **WebGL2:** Enabled
- **Hardware Acceleration:** Available

## Long-Term Fix (For Development)

The application has been updated with better WebGL context management:

### 1. Context Availability Check
**File**: [src/core/vtk/useVtkView.ts](src/core/vtk/useVtkView.ts:19-61)

Added checks to detect WebGL context creation failure:
```typescript
// Try to get WebGL context
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
if (!gl) {
  console.error('Failed to get WebGL context from canvas');
  console.error('Solutions: Close other tabs, restart browser...');
}
```

### 2. Graceful Degradation
**File**: [src/core/vtk/useVtkView.ts](src/core/vtk/useVtkView.ts:85-118)

Added context validation before interactor initialization:
```typescript
// Check if WebGL context actually exists
const context = renderWindowView.get3DContext?.();
if (!context) {
  console.error('WebGL context not available...');
  return; // Skip initialization instead of crashing
}
```

## Why This Happens

### WebGL Context Lifecycle
1. Page loads → Creates 4 WebGL contexts (one per viewer)
2. You reload page → Old contexts aren't immediately destroyed
3. New page loads → Tries to create 4 NEW contexts
4. **Total: 8 contexts** (4 old + 4 new)
5. Keep reloading → Eventually hit limit (~16 contexts)
6. Context creation fails → Viewers don't work

### Browser Behavior
Browsers don't immediately free WebGL contexts when:
- Page is soft-reloaded (`Cmd+R`)
- Components unmount but page stays open
- JavaScript garbage collector hasn't run yet

Hard reload (`Cmd+Shift+R`) forces context cleanup.

## Verification Steps

After applying the fix:

1. **Hard reload** the page (`Cmd+Shift+R`)
2. Open browser console (`F12`)
3. Look for these messages:

**✅ Good - WebGL Working:**
```
(no WebGL errors)
```

**❌ Bad - WebGL Limit Hit:**
```
Failed to get WebGL context from canvas
This usually means:
1. Too many WebGL contexts (limit: ~16 per browser)
...
```

4. If you see the error, follow Solution 1-3 above
5. Load a DICOM file - should display in all 4 panels

## Prevention

To avoid hitting the limit during development:

1. **Use hard reload** when developing: `Cmd+Shift+R`
2. **Close unused tabs** with 3D content
3. **Restart browser** daily when doing heavy 3D development
4. **Monitor context count** - if you see > 12 contexts active, reload

## Future Optimization

Potential improvements for later:

1. **Shared WebGL Context**: All 4 viewers share one context (complex to implement)
2. **Lazy Loading**: Only create contexts for visible viewers
3. **Context Pooling**: Reuse contexts instead of creating new ones
4. **Virtual Scrolling**: For many images, only render visible ones

For now, the diagnostic messages will help users understand when they've hit the limit.

## Related Files

- [src/core/vtk/useVtkView.ts](src/core/vtk/useVtkView.ts) - Main VTK initialization
- [WEBGL_STABILITY_FIXES.md](WEBGL_STABILITY_FIXES.md) - Context loss handling
- [IMAGE_DISPLAY_FIX.md](IMAGE_DISPLAY_FIX.md) - Canvas initialization fix

## Summary

**The fix is simple: Do a hard reload** (`Cmd+Shift+R`)

The code improvements will help diagnose the issue in the future and prevent crashes, but they can't create WebGL contexts when the browser limit is reached. Only closing contexts (via reload/restart) will help.
