#!/bin/bash

# Download only the 880 annotated images from NIH dataset
# Much faster than downloading all 50GB!

set -e

cd "$(dirname "$0")/../data"

echo "======================================"
echo "NIH Annotated Images Downloader"
echo "======================================"
echo ""
echo "Downloading only the 880 images with bounding boxes..."
echo "This is MUCH faster than downloading all 50GB!"
echo ""

# Create output directory
mkdir -p nih-images-extracted

# Counter
count=0
total=$(wc -l < annotated_images.txt)

# Download each image
while IFS= read -r image; do
    count=$((count + 1))

    # Progress
    if [ $((count % 50)) -eq 0 ]; then
        echo "Progress: $count / $total images downloaded"
    fi

    # Determine which images folder this is in (001-012)
    # Images are distributed across folders, we need to try each
    for folder in {001..012}; do
        folder_padded=$(printf "%03d" $folder)
        file_path="images_${folder_padded}/images/${image}"

        # Try to download from this folder
        /Users/mac/Library/Python/3.9/bin/kaggle datasets download -d nih-chest-xrays/data \
            -f "$file_path" -p nih-images-extracted --unzip -q 2>/dev/null && break
    done

done < annotated_images.txt

echo ""
echo "✓ Downloaded $count images"
echo "✓ Images saved to: $(pwd)/nih-images-extracted/"
echo ""
echo "Next step: Run convert-nih-to-cases.py"
