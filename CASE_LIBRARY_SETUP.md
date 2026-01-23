# Case Library Setup Guide

## Overview

The RADSIM case library system provides an educational platform for radiology learners to explore curated medical imaging cases. This guide covers the architecture, setup, and data curation process.

## Architecture

### Components Created

1. **Type Definitions** ([src/types/caseLibrary.ts](src/types/caseLibrary.ts))
   - `RadiologyCaseMetadata`: Comprehensive metadata for each case
   - `CaseLibrary`: Collection structure with versioning
   - `CaseFinding`, `CaseHint`, `TeachingPoint`: Educational elements

2. **Pinia Store** ([src/store/case-library.ts](src/store/case-library.ts))
   - Manages case library state
   - Provides filtering and search capabilities
   - Tracks current selected case

3. **UI Components**
   - `CaseGallery.vue`: Grid view of available cases with filtering
   - Updated `WelcomePage.vue`: Toggle between case library and file upload
   - Updated `EducationModule.vue`: Minimalistic enterprise AI assistant

4. **Data Structure** ([public/cases/chest-xray-library.json](public/cases/chest-xray-library.json))
   - Sample case library with 5 example cases
   - Ready for real data population

## Case Metadata Schema

Each case includes:

```typescript
{
  id: string;                    // Unique identifier
  title: string;                 // Display title
  description: string;           // Brief overview
  modality: Modality;           // DX, CT, MR, etc.
  skillLevel: SkillLevel;       // beginner, intermediate, advanced
  anatomicalRegion: string;     // Chest, Abdomen, Brain, etc.

  diagnosis: string;            // Primary diagnosis
  findings: CaseFinding[];      // List of findings with locations
  differential: string[];       // Differential diagnoses

  hints: CaseHint[];           // Progressive hints for learners
  teachingPoints: TeachingPoint[]; // Educational content

  files: {
    imagePath: string | string[];
    thumbnailPath?: string;
  };

  tags: string[];              // For search/filtering
  source: {                    // Dataset attribution
    dataset: string;
    license: string;
  };
}
```

## Data Curation Workflow

### Phase 1: Download NIH Chest X-Ray Dataset

**NIH Chest X-Ray Dataset** (Recommended starting point)
- **Size**: 112,120 images
- **Format**: PNG (converted from DICOM)
- **License**: CC0 1.0 Universal (Public Domain)
- **Download**: https://nihcc.app.box.com/v/ChestXray-NIHCC

#### Download Instructions:

```bash
# Create data directory
mkdir -p /Users/mac/RADSIM/volview-gtc2025-demo/public/cases/images
mkdir -p /Users/mac/RADSIM/volview-gtc2025-demo/public/cases/thumbnails

# Download NIH dataset (you'll need to download from Box manually)
# Files are split into ~45GB total across multiple archives

# Dataset structure:
# - images_001.tar.gz through images_012.tar.gz (image files)
# - Data_Entry_2017.csv (labels and metadata)
# - BBox_List_2017.csv (bounding boxes for findings)
```

#### Alternative: Shenzhen TB Dataset (Smaller, focused on TB)
- **Size**: 662 images (336 normal, 326 TB cases)
- **Format**: PNG
- **License**: CC0 1.0 Universal
- **Download**: https://www.kaggle.com/datasets/raddar/tuberculosis-chest-xrays-shenzhen

```bash
# Download from Kaggle
kaggle datasets download -d raddar/tuberculosis-chest-xrays-shenzhen
unzip tuberculosis-chest-xrays-shenzhen.zip -d public/cases/raw-data/shenzhen-tb
```

### Phase 2: Curate Initial Case Set

Recommended approach: Start with **10-20 high-quality cases** covering:

1. **Normal Cases** (2-3 cases)
   - Reference for comparison
   - Teaching normal anatomy

2. **Pneumonia** (3-5 cases)
   - Different locations (RLL, LLL, RUL, etc.)
   - Varying severity
   - Air bronchograms

3. **Cardiomegaly** (2-3 cases)
   - With/without pulmonary edema
   - Teaching cardiothoracic ratio

4. **Pleural Effusion** (2-3 cases)
   - Unilateral and bilateral
   - Different volumes

5. **Tuberculosis** (2-3 cases)
   - Cavitary lesions
   - Infiltrates
   - From Shenzhen dataset

#### Curation Script Template

```python
# curate_cases.py
import pandas as pd
import json
import shutil
from pathlib import Path

# Load NIH metadata
df = pd.read_csv('Data_Entry_2017.csv')

# Filter for specific conditions
pneumonia_cases = df[df['Finding Labels'].str.contains('Pneumonia')].head(5)
cardiomegaly_cases = df[df['Finding Labels'].str.contains('Cardiomegaly')].head(3)
effusion_cases = df[df['Finding Labels'].str.contains('Effusion')].head(3)
normal_cases = df[df['Finding Labels'] == 'No Finding'].head(2)

# Create case metadata
def create_case_metadata(row, case_id, diagnosis, skill_level='beginner'):
    return {
        'id': case_id,
        'title': f'{diagnosis} - Case {case_id}',
        'description': f'Chest X-ray demonstrating {diagnosis.lower()}',
        'modality': 'DX',
        'viewPosition': row['View Position'] if 'View Position' in row else 'PA',
        'skillLevel': skill_level,
        'anatomicalRegion': 'Chest',
        'diagnosis': diagnosis,
        'findings': [],  # To be manually curated
        'files': {
            'imagePath': f'cases/images/{row["Image Index"]}',
            'thumbnailPath': f'cases/thumbnails/{row["Image Index"]}'
        },
        'tags': diagnosis.lower().split(),
        'source': {
            'dataset': 'NIH Chest X-Ray Dataset',
            'originalId': row['Image Index'],
            'license': 'CC0 1.0 Universal'
        }
    }

# Generate initial metadata (to be enhanced manually)
cases = []
for idx, row in pneumonia_cases.iterrows():
    cases.append(create_case_metadata(row, f'cxr-{len(cases)+1:03d}', 'Pneumonia'))

# Save to JSON
library = {
    'metadata': {
        'name': 'RADSIM Chest X-Ray Case Library',
        'version': '1.0.0',
        'lastUpdated': '2025-12-23'
    },
    'cases': cases
}

with open('public/cases/chest-xray-library.json', 'w') as f:
    json.dump(library, f, indent=2)
```

### Phase 3: Generate Thumbnails

```bash
# Using ImageMagick
for img in public/cases/images/*.png; do
  convert "$img" -resize 640x360^ -gravity center -extent 640x360 \
    "public/cases/thumbnails/$(basename $img)"
done

# Or using Python/PIL
python -c "
from PIL import Image
from pathlib import Path

images_dir = Path('public/cases/images')
thumbs_dir = Path('public/cases/thumbnails')
thumbs_dir.mkdir(exist_ok=True)

for img_path in images_dir.glob('*.png'):
    img = Image.open(img_path)
    img.thumbnail((640, 360), Image.Resampling.LANCZOS)
    img.save(thumbs_dir / img_path.name)
"
```

### Phase 4: Manual Curation

For each selected case:

1. **Review the image** - Ensure quality and clarity
2. **Add findings** - Document visible pathology with locations
3. **Write description** - Clear, educational description
4. **Add teaching points** - Key learning objectives
5. **Create hints** - Progressive disclosure for learners
6. **Verify metadata** - Demographics, clinical history

## Current Status

✅ **Completed:**
- Type definitions and schema design
- Pinia store for case library management
- CaseGallery UI component with filtering
- WelcomePage integration with toggle
- Sample case library JSON with 5 template cases
- Image detection in AI assistant

⏳ **Pending:**
- Download actual NIH/Shenzhen chest X-ray data
- Generate thumbnails for selected cases
- Manually curate 10-20 initial cases with complete metadata
- Convert PNG images to DICOM format (if needed for VolView)
- Integrate case selection with DICOM loader

## Image Format Notes

### Current VolView Support
VolView natively supports:
- DICOM (.dcm)
- NRRD (.nrrd)
- NIfTI (.nii, .nii.gz)
- MetaImage (.mha, .mhd)

### NIH Dataset Format
- Images are in **PNG format**
- Need conversion to DICOM for full VolView compatibility

### Conversion Options

**Option 1: Use PNG directly**
- Modify VolView to support PNG loading
- Simpler but loses DICOM metadata

**Option 2: Convert PNG to DICOM**
```python
# Using pydicom
import pydicom
from pydicom.dataset import FileDataset, FileMetaDataset
from PIL import Image
import numpy as np

def png_to_dicom(png_path, dcm_path, metadata):
    # Load PNG
    img = Image.open(png_path).convert('L')  # Grayscale
    pixel_array = np.array(img)

    # Create DICOM dataset
    file_meta = FileMetaDataset()
    file_meta.TransferSyntaxUID = pydicom.uid.ExplicitVRLittleEndian

    ds = FileDataset(dcm_path, {}, file_meta=file_meta, preamble=b"\0" * 128)

    # Set required DICOM tags
    ds.PatientName = metadata.get('PatientName', 'Anonymous')
    ds.Modality = 'DX'
    ds.SeriesDescription = metadata.get('SeriesDescription', 'Chest X-Ray')
    ds.Rows, ds.Columns = pixel_array.shape
    ds.PhotometricInterpretation = 'MONOCHROME2'
    ds.SamplesPerPixel = 1
    ds.BitsStored = 8
    ds.BitsAllocated = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0
    ds.PixelData = pixel_array.tobytes()

    # Save
    ds.save_as(dcm_path)
```

## Next Steps

1. **Download Dataset**
   ```bash
   # Download NIH dataset from Box.com
   # or Shenzhen TB dataset from Kaggle
   ```

2. **Run Curation Script**
   ```bash
   python scripts/curate_cases.py
   ```

3. **Generate Thumbnails**
   ```bash
   bash scripts/generate_thumbnails.sh
   ```

4. **Manual Review**
   - Open `public/cases/chest-xray-library.json`
   - Enhance each case with findings, teaching points, hints

5. **Test Integration**
   ```bash
   npm run dev
   # Navigate to welcome page
   # Click on a case
   # Verify it loads in viewer
   ```

## Future Enhancements

- [ ] Add search functionality to case gallery
- [ ] Implement case progress tracking (completed/in-progress)
- [ ] Add bookmarking/favorites
- [ ] Create case-specific AI prompts for the assistant
- [ ] Add quiz mode with self-assessment
- [ ] Support for multi-image cases (multi-view, follow-up studies)
- [ ] Integration with MIMIC-CXR for cases with radiology reports
- [ ] Collaborative features (annotations, discussions)

## Resources

### Datasets
- NIH Chest X-Ray: https://nihcc.app.box.com/v/ChestXray-NIHCC
- Shenzhen TB: https://www.kaggle.com/datasets/raddar/tuberculosis-chest-xrays-shenzhen
- MIMIC-CXR: https://physionet.org/content/mimic-cxr/2.0.0/

### Tools
- ImageMagick: https://imagemagick.org/
- pydicom: https://pydicom.github.io/
- ITK-WASM: https://wasm.itk.org/

### References
- DICOM Standard: https://www.dicomstandard.org/
- VolView Documentation: https://github.com/Kitware/VolView
