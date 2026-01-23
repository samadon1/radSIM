import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { RadiologyCaseMetadata, CaseLibrary } from '@/src/types/caseLibrary';

export const useCaseLibraryStore = defineStore('caseLibrary', () => {
  // State
  const cases = ref<RadiologyCaseMetadata[]>([]);
  const currentCase = ref<RadiologyCaseMetadata | null>(null);
  const libraryMetadata = ref<CaseLibrary['metadata'] | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const hasCases = computed(() => cases.value.length > 0);
  const hasCurrentCase = computed(() => currentCase.value !== null);

  // Actions
  const loadLibrary = async (libraryPath = '/cases/chest-xray-library.json') => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(libraryPath);
      if (!response.ok) {
        throw new Error(`Failed to load case library: ${response.statusText}`);
      }

      const library: CaseLibrary = await response.json();
      cases.value = library.cases;
      libraryMetadata.value = library.metadata;

      console.log(`Loaded ${cases.value.length} cases from library: ${library.metadata.name}`);
    } catch (err) {
      console.error('Error loading case library:', err);
      error.value = err instanceof Error ? err.message : 'Failed to load case library';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const selectCase = (caseId: string) => {
    const foundCase = cases.value.find((c) => c.id === caseId);
    if (foundCase) {
      currentCase.value = foundCase;
      console.log(`Selected case: ${foundCase.title} (${foundCase.id})`);
    } else {
      console.warn(`Case with ID ${caseId} not found`);
    }
  };

  const selectCaseByMetadata = (caseMetadata: RadiologyCaseMetadata) => {
    currentCase.value = caseMetadata;
    console.log(`Selected case: ${caseMetadata.title} (${caseMetadata.id})`);
  };

  const clearCurrentCase = () => {
    currentCase.value = null;
  };

  const getCaseById = (caseId: string): RadiologyCaseMetadata | undefined => {
    return cases.value.find((c) => c.id === caseId);
  };

  const getCasesBySkillLevel = (skillLevel: 'beginner' | 'intermediate' | 'advanced') => {
    return cases.value.filter((c) => c.skillLevel === skillLevel);
  };

  const getCasesByModality = (modality: string) => {
    return cases.value.filter((c) => c.modality === modality);
  };

  const getCasesByTag = (tag: string) => {
    return cases.value.filter((c) => c.tags.includes(tag));
  };

  const searchCases = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return cases.value.filter(
      (c) =>
        c.title.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery) ||
        c.diagnosis.toLowerCase().includes(lowerQuery) ||
        c.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  };

  return {
    // State
    cases,
    currentCase,
    libraryMetadata,
    loading,
    error,

    // Computed
    hasCases,
    hasCurrentCase,

    // Actions
    loadLibrary,
    selectCase,
    selectCaseByMetadata,
    clearCurrentCase,
    getCaseById,
    getCasesBySkillLevel,
    getCasesByModality,
    getCasesByTag,
    searchCases,
  };
});
