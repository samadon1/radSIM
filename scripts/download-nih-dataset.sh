#!/bin/bash

# Download NIH Chest X-Ray Dataset (annotated subset)
# Requires Kaggle API token to be set

set -e

# Configuration
KAGGLE_API_TOKEN="${KAGGLE_API_TOKEN:-KGAT_237aa46791dc899cc591df9d2d9e8007}"
DATA_DIR="$(dirname "$0")/../data"
DATASET_SLUG="nih-chest-xrays/data"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}NIH Chest X-Ray Dataset Downloader${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Check if Kaggle CLI is installed
if ! command -v kaggle &> /dev/null; then
    echo -e "${RED}Error: Kaggle CLI not found${NC}"
    echo "Install with: pip install kaggle"
    exit 1
fi

# Set up Kaggle authentication
export KAGGLE_API_TOKEN

# Create data directory
mkdir -p "$DATA_DIR"
cd "$DATA_DIR"

echo -e "${YELLOW}Step 1: Downloading CSV files...${NC}"

# Download only the CSV files first (small)
kaggle datasets download -d $DATASET_SLUG -f BBox_List_2017.csv -p .
kaggle datasets download -d $DATASET_SLUG -f Data_Entry_2017.csv -p .

# Unzip CSVs
unzip -o BBox_List_2017.csv.zip
unzip -o Data_Entry_2017.csv.zip

echo -e "${GREEN}✓ CSV files downloaded${NC}\n"

# Extract unique image filenames from BBox CSV
echo -e "${YELLOW}Step 2: Extracting annotated image list...${NC}"
tail -n +2 BBox_List_2017.csv | cut -d',' -f1 | sort -u > annotated_images.txt

IMAGE_COUNT=$(wc -l < annotated_images.txt)
echo -e "${GREEN}✓ Found $IMAGE_COUNT unique annotated images${NC}\n"

echo -e "${YELLOW}Step 3: Downloading images...${NC}"
echo "Note: This will download all image zip files (~50GB total)"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Download all image zip files
for i in {1..12}; do
    ZIP_NUM=$(printf "%03d" $i)
    echo -e "${YELLOW}Downloading images_${ZIP_NUM}.zip...${NC}"
    kaggle datasets download -d $DATASET_SLUG -f "images_${ZIP_NUM}.zip" -p .
done

echo -e "${GREEN}✓ All image archives downloaded${NC}\n"

echo -e "${YELLOW}Step 4: Extracting annotated images only...${NC}"

# Create output directory for extracted images
mkdir -p nih-images-extracted

# Extract images in parallel
while IFS= read -r image; do
    # Find which zip contains this image (try all)
    for i in {1..12}; do
        ZIP_NUM=$(printf "%03d" $i)
        ZIP_FILE="images_${ZIP_NUM}.zip"

        if [ -f "$ZIP_FILE" ]; then
            # Try to extract this specific image (suppress errors if not in this zip)
            unzip -j -o "$ZIP_FILE" "images/$image" -d nih-images-extracted 2>/dev/null && break
        fi
    done
done < annotated_images.txt

EXTRACTED_COUNT=$(ls nih-images-extracted/*.png 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Extracted $EXTRACTED_COUNT images${NC}\n"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Download Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "CSV files: $DATA_DIR/"
echo "Images: $DATA_DIR/nih-images-extracted/"
echo ""
echo "Next step: Run convert-nih-to-cases.py to process into case library format"
