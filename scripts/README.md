# NIH Dataset Download & Processing Scripts

## Quick Start

### 1. Install Dependencies

```bash
# Install Kaggle CLI
pip install kaggle

# Install Python dependencies for processing
pip install pandas pillow
```

### 2. Set Kaggle API Token

```bash
export KAGGLE_API_TOKEN=KGAT_237aa46791dc899cc591df9d2d9e8007
```

Or add to your `~/.bashrc` or `~/.zshrc` for persistence.

### 3. Download NIH Dataset

```bash
cd scripts
./download-nih-dataset.sh
```

This will:
- Download BBox_List_2017.csv and Data_Entry_2017.csv
- Extract list of annotated images (~880 images)
- Download all image zip files (~50GB total)
- Extract only the annotated images

**Note**: The full download is ~50GB and may take 1-2 hours depending on connection.

### 4. Convert to Case Library Format

```bash
python3 convert-nih-to-cases.py
```

This will:
- Process CSV data into case library JSON files
- Create finding-specific libraries (atelectasis.json, cardiomegaly.json, etc.)
- Copy images to public/cases/nih-learning/images/
- Generate thumbnails in public/cases/nih-learning/thumbnails/
- Create master-index.json for mixed practice mode

### 5. Verify Output

```bash
ls ../public/cases/nih-learning/

# Should see:
# - images/          (~880 PNG files)
# - thumbnails/      (~880 thumbnail PNGs)
# - atelectasis.json
# - cardiomegaly.json
# - effusion.json
# - ... (14 finding-specific files)
# - master-index.json
```

## Output Format

Each finding-specific JSON file follows this structure:

```json
{
  "metadata": {
    "name": "RADSIM Atelectasis Learning Cases",
    "version": "1.0.0",
    "description": "NIH chest X-ray cases with Atelectasis",
    "lastUpdated": "2026-01-07"
  },
  "cases": [
    {
      "id": "nih-atelectasis-0001",
      "title": "Atelectasis - Learning Case 0001",
      "modality": "DX",
      "viewPosition": "PA",
      "skillLevel": "intermediate",
      "demographics": { "age": 58, "sex": "M" },
      "diagnosis": "Atelectasis",
      "findings": [
        {
          "name": "Atelectasis",
          "roi": {
            "x": 225.08,
            "y": 547.02,
            "width": 86.78,
            "height": 79.19
          }
        }
      ],
      "files": {
        "imagePath": "cases/nih-learning/images/00013118_008.png",
        "thumbnailPath": "cases/nih-learning/thumbnails/00013118_008.png"
      },
      "tags": ["atelectasis", "chest", "xray", "learning", "nih"],
      ...
    }
  ]
}
```

## Troubleshooting

### Kaggle API Not Working

If you get authentication errors:

1. Make sure the token is set:
   ```bash
   echo $KAGGLE_API_TOKEN
   ```

2. Or use traditional kaggle.json method:
   ```bash
   mkdir -p ~/.kaggle
   echo '{"username":"your_username","key":"your_key"}' > ~/.kaggle/kaggle.json
   chmod 600 ~/.kaggle/kaggle.json
   ```

### CSV Parsing Errors

The BBox_List_2017.csv has unusual formatting. If you encounter parsing issues:

1. Open the CSV in a text editor to check the format
2. Adjust column parsing in `convert-nih-to-cases.py` if needed
3. The bbox coordinates should be: x, y, width, height

### Missing Images

If some images fail to extract:

1. Check `data/annotated_images.txt` for the list
2. Manually verify which zip files contain them
3. The script tries all 12 zip files but some images may be missing from the dataset

## Next Steps

After processing:

1. Load the case library in your app:
   ```typescript
   await caseLibrary.loadLibrary('/cases/nih-learning/atelectasis.json');
   ```

2. Start building the learning mode UI components

3. Test with a few cases before processing the full dataset
