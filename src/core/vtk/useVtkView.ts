import { onVTKEvent } from '@/src/composables/onVTKEvent';
import { View } from '@/src/core/vtk/types';
import { Maybe } from '@/src/types';
import { batchForNextTask } from '@/src/utils/batchForNextTask';
import { webglTracker } from '@/src/utils/webglContextTracker';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkOpenGLRenderWindow from '@kitware/vtk.js/Rendering/OpenGL/RenderWindow';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { useElementSize } from '@vueuse/core';
import {
  MaybeRef,
  onScopeDispose,
  unref,
  watchEffect,
  watchPostEffect,
} from 'vue';

export function useWebGLRenderWindow(container: MaybeRef<Maybe<HTMLElement>>) {
  const renderWindowView = vtkOpenGLRenderWindow.newInstance({
    // Enable preserveDrawingBuffer for screenshot capture
    // Note: This may impact performance slightly
    preserveDrawingBuffer: true
  });
  let trackerId: string | null = null;

  watchPostEffect((onCleanup) => {
    const el = unref(container);
    if (!el) return;

    // Set container which creates the canvas
    renderWindowView.setContainer(el);

    // Verify canvas was created
    const canvas = renderWindowView.getCanvas();
    if (!canvas) {
      console.error('Failed to create WebGL canvas');
      return;
    }

    // Try to get WebGL context
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      // Track successful context creation
      const componentName = (el.closest('[id]') as HTMLElement)?.id || 'unknown';
      trackerId = webglTracker.trackContextCreation(componentName);
    } else {
      console.error('Failed to get WebGL context from canvas');
      console.error('This usually means:');
      console.error('1. Too many WebGL contexts (limit: ~16 per browser)');
      console.error('2. WebGL is disabled');
      console.error('3. Running in incognito/private mode with restrictions');
      console.error('');
      console.error('Solutions:');
      console.error('- Close other tabs with 3D graphics');
      console.error('- Restart your browser');
      console.error('- Check chrome://gpu to verify WebGL is enabled');

      // Log current stats
      webglTracker.logStats();
    }

    onCleanup(() => {
      renderWindowView.setContainer(null as unknown as HTMLElement);
      if (trackerId) {
        webglTracker.trackContextDestruction(trackerId);
      }
    });
  });

  onScopeDispose(() => {
    renderWindowView.delete();
    if (trackerId) {
      webglTracker.trackContextDestruction(trackerId);
    }
  });

  return renderWindowView;
}

export function useWidgetManager(renderer: vtkRenderer) {
  const manager = vtkWidgetManager.newInstance();
  manager.setRenderer(renderer);

  const updatePickingState = () => {
    const enabled = manager.getPickingEnabled();
    const widgetCount = manager.getWidgets().length;
    if (!enabled && widgetCount) {
      manager.enablePicking();
    } else if (enabled && !widgetCount) {
      manager.disablePicking();
    }
  };

  onVTKEvent(manager, 'onModified', updatePickingState);
  updatePickingState();

  return manager;
}

export function useVtkView(container: MaybeRef<Maybe<HTMLElement>>): View {
  const renderer = vtkRenderer.newInstance();
  const renderWindow = vtkRenderWindow.newInstance();
  renderWindow.addRenderer(renderer);

  // the render window view
  const renderWindowView = useWebGLRenderWindow(container);
  renderWindow.addView(renderWindowView);

  onScopeDispose(() => {
    renderWindow.removeView(renderWindowView);
  });

  // interactor
  const interactor = vtkRenderWindowInteractor.newInstance();
  renderWindow.setInteractor(interactor);
  interactor.setView(renderWindowView);

  watchPostEffect((onCleanup) => {
    const el = unref(container);
    if (!el) return;

    // Wait for canvas to be ready before initializing
    const canvas = renderWindowView.getCanvas();
    if (!canvas) {
      console.warn('Canvas not ready yet, skipping interactor initialization');
      return;
    }

    // Check if WebGL context actually exists
    let context = null;
    try {
      context = renderWindowView.get3DContext?.();
    } catch (error) {
      // get3DContext() throws when trying to create proxy with null WebGL context
      console.error('WebGL context not available. Possible causes:');
      console.error('- Too many WebGL contexts (browser limit reached)');
      console.error('- WebGL disabled in browser settings');
      console.error('- GPU not available');
      console.error('Try closing other tabs with 3D content or restarting the browser');
      return;
    }

    if (!context) {
      console.error('WebGL context not available.');
      return;
    }

    try {
      interactor.initialize();
      interactor.bindEvents(el);
    } catch (error) {
      console.error('Failed to initialize VTK interactor:', error);
      // Don't throw - the error is logged but component can still mount
    }

    onCleanup(() => {
      if (interactor.getContainer()) interactor.unbindEvents();
    });
  });

  // widget manager
  const widgetManager = useWidgetManager(renderer);

  // render API
  const deferredRender = batchForNextTask(() => {
    // don't need to re-render during animation
    if (interactor.isAnimating()) return;
    widgetManager.renderWidgets();
    renderWindow.render();
  });

  const immediateRender = () => {
    if (interactor.isAnimating()) return;
    renderWindow.render();
  };

  const requestRender = ({ immediate } = { immediate: false }) => {
    if (immediate) {
      immediateRender();
    }
    deferredRender();
  };

  onVTKEvent(renderer, 'onModified', () => {
    requestRender();
  });

  // set size
  const setSize = (width: number, height: number) => {
    // ensure we have a non-zero size, otherwise
    // the framebuffers might not be populated correctly
    const scaledWidth = Math.max(1, width * globalThis.devicePixelRatio);
    const scaledHeight = Math.max(1, height * globalThis.devicePixelRatio);
    renderWindowView.setSize(scaledWidth, scaledHeight);
    renderer.resetCameraClippingRange();
    requestRender({ immediate: true });
  };

  const { width, height } = useElementSize(container);
  watchEffect(() => {
    setSize(width.value, height.value);
  });

  // cleanup
  onScopeDispose(() => {
    renderWindow.removeRenderer(renderer);

    renderer.delete();
    renderWindow.delete();
    interactor.delete();
  });

  return {
    renderer,
    renderWindow,
    interactor,
    renderWindowView,
    widgetManager,
    requestRender,
  };
}
