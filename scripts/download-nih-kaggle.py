#!/usr/bin/env python3
"""
Download NIH Chest X-ray dataset images from Kaggle
Downloads only the ~880 annotated images
"""

import os
import sys
import subprocess
import pandas as pd
from pathlib import Path
import zipfile
import shutil
from tqdm import tqdm

# Configuration
SCRIPT_DIR = Path(__file__).parent.absolute()
DATA_DIR = SCRIPT_DIR.parent / "data"
BBOX_CSV = DATA_DIR / "BBox_List_2017.csv"
OUTPUT_DIR = DATA_DIR / "nih-images-extracted"
KAGGLE_PATH = "/Users/mac/Library/Python/3.9/bin/kaggle"

def download_image_archives():
    """Download the image archives from Kaggle"""
    print("="*50)
    print("NIH Chest X-ray Dataset Downloader")
    print("="*50)
    print()

    # Create data directory
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Check if we have the annotated images list
    if not BBOX_CSV.exists():
        print("BBox_List_2017.csv not found. It should already be downloaded.")
        print("This file contains the list of annotated images.")
        return False

    # Read the list of annotated images
    print(f"Reading annotated images list from {BBOX_CSV}...")
    bbox_df = pd.read_csv(BBOX_CSV)

    # Get unique image names
    image_names = bbox_df.iloc[:, 0].unique()  # First column is Image Index
    print(f"Found {len(image_names)} unique annotated images")

    # Save the list for reference
    annotated_list_file = DATA_DIR / "annotated_images.txt"
    with open(annotated_list_file, 'w') as f:
        for img in image_names:
            f.write(f"{img}\n")
    print(f"Saved image list to {annotated_list_file}")

    # The NIH dataset is organized in 12 zip files (images_001.zip to images_012.zip)
    # We need to download and extract only the files we need

    print("\nNOTE: The NIH dataset is split into 12 archives (~4.7GB each)")
    print("We'll download and extract only the annotated images.")
    print()

    # Track which images we found
    found_images = set()
    missing_images = set(image_names)

    # Process each archive
    for i in range(1, 13):
        archive_num = f"{i:03d}"
        zip_name = f"images_{archive_num}.zip"
        zip_path = DATA_DIR / zip_name

        print(f"\nProcessing archive {i}/12: {zip_name}")

        # Check if already downloaded
        if zip_path.exists():
            print(f"  Archive already exists: {zip_path}")
        else:
            print(f"  Downloading {zip_name} from Kaggle...")
            cmd = [
                KAGGLE_PATH, "datasets", "download",
                "-d", "nih-chest-xrays/data",
                "-f", zip_name,
                "-p", str(DATA_DIR)
            ]

            try:
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    print(f"  Error downloading: {result.stderr}")
                    continue
                else:
                    print(f"  Downloaded successfully")
            except Exception as e:
                print(f"  Error: {e}")
                continue

        # Extract only the annotated images
        if zip_path.exists():
            print(f"  Extracting annotated images from {zip_name}...")
            extracted_count = 0

            try:
                with zipfile.ZipFile(zip_path, 'r') as zf:
                    # List all files in the archive
                    all_files = zf.namelist()

                    # Extract matching images
                    for filename in all_files:
                        # Get just the image name (remove path)
                        img_name = os.path.basename(filename)

                        if img_name in missing_images:
                            # Extract this file
                            zf.extract(filename, DATA_DIR / "temp")

                            # Move to output directory
                            src = DATA_DIR / "temp" / filename
                            dst = OUTPUT_DIR / img_name

                            if src.exists():
                                shutil.move(str(src), str(dst))
                                found_images.add(img_name)
                                missing_images.remove(img_name)
                                extracted_count += 1

                print(f"  Extracted {extracted_count} annotated images")

                # Clean up temp directory
                temp_dir = DATA_DIR / "temp"
                if temp_dir.exists():
                    shutil.rmtree(temp_dir)

                # Optionally delete the zip to save space
                if extracted_count > 0:
                    response = input(f"  Delete {zip_name} to save space? (y/n): ")
                    if response.lower() == 'y':
                        zip_path.unlink()
                        print(f"  Deleted {zip_name}")

            except Exception as e:
                print(f"  Error extracting: {e}")

        # Check if we found all images
        if len(missing_images) == 0:
            print("\n✓ Found all annotated images!")
            break
        else:
            print(f"  Still missing {len(missing_images)} images")

    # Report results
    print("\n" + "="*50)
    print("Download Complete!")
    print("="*50)
    print(f"Found {len(found_images)} out of {len(image_names)} annotated images")

    if len(missing_images) > 0:
        print(f"\nMissing {len(missing_images)} images:")
        for img in list(missing_images)[:10]:
            print(f"  - {img}")
        if len(missing_images) > 10:
            print(f"  ... and {len(missing_images) - 10} more")

    print(f"\nImages saved to: {OUTPUT_DIR}")
    print(f"Total images downloaded: {len(list(OUTPUT_DIR.glob('*.png')))}")

    return len(found_images) > 0

def generate_thumbnails():
    """Generate thumbnails for all downloaded images"""
    print("\nGenerating thumbnails...")

    thumb_dir = SCRIPT_DIR.parent / "public" / "cases" / "nih-learning" / "thumbnails"
    thumb_dir.mkdir(parents=True, exist_ok=True)

    images = list(OUTPUT_DIR.glob("*.png"))

    if not images:
        print("No images found to generate thumbnails")
        return

    print(f"Processing {len(images)} images...")

    try:
        from PIL import Image

        for img_path in tqdm(images, desc="Creating thumbnails"):
            try:
                # Open and resize
                img = Image.open(img_path)
                img.thumbnail((256, 256), Image.Resampling.LANCZOS)

                # Save thumbnail
                thumb_path = thumb_dir / img_path.name
                img.save(thumb_path, "PNG", optimize=True)

            except Exception as e:
                print(f"Error processing {img_path.name}: {e}")

    except ImportError:
        print("PIL not installed. Install with: pip install Pillow")
        print("Skipping thumbnail generation")

    print(f"✓ Thumbnails saved to: {thumb_dir}")

def main():
    # Check for required files
    if not BBOX_CSV.exists():
        print("ERROR: BBox_List_2017.csv not found!")
        print("This file should already be downloaded from the previous script.")
        print(f"Expected at: {BBOX_CSV}")
        sys.exit(1)

    # Download images
    success = download_image_archives()

    if success:
        # Generate thumbnails
        generate_thumbnails()

        print("\n" + "="*50)
        print("Setup Complete!")
        print("="*50)
        print("\nNext steps:")
        print("1. Run convert-nih-to-cases.py to create RADSIM case files")
        print("2. Test the learning mode with the downloaded cases")
    else:
        print("\nNo images were downloaded. Please check the errors above.")

if __name__ == "__main__":
    main()