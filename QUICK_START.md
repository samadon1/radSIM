# RADSIM Quick Start Guide

## What We Built Today

RADSIM now has a complete **case library system** for educational radiology training, with:
- ✅ Professional case gallery UI
- ✅ Image detection in AI assistant
- ✅ Enterprise-grade minimalistic design
- ✅ Automated data curation tools
- ✅ Complete metadata schema

## Current Status

**Working**:
- WebGL stability (fixed GPU blacklist issue)
- Clean UI (removed NVIDIA modules, simplified interface)
- Case gallery component (filtering, search ready)
- Sample case library with 5 template cases

**Next Step**: Populate with real chest X-ray data

## How to Populate Case Library

### Step 1: Download NIH Dataset

**Option A: NIH Chest X-Ray Dataset** (Recommended)
- Size: ~45GB
- Cases: 112,120 images
- URL: https://nihcc.app.box.com/v/ChestXray-NIHCC

Download these files:
```
Data_Entry_2017.csv          (metadata)
BBox_List_2017.csv           (bounding boxes)
images_001.tar.gz            (images part 1)
images_002.tar.gz            (images part 2)
... through images_012.tar.gz
```

**Option B: Shenzhen TB Dataset** (Smaller, for testing)
- Size: ~500MB
- Cases: 662 images
- URL: https://www.kaggle.com/datasets/raddar/tuberculosis-chest-xrays-shenzhen

```bash
# If you have Kaggle CLI
kaggle datasets download -d raddar/tuberculosis-chest-xrays-shenzhen
unzip tuberculosis-chest-xrays-shenzhen.zip
```

### Step 2: Extract Images

```bash
# Create directory for NIH data
mkdir -p ~/Downloads/nih-chest-xray
cd ~/Downloads/nih-chest-xray

# Extract all image archives
for file in images_*.tar.gz; do
  tar -xzf "$file"
done

# You should now have a folder with ~112K .png files
```

### Step 3: Run Curation Script

```bash
cd /Users/mac/RADSIM/volview-gtc2025-demo

# Install dependencies
pip install pandas pillow

# Run curation (dry run first to verify)
python scripts/curate_nih_cases.py \
  --csv ~/Downloads/nih-chest-xray/Data_Entry_2017.csv \
  --images ~/Downloads/nih-chest-xray/images \
  --output ./public/cases \
  --dry-run

# If dry run looks good, run for real
python scripts/curate_nih_cases.py \
  --csv ~/Downloads/nih-chest-xray/Data_Entry_2017.csv \
  --images ~/Downloads/nih-chest-xray/images \
  --output ./public/cases
```

This will:
- Select 20 educational cases (3 normal, 5 pneumonia, 3 cardiomegaly, etc.)
- Copy images to `public/cases/images/`
- Generate thumbnails in `public/cases/thumbnails/`
- Create `public/cases/chest-xray-library.json`

### Step 4: Manual Curation

Open `public/cases/chest-xray-library.json` and enhance each case:

```json
{
  "id": "cxr-001",
  "title": "Right Lower Lobe Pneumonia",

  // ADD THESE:
  "clinicalHistory": "62-year-old female with fever, productive cough, and dyspnea for 3 days",

  "findings": [{
    "name": "Right lower lobe consolidation",
    "location": "Right lower lobe, posterior segment",
    "description": "Dense opacity with air bronchograms, obscuring right hemidiaphragm"
  }],

  "differential": [
    "Bacterial pneumonia (most likely)",
    "Atypical pneumonia",
    "Aspiration pneumonia"
  ],

  "hints": [
    {"level": 1, "text": "Compare the right and left lung bases"},
    {"level": 2, "text": "Notice the silhouette sign - right hemidiaphragm border is lost"},
    {"level": 3, "text": "Dense consolidation with air bronchograms in right lower lobe"}
  ],

  "teachingPoints": [
    {"category": "pathology", "text": "Air bronchograms indicate alveolar consolidation"},
    {"category": "pathology", "text": "Silhouette sign: loss of border between structures of similar density"}
  ]
}
```

### Step 5: Test in Browser

```bash
# Start development server
npm run dev

# Navigate to http://localhost:5173
# You should see the case gallery on the welcome page
```

## Quick Command Reference

```bash
# Start RADSIM
npm run dev

# Run curation script
python scripts/curate_nih_cases.py --csv [CSV] --images [DIR] --output ./public/cases

# Generate thumbnails only
python scripts/generate_thumbnails.py \
  --input ./public/cases/images \
  --output ./public/cases/thumbnails

# Check GPU status (if WebGL issues)
# Open in Chrome: chrome://gpu
```

## File Locations

```
volview-gtc2025-demo/
├── public/cases/
│   ├── chest-xray-library.json    # Case metadata
│   ├── images/                     # Full-size images
│   └── thumbnails/                 # Web thumbnails
│
├── src/
│   ├── types/caseLibrary.ts       # Type definitions
│   ├── store/case-library.ts      # Pinia store
│   ├── components/
│   │   ├── CaseGallery.vue        # Gallery UI
│   │   ├── WelcomePage.vue        # Entry point
│   │   └── EducationModule.vue    # AI Assistant
│   └── store/education.ts         # Chat + image detection
│
├── scripts/
│   ├── curate_nih_cases.py        # Automated curation
│   └── generate_thumbnails.py     # Thumbnail generator
│
└── docs/
    ├── CASE_LIBRARY_SETUP.md      # Full setup guide
    ├── SESSION_SUMMARY.md         # Today's work summary
    └── QUICK_START.md             # This file
```

## Troubleshooting

### WebGL Context Lost
```bash
# Clear Chrome GPU cache
rm -rf ~/Library/Application\ Support/Google/Chrome/GPUCache

# Restart Chrome
# Check chrome://gpu to verify WebGL is enabled
```

### Images Not Loading
- Verify files exist in `public/cases/images/`
- Check browser console for 404 errors
- Ensure paths in JSON match actual files

### No Cases in Gallery
- Check `public/cases/chest-xray-library.json` exists
- Verify JSON is valid (use jsonlint.com)
- Check browser network tab for fetch errors

## What to Curate Next

After initial 20 cases, expand to:

1. **Intermediate Cases** (10-15 cases)
   - Multiple findings
   - Subtle pathology
   - Atypical presentations

2. **Advanced Cases** (5-10 cases)
   - Rare conditions
   - Complex differential diagnoses
   - Multiple competing findings

3. **Other Modalities**
   - CT chest (lung nodules, PE)
   - Brain MRI (stroke, tumors)
   - Abdominal CT (appendicitis, bowel obstruction)

## Resources

- **NIH Dataset Info**: https://nihcc.app.box.com/v/ChestXray-NIHCC/folder/36938765345
- **Chest X-Ray Reading**: https://radiopaedia.org/articles/chest-x-ray
- **Teaching Files**: https://www.radiologymasterclass.co.uk/

---

**Ready to Start?**
1. Download NIH dataset (~45GB)
2. Run `python scripts/curate_nih_cases.py`
3. Manually enhance case metadata
4. Test in browser

**Questions?** See [CASE_LIBRARY_SETUP.md](CASE_LIBRARY_SETUP.md) for detailed instructions.
