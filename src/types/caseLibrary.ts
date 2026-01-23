/**
 * Case Library Type Definitions
 *
 * Defines the structure for educational radiology cases
 */

export type Modality = 'CR' | 'DX' | 'CT' | 'MR' | 'US' | 'NM' | 'PET' | 'MG';
export type ViewPosition = 'PA' | 'AP' | 'Lateral' | 'Oblique' | 'Axial' | 'Sagittal' | 'Coronal';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Finding/pathology in a case
 */
export interface CaseFinding {
  /** Name of the finding (e.g., "Pneumonia", "Cardiomegaly") */
  name: string;
  /** Severity level (mild, moderate, severe) */
  severity?: 'mild' | 'moderate' | 'severe';
  /** Location in the image (e.g., "Right lower lobe", "Left hemithorax") */
  location?: string;
  /** Additional descriptive details */
  description?: string;
  /** Bounding box or region of interest [x, y, width, height] */
  roi?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Educational hints for learners
 */
export interface CaseHint {
  /** Hint level (1 = subtle, 3 = explicit) */
  level: 1 | 2 | 3;
  /** Hint text */
  text: string;
}

/**
 * Teaching points for the case
 */
export interface TeachingPoint {
  /** Category (anatomy, pathology, differential) */
  category: 'anatomy' | 'pathology' | 'differential' | 'technique' | 'clinical';
  /** Teaching point text */
  text: string;
}

/**
 * Metadata for a single radiology case
 */
export interface RadiologyCaseMetadata {
  /** Unique case identifier */
  id: string;

  /** Case title */
  title: string;

  /** Brief description of the case */
  description: string;

  /** Imaging modality */
  modality: Modality;

  /** View/orientation */
  viewPosition?: ViewPosition;

  /** Target skill level */
  skillLevel: SkillLevel;

  /** Anatomical region (e.g., "Chest", "Abdomen", "Brain") */
  anatomicalRegion: string;

  /** Clinical presentation/history */
  clinicalHistory?: string;

  /** Patient demographics (anonymized) */
  demographics?: {
    age?: number;
    sex?: 'M' | 'F' | 'Other';
  };

  /** Primary diagnosis */
  diagnosis: string;

  /** List of findings */
  findings: CaseFinding[];

  /** Differential diagnoses to consider */
  differential?: string[];

  /** Progressive hints for learners */
  hints?: CaseHint[];

  /** Teaching points */
  teachingPoints?: TeachingPoint[];

  /** File information */
  files: {
    /** Path to the image file(s) */
    imagePath: string | string[];
    /** Thumbnail image path */
    thumbnailPath?: string;
  };

  /** Tags for search/filtering */
  tags: string[];

  /** Dataset source */
  source: {
    /** Source dataset name (e.g., "NIH Chest X-Ray") */
    dataset: string;
    /** Original image ID from source dataset */
    originalId?: string;
    /** License information */
    license?: string;
    /** Attribution */
    attribution?: string;
  };

  /** Curation metadata */
  metadata: {
    /** Date added to library */
    dateAdded: string;
    /** Curator/author */
    curator?: string;
    /** Last modified date */
    lastModified?: string;
    /** Version number */
    version?: string;
  };
}

/**
 * Case library collection
 */
export interface CaseLibrary {
  /** Library metadata */
  metadata: {
    name: string;
    version: string;
    description: string;
    lastUpdated: string;
  };

  /** Collection of cases */
  cases: RadiologyCaseMetadata[];
}

/**
 * Search/filter criteria for cases
 */
export interface CaseSearchCriteria {
  modality?: Modality | Modality[];
  anatomicalRegion?: string | string[];
  skillLevel?: SkillLevel | SkillLevel[];
  diagnosis?: string;
  tags?: string[];
  searchText?: string;
}
