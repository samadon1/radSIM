<template>
  <drag-and-drop enabled @drop-files="loadFiles" id="app-container">
    <template v-slot="{ dragHover }">
      <v-app>
        <app-bar @click:left-menu="leftSideBar = !leftSideBar"></app-bar>
        <v-navigation-drawer
          v-model="leftSideBar"
          app
          clipped
          touchless
          width="500"
          id="left-nav"
        >
          <module-panel ref="modulePanelRef" @close="leftSideBar = false" />
        </v-navigation-drawer>
        <v-main id="content-main">
          <div class="fill-height d-flex flex-row flex-grow-1">
            <controls-strip :has-data="hasData"></controls-strip>
            <div class="d-flex flex-column flex-grow-1">
              <layout-grid :layout="layout" />
            </div>
          </div>
        </v-main>
        <controls-modal />
      </v-app>
      <persistent-overlay
        :disabled="!dragHover"
        color="#000"
        :opacity="0.3"
        :z-index="2000"
        class="text-center"
      >
        <div class="d-flex flex-column align-center justify-center h-100">
          <div class="dnd-prompt">
            <v-icon size="4.75rem">mdi-download</v-icon>
            <div class="text-h2 font-weight-bold">Drop your files to open</div>
          </div>
        </div>
      </persistent-overlay>
    </template>
  </drag-and-drop>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { UrlParams } from '@vueuse/core';
import vtkURLExtract from '@kitware/vtk.js/Common/Core/URLExtract';
import { useRouter } from 'vue-router';
import useLoadDataStore from '@/src/store/load-data';
import { useViewStore } from '@/src/store/views';
import useRemoteSaveStateStore from '@/src/store/remote-save-state';
import AppBar from '@/src/components/AppBar.vue';
import ControlsStrip from '@/src/components/ControlsStrip.vue';
import {
  loadFiles,
  loadUserPromptedFiles,
  loadUrls,
} from '@/src/actions/loadUserFiles';
import { useDICOMStore } from '@/src/store/datasets-dicom';
import LayoutGrid from '@/src/components/LayoutGrid.vue';
import ModulePanel from '@/src/components/ModulePanel.vue';
import DragAndDrop from '@/src/components/DragAndDrop.vue';
import PersistentOverlay from '@/src/components/PersistentOverlay.vue';
import ControlsModal from '@/src/components/ControlsModal.vue';
import { useImageStore } from '@/src/store/datasets-images';
import { useServerStore as useServerStore1 } from '@/src/store/server-1';
import { useServerStore as useServerStore2 } from '@/src/store/server-2';
import { useServerStore as useServerStore3 } from '@/src/store/server-3';
import { useCaseLibraryStore } from '@/src/store/case-library';
import { useLearningStore } from '@/src/store/learning';
import { useGlobalErrorHook } from '@/src/composables/useGlobalErrorHook';
import { useKeyboardShortcuts } from '@/src/composables/useKeyboardShortcuts';
import { useCurrentImage } from '@/src/composables/useCurrentImage';
import {
  populateAuthorizationToken,
  stripTokenFromUrl,
} from '@/src/utils/token';
import { defaultImageMetadata } from '@/src/core/progressiveImage';

export default defineComponent({
  name: 'App',

  components: {
    ControlsStrip,
    LayoutGrid,
    DragAndDrop,
    ModulePanel,
    PersistentOverlay,
    ControlsModal,
    AppBar,
  },

  setup() {
    const router = useRouter();
    const imageStore = useImageStore();
    const dicomStore = useDICOMStore();
    const caseLibraryStore = useCaseLibraryStore();
    const learningStore = useLearningStore();

    useGlobalErrorHook();
    useKeyboardShortcuts();

    // --- file handling --- //

    const loadDataStore = useLoadDataStore();
    const hasData = computed(
      () =>
        imageStore.idList.length > 0 ||
        Object.keys(dicomStore.volumeInfo).length > 0
    );
    // show loading if actually loading or has any data,
    // since the welcome screen shouldn't be visible when
    // a dataset is opened.
    const showLoading = computed(
      () => loadDataStore.isLoading || hasData.value
    );

    // Redirect to dashboard if no data and not loading URLs
    const urlParams = vtkURLExtract.extractURLParameters() as UrlParams;
    const hasUrlsToLoad = !!urlParams.urls;

    // Check if there's a saved session to restore (don't redirect if so)
    // Use a ref so we can update it during restoration
    const isRestoringSession = ref(!!localStorage.getItem('radsim_active_session'));

    watch(hasData, (newHasData) => {
      // Don't redirect while restoring a session - wait for the image to load
      if (!newHasData && !loadDataStore.isLoading && !hasUrlsToLoad && !isRestoringSession.value) {
        router.replace('/dashboard');
      }
    }, { immediate: true });

    const { currentImageMetadata, isImageLoading } = useCurrentImage();
    const defaultImageMetadataName = defaultImageMetadata().name;
    watch(currentImageMetadata, (newMetadata) => {
      let prefix = '';
      if (
        newMetadata?.name &&
        // wait until we get a real name, but if we never do, show default name
        (newMetadata.name !== defaultImageMetadataName || !isImageLoading)
      ) {
        prefix = `${newMetadata.name} -`;
      }
      document.title = `${prefix}VolView`;
    });

    // --- parse URL -- //

    populateAuthorizationToken();
    stripTokenFromUrl();

    onMounted(() => {
      if (!urlParams.urls) {
        return;
      }

      loadUrls(urlParams);
    });

    // --- sidebar (declared early for session restoration) --- //

    const leftSideBar = ref(caseLibraryStore.hasCurrentCase);
    const modulePanelRef = ref<any>(null);

    // --- session restoration --- //

    onMounted(async () => {
      // Try to restore a saved learning session
      if (!isRestoringSession.value) return;

      try {
        const hasRestoredSession = learningStore.loadActiveSession();

        if (hasRestoredSession) {
          console.log('[App] Restored learning session, loading current case');
          const currentCase = learningStore.currentCase;

          if (currentCase) {
            // Select the case in the library store
            caseLibraryStore.selectCaseByMetadata(currentCase);

            // Load the case image
            const imagePaths = Array.isArray(currentCase.files.imagePath)
              ? currentCase.files.imagePath
              : [currentCase.files.imagePath];

            await loadUrls({ urls: imagePaths });

            // Open the sidebar to show the learning module
            leftSideBar.value = true;
          }
        }
      } catch (error) {
        console.error('[App] Failed to restore session:', error);
      } finally {
        // Clear the restoring flag - either success or failure
        isRestoringSession.value = false;
      }
    });

    // --- remote server --- //

    const serverStores = [useServerStore1(), useServerStore2(), useServerStore3()];

    onMounted(() => {
      serverStores.forEach((store) => store.connect());
    });

    // --- save state --- //
    if (import.meta.env.VITE_ENABLE_REMOTE_SAVE && urlParams.save) {
      const url = Array.isArray(urlParams.save)
        ? urlParams.save[0]
        : urlParams.save;
      useRemoteSaveStateStore().setSaveUrl(url);
    }

    // --- layout --- //

    const { layout } = storeToRefs(useViewStore());

    // --- sidebar watch --- //

    // Watch for case selection changes to open sidebar
    watch(() => caseLibraryStore.hasCurrentCase, (hasCase) => {
      if (hasCase && !leftSideBar.value) {
        leftSideBar.value = true;
      }
    });

    return {
      leftSideBar,
      modulePanelRef,
      loadUserPromptedFiles,
      loadFiles,
      hasData,
      showLoading,
      layout,
    };
  },
});
</script>

<style>
#content-main {
  /* disable v-content transition when we resize our app drawer */
  transition: initial;
  width: 100%;
  height: 100%;
  position: fixed;
}

#left-nav {
  border-right: 1px solid rgb(var(--v-theme-background));
}

#content-main > .v-content__wrap {
  display: flex;
}

#module-switcher .v-input__prepend-inner {
  /* better icon alignment */
  margin-top: 15px;
}

.alert > .v-snack__wrapper {
  /* transition background color */
  transition: background-color 0.25s;
}
</style>

<style src="@/src/components/styles/utils.css"></style>

<style scoped>
#app-container {
  width: 100%;
  height: 100%;
}

.dnd-prompt {
  background: rgba(0, 0, 0, 0.4);
  color: white;
  border-radius: 8px;
  box-shadow: 0px 0px 10px 5px rgba(0, 0, 0, 0.4);
  padding: 64px;
}
</style>
