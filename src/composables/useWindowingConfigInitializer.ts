import { MaybeRef, computed, unref } from 'vue';
import { watchImmediate } from '@vueuse/core';
import { useImage } from '@/src/composables/useCurrentImage';
import { getWindowLevels, useDICOMStore } from '@/src/store/datasets-dicom';
import { useWindowingStore } from '@/src/store/view-configs/windowing';
import { Maybe } from '@/src/types';
import { useResetViewsEvents } from '@/src/components/tools/ResetViews.vue';
import { isDicomImage } from '@/src/utils/dataSelection';
import { WL_AUTO_DEFAULT } from '../constants';

export function useWindowingConfigInitializer(
  viewID: MaybeRef<string>,
  imageID: MaybeRef<Maybe<string>>
) {
  const { imageData } = useImage(imageID);
  const dicomStore = useDICOMStore();

  const store = useWindowingStore();
  const firstTag = computed(() => {
    const id = unref(imageID);
    if (id && isDicomImage(id)) {
      const windowLevels = getWindowLevels(dicomStore.volumeInfo[id]);
      if (windowLevels.length) {
        return windowLevels[0];
      }
    }
    return undefined;
  });

  // Compute window/level from image data range for non-DICOM images
  const imageDataRange = computed(() => {
    const image = imageData.value;
    if (!image) return undefined;
    const scalars = image.getPointData()?.getScalars();
    if (!scalars) return undefined;
    const range = scalars.getRange(0);
    if (range) {
      const [min, max] = range;
      return {
        width: max - min,
        level: (max + min) / 2,
      };
    }
    return undefined;
  });

  function resetWidthLevel() {
    const imageIdVal = unref(imageID);
    const viewIdVal = unref(viewID);
    if (imageIdVal == null) {
      return;
    }

    store.updateConfig(viewIdVal, imageIdVal, {
      auto: WL_AUTO_DEFAULT,
    });

    const firstTagVal = unref(firstTag);
    if (firstTagVal?.width) {
      store.updateConfig(viewIdVal, imageIdVal, {
        width: firstTagVal.width,
        level: firstTagVal.level,
      });
    } else {
      // For non-DICOM images, use computed data range as fallback
      const dataRange = unref(imageDataRange);
      if (dataRange) {
        store.updateConfig(viewIdVal, imageIdVal, {
          width: dataRange.width,
          level: dataRange.level,
        });
      }
    }

    const widthLevel = store.runtimeConfigWindowLevel;
    if (widthLevel) {
      store.updateConfig(viewIdVal, imageIdVal, {
        ...widthLevel,
      });
    }
  }

  watchImmediate(
    [imageData],
    () => {
      const imageIdValue = unref(imageID);
      if (!imageData.value || !imageIdValue) {
        return;
      }

      const config = store.getConfig(unref(viewID), imageIdValue).value;
      if (config?.userTriggered) {
        return;
      }

      resetWidthLevel();
    },
    { deep: true }
  );

  useResetViewsEvents().onClick(() => {
    resetWidthLevel();
  });
}
