"""
RADSIM - NIH Annotated Images Export Script
============================================
Fork the sample notebook and add this code to export only annotated images.

This script:
1. Loads the BBox annotations (880 images with bounding boxes)
2. Filters to only include annotated images
3. Copies them to output directory
4. Creates a ZIP file for easy download (~300MB instead of 42GB!)
"""

import numpy as np
import pandas as pd
import os
from glob import glob
import shutil
import zipfile
from tqdm import tqdm

print("="*60)
print("RADSIM - NIH Annotated Images Export")
print("="*60)
print()

# ============================================================
# Step 1: Load the data (using same paths as sample notebook)
# ============================================================
print("Step 1: Loading data...")

# Load the main data entry file
all_xray_df = pd.read_csv('../input/Data_Entry_2017.csv')
print(f"  Total images in dataset: {len(all_xray_df)}")

# Load bounding box annotations
bbox_df = pd.read_csv('../input/BBox_List_2017.csv')
print(f"  Images with bounding boxes: {len(bbox_df)}")

# Get unique annotated image names
annotated_images = bbox_df['Image Index'].unique()
print(f"  Unique annotated images: {len(annotated_images)}")

# ============================================================
# Step 2: Build image path mapping (same as sample notebook)
# ============================================================
print("\nStep 2: Building image path mapping...")

all_image_paths = {os.path.basename(x): x for x in
                   glob(os.path.join('..', 'input', 'images*', '*', '*.png'))}
print(f"  Found {len(all_image_paths)} images in dataset")

# Map image names to full paths
all_xray_df['path'] = all_xray_df['Image Index'].map(all_image_paths.get)

# ============================================================
# Step 3: Filter to annotated images only
# ============================================================
print("\nStep 3: Filtering to annotated images...")

# Filter to only annotated images
annotated_df = all_xray_df[all_xray_df['Image Index'].isin(annotated_images)].copy()
print(f"  Filtered to {len(annotated_df)} annotated images")

# ============================================================
# Step 4: Create output directory and copy images
# ============================================================
print("\nStep 4: Copying annotated images...")

output_dir = '/kaggle/working/radsim_images'
os.makedirs(output_dir, exist_ok=True)

copied_count = 0
missing_count = 0

for idx, row in tqdm(annotated_df.iterrows(), total=len(annotated_df), desc="Copying"):
    src_path = row['path']
    if src_path and os.path.exists(src_path):
        dst_path = os.path.join(output_dir, row['Image Index'])
        shutil.copy2(src_path, dst_path)
        copied_count += 1
    else:
        missing_count += 1

print(f"  Copied {copied_count} images")
if missing_count > 0:
    print(f"  Missing {missing_count} images")

# ============================================================
# Step 5: Export metadata CSV
# ============================================================
print("\nStep 5: Exporting metadata...")

# Merge bbox info with image metadata
bbox_grouped = bbox_df.groupby('Image Index').apply(
    lambda x: x.to_dict('records')
).reset_index(name='bboxes')

export_df = annotated_df.merge(bbox_grouped, on='Image Index', how='left')

# Save metadata
metadata_path = '/kaggle/working/radsim_metadata.csv'
annotated_df.to_csv(metadata_path, index=False)
print(f"  Saved image metadata to {metadata_path}")

# Save bbox data
bbox_path = '/kaggle/working/BBox_List_2017.csv'
bbox_df.to_csv(bbox_path, index=False)
print(f"  Saved bbox data to {bbox_path}")

# ============================================================
# Step 6: Create ZIP file for download
# ============================================================
print("\nStep 6: Creating ZIP archive...")

zip_path = '/kaggle/working/radsim_annotated_images.zip'

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add images
    for img_file in tqdm(os.listdir(output_dir), desc="Zipping images"):
        img_path = os.path.join(output_dir, img_file)
        zipf.write(img_path, f'images/{img_file}')

    # Add metadata
    zipf.write(metadata_path, 'radsim_metadata.csv')
    zipf.write(bbox_path, 'BBox_List_2017.csv')

# Get zip size
zip_size = os.path.getsize(zip_path) / (1024 * 1024)
print(f"  Created ZIP: {zip_path}")
print(f"  ZIP size: {zip_size:.1f} MB")

# ============================================================
# Step 7: Summary
# ============================================================
print("\n" + "="*60)
print("EXPORT COMPLETE!")
print("="*60)
print(f"""
Summary:
  - Total annotated images: {len(annotated_images)}
  - Images exported: {copied_count}
  - ZIP file size: {zip_size:.1f} MB

Download: radsim_annotated_images.zip from the Output tab

After downloading, extract and run:
  cd /path/to/RADSIM/volview-gtc2025-demo/scripts
  python3 convert-nih-to-cases.py
""")

# ============================================================
# Show finding distribution
# ============================================================
print("\nFinding distribution in annotated images:")
finding_counts = bbox_df['Finding Label'].value_counts()
print(finding_counts.to_string())

# ============================================================
# Step 8: Download the ZIP file
# ============================================================
import os
os.chdir('/kaggle/working')

print("\n" + "="*60)
print("DOWNLOAD LINK")
print("="*60)
print("\nClick the link below to download:\n")

from IPython.display import FileLink
FileLink('radsim_annotated_images.zip')
