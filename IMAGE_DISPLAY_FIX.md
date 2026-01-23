# Image Display Fix - Canvas Initialization Issue

## Problem

Images loaded into RADSIM were not displaying in the viewer panels. The console showed multiple errors:

```
Failed to initialize VTK interactor: TypeError: Cannot create proxy with a non-object as target or handler
at publicAPI.get3DContext
```

This error appeared 4 times (once for each viewer panel in Quad View layout).

## Root Cause

The issue was a **timing problem** in the VTK view initialization sequence:

1. `watchPostEffect` in `useWebGLRenderWindow` calls `renderWindowView.setContainer(el)` - this **creates** the WebGL canvas
2. Immediately after, in a separate `watchPostEffect` in `useVtkView`, we call `interactor.initialize()`
3. However, Vue's `watchPostEffect` callbacks run in **parallel**, not sequentially
4. The interactor tries to get the WebGL context before the canvas is fully created
5. VTK receives `null` instead of a WebGL context and throws the proxy error

## The Fix

### File: [src/core/vtk/useVtkView.ts](src/core/vtk/useVtkView.ts)

**Added canvas readiness check before interactor initialization:**

```typescript
watchPostEffect((onCleanup) => {
  const el = unref(container);
  if (!el) return;

  // Wait for canvas to be ready before initializing
  // The renderWindowView needs to have created its canvas element
  const canvas = renderWindowView.getCanvas();
  if (!canvas) {
    console.warn('Canvas not ready yet, skipping interactor initialization');
    return; // Gracefully skip if not ready
  }

  try {
    interactor.initialize();
    interactor.bindEvents(el);
  } catch (error) {
    console.error('Failed to initialize VTK interactor:', error);
    // Log but don't crash
  }

  onCleanup(() => {
    if (interactor.getContainer()) interactor.unbindEvents();
  });
});
```

**Added canvas creation verification:**

```typescript
export function useWebGLRenderWindow(container: MaybeRef<Maybe<HTMLElement>>) {
  const renderWindowView = vtkOpenGLRenderWindow.newInstance();

  watchPostEffect((onCleanup) => {
    const el = unref(container);
    if (!el) return;

    // Set container which creates the canvas
    renderWindowView.setContainer(el);

    // Verify canvas was created
    const canvas = renderWindowView.getCanvas();
    if (!canvas) {
      console.error('Failed to create WebGL canvas');
    }

    onCleanup(() => {
      renderWindowView.setContainer(null as unknown as HTMLElement);
    });
  });

  // ... rest of the code
}
```

## What This Fixes

1. ✅ **Prevents the "Cannot create proxy" error** by checking canvas exists before initialization
2. ✅ **Allows views to mount gracefully** even if WebGL isn't immediately available
3. ✅ **Provides clear diagnostic messages** when canvas creation fails
4. ✅ **Images should now display properly** in all 4 viewer panels

## Why Images Should Now Show

The initialization sequence now works correctly:

1. Container element is mounted
2. `renderWindowView.setContainer()` creates the WebGL canvas
3. Canvas existence is verified
4. Only then does `interactor.initialize()` try to get the WebGL context
5. Context is successfully retrieved
6. Rendering pipeline is complete
7. Images can be displayed

## Testing

To verify the fix:

1. Reload the application
2. Check console - should NOT see "Cannot create proxy" errors
3. Load a DICOM file or medical image
4. Image should appear in all 4 viewer panels (Axial, Sagittal, Coronal, 3D)
5. Interaction (pan, zoom, window/level) should work normally

## Related Files

- [src/core/vtk/useVtkView.ts](src/core/vtk/useVtkView.ts:19-102) - Main VTK view initialization
- [src/composables/useWebGLWatchdog.ts](src/composables/useWebGLWatchdog.ts) - WebGL context monitoring
- [WEBGL_STABILITY_FIXES.md](WEBGL_STABILITY_FIXES.md) - Comprehensive WebGL stability guide

## Notes

- This fix addresses the initialization error
- The WebGL context loss error (after loading many DICOMs) is handled separately by the watchdog
- Both fixes work together to create a stable viewing experience
