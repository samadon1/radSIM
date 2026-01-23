# WebGL Stability Fixes for RADSIM

## Problem Description

The application crashes when loading DICOM chest X-rays with the error:
```
Viewer Error
Lost the WebGL context! Please reload the webpage. If the problem persists, you may need to restart your web browser.
```

This error appears multiple times, indicating the WebGL context is being lost repeatedly.

## Root Causes

WebGL context loss typically occurs due to:

1. **GPU Memory Exhaustion**: Medical images (especially DICOM) are large and can exhaust GPU memory
2. **Too Many Textures**: Loading multiple images without proper cleanup creates too many GPU textures
3. **Driver Timeouts**: Complex rendering operations taking too long (TDR - Timeout Detection and Recovery)
4. **Browser Limits**: Browsers limit WebGL contexts per page (typically 16-32)
5. **Memory Leaks**: VTK objects not properly cleaned up when components unmount

## Current Implementation

The application already has:
- `useWebGLWatchdog` composable that detects context loss ([src/composables/useWebGLWatchdog.ts](src/composables/useWebGLWatchdog.ts:33))
- Error reporting to Sentry
- Proper VTK cleanup in `useVtkView` ([src/core/vtk/useVtkView.ts](src/core/vtk/useVtkView.ts:132-138))

However, it only **detects** the problem, doesn't **prevent** or **recover** from it.

## Solutions to Implement

### 1. Add WebGL Context Restoration (Immediate Fix)

The watchdog currently only reports errors. We need to add context restoration:

**File**: [src/composables/useWebGLWatchdog.ts](src/composables/useWebGLWatchdog.ts)

```typescript
export function useWebGLWatchdog(view: MaybeRef<Maybe<View>>) {
  const reportError = useThrottleFn(() => {
    const messageStore = useMessageStore();
    messageStore.addError(Messages.WebGLLost.title, Messages.WebGLLost.details);

    const contexts: Record<string, any> = {};
    const viewVal = unref(view);
    if (viewVal) {
      contexts.vtk = getVolumeMapperContext(viewVal);
    }

    captureMessage('WebGL2 context was lost', { contexts });
  }, THROTTLE_THRESHOLD);

  // ADD THIS: Context restoration handler
  const handleContextRestored = useThrottleFn(() => {
    const viewVal = unref(view);
    if (viewVal) {
      // Force re-render when context is restored
      viewVal.requestRender({ immediate: true });
    }
  }, THROTTLE_THRESHOLD);

  const renWinView = computed(() => unref(view)?.renderWindowView);
  const canvas = vtkFieldRef(renWinView, 'canvas');

  // Listen for both loss and restoration
  useEventListener(canvas, 'webglcontextlost', (event) => {
    event.preventDefault(); // Prevent default can allow restoration
    reportError();
  });

  useEventListener(canvas, 'webglcontextrestored', handleContextRestored);
}
```

### 2. Implement Texture Memory Management

**File**: Create [src/utils/webglMemoryManager.ts](src/utils/webglMemoryManager.ts)

```typescript
/**
 * WebGL Memory Manager for Medical Imaging
 * Prevents context loss by managing GPU memory usage
 */

export class WebGLMemoryManager {
  private static instance: WebGLMemoryManager;
  private textureCache = new Map<string, WeakRef<any>>();
  private maxTextures = 16; // Conservative limit
  private currentTextureCount = 0;

  static getInstance() {
    if (!this.instance) {
      this.instance = new WebGLMemoryManager();
    }
    return this.instance;
  }

  registerTexture(id: string, texture: any) {
    if (this.currentTextureCount >= this.maxTextures) {
      this.cleanupOldTextures();
    }
    this.textureCache.set(id, new WeakRef(texture));
    this.currentTextureCount++;
  }

  unregisterTexture(id: string) {
    if (this.textureCache.has(id)) {
      this.textureCache.delete(id);
      this.currentTextureCount--;
    }
  }

  cleanupOldTextures() {
    // Remove oldest textures (FIFO)
    const keysToRemove = Array.from(this.textureCache.keys()).slice(0, 4);
    keysToRemove.forEach(key => {
      const ref = this.textureCache.get(key);
      const texture = ref?.deref();
      if (texture && texture.delete) {
        texture.delete();
      }
      this.textureCache.delete(key);
    });
    this.currentTextureCount -= keysToRemove.length;
  }

  getMemoryInfo() {
    return {
      textureCount: this.currentTextureCount,
      maxTextures: this.maxTextures,
      utilization: (this.currentTextureCount / this.maxTextures) * 100,
    };
  }
}
```

### 3. Add Image Streaming for Large DICOM Files

For chest X-rays and large images, implement progressive loading:

**File**: [src/core/streaming/dicomChunkImage.ts](src/core/streaming/dicomChunkImage.ts) (already exists)

Ensure it's being used for all DICOM loads. Add memory-conscious settings:

```typescript
// In image loading code
const streamingOptions = {
  maxTextureSize: 4096, // Limit texture size
  useCompression: true,  // Use texture compression if available
  mipMapping: false,     // Disable mipmaps for medical images
};
```

### 4. Implement Automatic Cleanup on Component Unmount

**File**: [src/components/VolumeViewer.vue](src/components/VolumeViewer.vue), [SliceViewer.vue](src/components/SliceViewer.vue), [ObliqueSliceViewer.vue](src/components/ObliqueSliceViewer.vue)

Already properly implemented via `onScopeDispose` in [useVtkView.ts](src/core/vtk/useVtkView.ts:132-138).

Verify all viewer components properly unmount VTK objects.

### 5. Add GPU Memory Monitoring

**File**: Create [src/composables/useGPUMonitor.ts](src/composables/useGPUMonitor.ts)

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { useMessageStore } from '@/src/store/messages';

export function useGPUMonitor() {
  const gpuMemoryUsage = ref(0);
  const isAtRisk = ref(false);
  let monitorInterval: number | null = null;

  const checkGPUMemory = () => {
    // Use WebGL's getParameter to check memory
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const memInfo = gl.getParameter(gl.MAX_TEXTURE_SIZE);

      // Check texture count (simplified)
      const textureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

      // Warn if getting close to limits
      if (textureUnits && textureUnits > 12) {
        isAtRisk.value = true;
        const messageStore = useMessageStore();
        messageStore.addWarning(
          'GPU Memory Warning',
          'GPU memory usage is high. Consider closing some images.'
        );
      }
    }
  };

  onMounted(() => {
    // Check every 10 seconds
    monitorInterval = window.setInterval(checkGPUMemory, 10000);
  });

  onUnmounted(() => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
    }
  });

  return {
    gpuMemoryUsage,
    isAtRisk,
  };
}
```

### 6. Update VTK Rendering Settings

**File**: Modify volume rendering settings in viewer components

```typescript
// In VolumeViewer setup
const mapper = volumeActor.getMapper();

// More conservative settings to prevent GPU timeout
mapper.setAutoAdjustSampleDistances(true);
mapper.setMaximumSamplesPerRay(500); // Reduce from default 1000
mapper.setSampleDistance(1.0); // Increase sample distance

// Disable expensive features for stability
mapper.setComputeNormalFromOpacity(false);
mapper.setVolumetricScatteringBlending(0); // Disable scattering
```

### 7. Add Diagnostic Logging

**File**: Update [src/composables/useWebGLWatchdog.ts](src/composables/useWebGLWatchdog.ts)

Add detailed logging before context loss:

```typescript
function captureWebGLState(gl: WebGL2RenderingContext) {
  return {
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
    renderer: gl.getParameter(gl.RENDERER),
    vendor: gl.getParameter(gl.VENDOR),
    version: gl.getParameter(gl.VERSION),
  };
}
```

## Immediate Action Items

1. **Add context restoration handler** (5 min)
   - Modify [useWebGLWatchdog.ts](src/composables/useWebGLWatchdog.ts)
   - Add `preventDefault()` to context lost event
   - Add `webglcontextrestored` listener

2. **Reduce volume rendering quality** (10 min)
   - Update [VolumeViewer.vue](src/components/VolumeViewer.vue)
   - Lower `maximumSamplesPerRay` to 500
   - Disable expensive shader features

3. **Add memory warnings** (15 min)
   - Create GPU monitor composable
   - Show warning before context loss
   - Suggest closing images

4. **Test with chest X-rays** (20 min)
   - Load multiple DICOM files
   - Monitor console for warnings
   - Verify context restoration works

## Prevention Best Practices

1. **Limit Open Images**: Don't keep more than 4-5 large images loaded simultaneously
2. **Use 2D Slices**: For chest X-rays, use SliceViewer instead of VolumeViewer
3. **Clear Before Loading**: Implement "Clear Scene" before loading new data
4. **Progressive Loading**: Use streaming for large datasets
5. **Browser Settings**: Ensure hardware acceleration is enabled

## Testing Checklist

- [ ] Load single chest X-ray DICOM - should work fine
- [ ] Load 5 chest X-rays sequentially - should show warning
- [ ] Load 10 chest X-rays - should prevent loading or auto-cleanup
- [ ] Trigger context loss manually - should restore gracefully
- [ ] Check console for memory warnings
- [ ] Verify all viewers clean up on unmount

## Related Files

- [src/composables/useWebGLWatchdog.ts](src/composables/useWebGLWatchdog.ts:33) - Main watchdog
- [src/constants.ts](src/constants.ts:14) - Error messages
- [src/core/vtk/useVtkView.ts](src/core/vtk/useVtkView.ts:59) - VTK view setup
- [src/components/VolumeViewer.vue](src/components/VolumeViewer.vue:70) - 3D viewer
- [src/components/SliceViewer.vue](src/components/SliceViewer.vue:189) - 2D viewer
- [src/utils/gpuInfo.ts](src/utils/gpuInfo.ts:17) - GPU detection

## References

- [WebGL Context Loss](https://www.khronos.org/webgl/wiki/HandlingContextLost)
- [VTK.js Memory Management](https://kitware.github.io/vtk-js/docs/develop_requirement.html)
- [Medical Imaging Performance](https://github.com/cornerstonejs/cornerstone/wiki/Performance)
