#!/usr/bin/env python3
"""
Extract only the annotated images from the full NIH dataset
This script processes the downloaded dataset and extracts only the ~880 annotated images
"""

import os
import shutil
from pathlib import Path
import pandas as pd
from tqdm import tqdm
from PIL import Image

# Configuration
SCRIPT_DIR = Path(__file__).parent.absolute()
DATA_DIR = SCRIPT_DIR.parent / "data"
BBOX_CSV = DATA_DIR / "BBox_List_2017.csv"
ANNOTATED_LIST = DATA_DIR / "annotated_images.txt"
OUTPUT_DIR = DATA_DIR / "nih-images-extracted"
PUBLIC_DIR = SCRIPT_DIR.parent / "public" / "cases" / "nih-learning"

def extract_annotated_images():
    """Extract only the annotated images from the full dataset"""
    print("="*60)
    print("NIH Annotated Images Extractor")
    print("="*60)
    print()

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Read list of annotated images
    if ANNOTATED_LIST.exists():
        print(f"Reading annotated images list from {ANNOTATED_LIST}")
        with open(ANNOTATED_LIST, 'r') as f:
            annotated_images = set(line.strip() for line in f)
    else:
        print(f"Creating annotated images list from {BBOX_CSV}")
        bbox_df = pd.read_csv(BBOX_CSV)
        annotated_images = set(bbox_df.iloc[:, 0].unique())  # First column is Image Index

        # Save the list
        with open(ANNOTATED_LIST, 'w') as f:
            for img in annotated_images:
                f.write(f"{img}\n")

    print(f"Looking for {len(annotated_images)} annotated images")
    print()

    # Search for images in the data directory
    found_count = 0
    missing_images = set(annotated_images)

    # Look for images directories (images_001, images_002, etc.)
    image_dirs = sorted(DATA_DIR.glob("images_*/images"))

    if not image_dirs:
        # Try looking in the root data directory
        image_dirs = [DATA_DIR]
        print("Looking for images in data directory...")
    else:
        print(f"Found {len(image_dirs)} image directories")

    for img_dir in tqdm(image_dirs, desc="Processing directories"):
        # Find all PNG files in this directory
        png_files = list(img_dir.glob("*.png"))

        for png_path in png_files:
            img_name = png_path.name

            if img_name in missing_images:
                # Copy to output directory
                dst_path = OUTPUT_DIR / img_name
                shutil.copy2(png_path, dst_path)

                found_count += 1
                missing_images.remove(img_name)

                if found_count % 50 == 0:
                    print(f"  Extracted {found_count} images...")

        # Stop if we found all images
        if not missing_images:
            break

    print()
    print(f"✓ Extracted {found_count} out of {len(annotated_images)} annotated images")

    if missing_images:
        print(f"⚠ Missing {len(missing_images)} images:")
        for img in list(missing_images)[:5]:
            print(f"  - {img}")
        if len(missing_images) > 5:
            print(f"  ... and {len(missing_images) - 5} more")

    return found_count

def generate_thumbnails():
    """Generate thumbnails for all extracted images"""
    print("\nGenerating thumbnails...")

    # Create directories
    images_dir = PUBLIC_DIR / "images"
    thumbs_dir = PUBLIC_DIR / "thumbnails"
    images_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    # Get all extracted images
    extracted_images = list(OUTPUT_DIR.glob("*.png"))

    if not extracted_images:
        print("No images found to process")
        return

    print(f"Processing {len(extracted_images)} images...")

    for img_path in tqdm(extracted_images, desc="Creating thumbnails"):
        try:
            # Copy full image to public directory
            dst_image = images_dir / img_path.name
            if not dst_image.exists():
                shutil.copy2(img_path, dst_image)

            # Create thumbnail
            img = Image.open(img_path)

            # Create a 256x256 thumbnail
            img.thumbnail((256, 256), Image.Resampling.LANCZOS)

            # Save thumbnail
            thumb_path = thumbs_dir / img_path.name
            img.save(thumb_path, "PNG", optimize=True)

        except Exception as e:
            print(f"Error processing {img_path.name}: {e}")

    print(f"✓ Images copied to: {images_dir}")
    print(f"✓ Thumbnails saved to: {thumbs_dir}")

def cleanup_data_directory():
    """Optional: Remove the large uncompressed dataset to save space"""
    print("\n" + "="*60)
    print("Cleanup Option")
    print("="*60)

    # Calculate space used
    total_size = 0
    for img_dir in DATA_DIR.glob("images_*"):
        if img_dir.is_dir():
            for f in img_dir.rglob("*"):
                if f.is_file():
                    total_size += f.stat().st_size

    if total_size > 0:
        size_gb = total_size / (1024 * 1024 * 1024)
        print(f"The full dataset is using {size_gb:.1f} GB of disk space")
        print("Since we've extracted the annotated images, you can delete it to save space.")

        response = input("\nDelete the full dataset directories (images_*)? (y/n): ")
        if response.lower() == 'y':
            for img_dir in DATA_DIR.glob("images_*"):
                if img_dir.is_dir():
                    print(f"Removing {img_dir}...")
                    shutil.rmtree(img_dir)
            print("✓ Cleaned up full dataset")
        else:
            print("Keeping full dataset")

def main():
    print("Starting extraction process...")
    print("This script will:")
    print("1. Extract the 880 annotated images from the full dataset")
    print("2. Generate thumbnails for the viewer")
    print("3. Copy images to the public directory")
    print("4. Optionally clean up the full dataset")
    print()

    # Extract annotated images
    count = extract_annotated_images()

    if count > 0:
        # Generate thumbnails and copy to public
        generate_thumbnails()

        # Offer cleanup
        cleanup_data_directory()

        print("\n" + "="*60)
        print("Extraction Complete!")
        print("="*60)
        print(f"✓ Extracted {count} annotated images")
        print(f"✓ Images ready at: {OUTPUT_DIR}")
        print(f"✓ Public images at: {PUBLIC_DIR / 'images'}")
        print(f"✓ Thumbnails at: {PUBLIC_DIR / 'thumbnails'}")
        print()
        print("Next steps:")
        print("1. Run convert-nih-to-cases.py to create case JSON files")
        print("2. Test the learning mode with real NIH cases")
    else:
        print("\nNo images extracted. Make sure the dataset is downloaded and unzipped.")

if __name__ == "__main__":
    main()