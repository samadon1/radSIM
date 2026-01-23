import { captureMessage } from '@sentry/vue';
import { useEventListener, useThrottleFn } from '@vueuse/core';
import { Messages } from '@/src/constants';
import { useMessageStore } from '@/src/store/messages';
import { View } from '@/src/core/vtk/types';
import { vtkFieldRef } from '@/src/core/vtk/vtkFieldRef';
import { MaybeRef, computed, unref } from 'vue';
import { Maybe } from '@/src/types';

const THROTTLE_THRESHOLD = 250; // ms

/**
 * Collects relevant context for debugging 3D crashes.
 * @returns
 */
function getVolumeMapperContext(view: View) {
  const ren = view.renderer;
  const vol = ren.getVolumes()[0];
  if (!vol) return null;

  const mapper = vol.getMapper();
  if (!mapper) return null;

  return mapper.get(
    'computeNormalFromOpacity',
    'autoAdjustSampleDistances',
    'maximumSamplesPerRay',
    'sampleDistance',
    'volumetricScatteringBlending'
  );
}

export function useWebGLWatchdog(view: MaybeRef<Maybe<View>>) {
  const reportError = useThrottleFn((event?: Event) => {
    // Prevent default to allow context restoration
    if (event) {
      event.preventDefault();
    }

    const messageStore = useMessageStore();
    messageStore.addError(Messages.WebGLLost.title, Messages.WebGLLost.details);

    const contexts: Record<string, any> = {};
    const viewVal = unref(view);
    if (viewVal) {
      contexts.vtk = getVolumeMapperContext(viewVal);
    }

    captureMessage('WebGL2 context was lost', { contexts });
  }, THROTTLE_THRESHOLD);

  const handleContextRestored = useThrottleFn(() => {
    const messageStore = useMessageStore();
    messageStore.addSuccess('WebGL Context Restored', 'The 3D viewer has been restored. You may need to reload your data.');

    const viewVal = unref(view);
    if (viewVal) {
      // Force re-render when context is restored
      try {
        viewVal.requestRender({ immediate: true });
      } catch (error) {
        console.error('Failed to restore render:', error);
      }
    }

    captureMessage('WebGL2 context was restored');
  }, THROTTLE_THRESHOLD);

  const renWinView = computed(() => unref(view)?.renderWindowView);
  const canvas = vtkFieldRef(renWinView, 'canvas');

  // Listen for both context loss and restoration
  useEventListener(canvas, 'webglcontextlost', reportError);
  useEventListener(canvas, 'webglcontextrestored', handleContextRestored);
}
