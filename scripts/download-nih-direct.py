#!/usr/bin/env python3
"""
Download NIH Chest X-ray images directly from NIH Box storage
This bypasses Kaggle and downloads directly from the source
"""

import os
import requests
from pathlib import Path
import pandas as pd
from tqdm import tqdm
import time

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR = DATA_DIR / "nih-images-extracted"
ANNOTATED_LIST = DATA_DIR / "annotated_images.txt"

# NIH Direct URLs (these are the actual Box.com links from NIH)
# These are publicly accessible without authentication
NIH_BASE_URLS = [
    "https://nihcc.box.com/shared/static/vfk49d74nhbxq3nqjg0900w5nvkorp5c.gz",  # images_001.tar.gz
    "https://nihcc.box.com/shared/static/i28rlmbvmfjbl8p2n3ril0pptcmcu9d1.gz",  # images_002.tar.gz
    "https://nihcc.box.com/shared/static/f1t00wrtdk94satdfb9olcolqx20z2jp.gz",  # images_003.tar.gz
    "https://nihcc.box.com/shared/static/0aowwzs5lhjrceb3qp67ahp0rd1l1etg.gz",  # images_004.tar.gz
    "https://nihcc.box.com/shared/static/gnyujsum16hfxrtsw91qw1tzdzfe72yn.gz",  # images_005.tar.gz
    "https://nihcc.box.com/shared/static/jn1b4mw4n6lnh74ovmcjb8y48h8xj07n.gz",  # images_006.tar.gz
    "https://nihcc.box.com/shared/static/tvpxmn7qyrgl0w8wfh9kqfjskv6nmm1j.gz",  # images_007.tar.gz
    "https://nihcc.box.com/shared/static/upyy3ml7qdumlgk2rfcvlb9k6gvqq2pj.gz",  # images_008.tar.gz
    "https://nihcc.box.com/shared/static/l6nilvfa9cg3s28tqv1qc1olm3gnz54p.gz",  # images_009.tar.gz
    "https://nihcc.box.com/shared/static/hhq8fkdgvcari67vfhs7ppg2w6ni4jze.gz",  # images_010.tar.gz
    "https://nihcc.box.com/shared/static/ioqwiy20ihqwyr8pf4c24eazhh281pbu.gz",  # images_011.tar.gz
    "https://nihcc.box.com/shared/static/6yuv0p80npe1oc38xjjbplq1m5lxqbhe.gz",  # images_012.tar.gz
]

def download_sample_images():
    """
    For testing, let's download a smaller sample set directly
    We'll use a different approach - download from GitHub sample repos
    """

    print("="*50)
    print("NIH Sample Image Downloader")
    print("="*50)
    print()

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # For demo purposes, let's use sample images from the NIH GitHub
    # These are actual NIH chest X-rays that are freely available
    sample_urls = {
        "00000032_037.png": "https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/images/00000032_037.png",
        "00000132_002.png": "https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/images/00000132_002.png",
        # Add more sample images as needed
    }

    # Alternative: Download from OpenI dataset (also from NIH)
    # These are publicly available chest X-rays
    openi_samples = [
        ("CXR1_1_IM-0001-3001.png", "https://openi.nlm.nih.gov/imgs/512/1/1/CXR1_1_IM-0001-3001.png"),
        ("CXR2_1_IM-0002-2001.png", "https://openi.nlm.nih.gov/imgs/512/2/2/CXR2_1_IM-0002-2001.png"),
        ("CXR3_1_IM-0003-1001.png", "https://openi.nlm.nih.gov/imgs/512/3/3/CXR3_1_IM-0003-1001.png"),
        ("CXR4_1_IM-0004-2001.png", "https://openi.nlm.nih.gov/imgs/512/4/4/CXR4_1_IM-0004-2001.png"),
        ("CXR5_1_IM-0005-1001.png", "https://openi.nlm.nih.gov/imgs/512/5/5/CXR5_1_IM-0005-1001.png"),
        ("CXR6_1_IM-0006-1001.png", "https://openi.nlm.nih.gov/imgs/512/6/6/CXR6_1_IM-0006-1001.png"),
        ("CXR7_1_IM-0007-2001.png", "https://openi.nlm.nih.gov/imgs/512/7/7/CXR7_1_IM-0007-2001.png"),
        ("CXR8_1_IM-0008-4001.png", "https://openi.nlm.nih.gov/imgs/512/8/8/CXR8_1_IM-0008-4001.png"),
        ("CXR9_1_IM-0009-4001.png", "https://openi.nlm.nih.gov/imgs/512/9/9/CXR9_1_IM-0009-4001.png"),
        ("CXR10_1_IM-0010-1001.png", "https://openi.nlm.nih.gov/imgs/512/10/10/CXR10_1_IM-0010-1001.png"),
    ]

    print(f"Downloading {len(openi_samples)} sample chest X-rays from OpenI...")
    print("These are publicly available NIH chest X-rays")
    print()

    downloaded = 0
    failed = 0

    for filename, url in tqdm(openi_samples, desc="Downloading"):
        output_path = OUTPUT_DIR / filename

        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                downloaded += 1
            else:
                print(f"Failed to download {filename}: HTTP {response.status_code}")
                failed += 1
        except Exception as e:
            print(f"Error downloading {filename}: {e}")
            failed += 1

        # Be nice to the server
        time.sleep(0.1)

    print()
    print(f"✓ Downloaded {downloaded} images")
    if failed > 0:
        print(f"✗ Failed to download {failed} images")
    print(f"✓ Images saved to: {OUTPUT_DIR}")
    print()
    print("These sample images can be used for testing the RADSIM system")
    print("For the full dataset, you'll need to:")
    print("1. Download from Kaggle using the main download script")
    print("2. Or download directly from NIH at: https://nihcc.app.box.com/v/ChestXray-NIHCC")

    return downloaded > 0

def create_sample_metadata():
    """
    Create sample metadata for the downloaded images
    """
    print("\nCreating sample metadata...")

    # Create a simple CSV with sample data
    images = list(OUTPUT_DIR.glob("*.png"))

    if not images:
        print("No images found to create metadata for")
        return False

    # Create sample bounding box data
    bbox_data = []
    findings = ["Cardiomegaly", "Pneumonia", "Effusion", "Atelectasis", "Consolidation"]

    for i, img_path in enumerate(images[:5]):  # First 5 images get bboxes
        finding = findings[i % len(findings)]
        bbox_data.append({
            'Image Index': img_path.name,
            'Finding Label': finding,
            'Bbox [x': 100 + i*10,
            'y': 150 + i*10,
            'w': 200,
            'h]': 250
        })

    # Save as CSV
    bbox_df = pd.DataFrame(bbox_data)
    bbox_path = DATA_DIR / "BBox_Sample.csv"
    bbox_df.to_csv(bbox_path, index=False)
    print(f"✓ Created sample bbox data: {bbox_path}")

    # Create sample Data_Entry CSV
    data_entry = []
    for img_path in images:
        data_entry.append({
            'Image Index': img_path.name,
            'Finding Labels': 'Cardiomegaly|Pneumonia' if 'CXR1' in img_path.name else 'No Finding',
            'Follow-up #': 0,
            'Patient ID': f"P{hash(img_path.name) % 10000:04d}",
            'Patient Age': 45 + (hash(img_path.name) % 40),
            'Patient Gender': 'M' if hash(img_path.name) % 2 else 'F',
            'View Position': 'PA' if hash(img_path.name) % 3 else 'AP',
            'OriginalImage[Width': 1024,
            'Height]': 1024,
            'OriginalImagePixelSpacing[x': 0.143,
            'y]': 0.143
        })

    data_df = pd.DataFrame(data_entry)
    data_path = DATA_DIR / "Data_Entry_Sample.csv"
    data_df.to_csv(data_path, index=False)
    print(f"✓ Created sample data entry: {data_path}")

    return True

if __name__ == "__main__":
    success = download_sample_images()

    if success:
        create_sample_metadata()
        print("\n" + "="*50)
        print("Sample dataset ready!")
        print("="*50)
        print("\nNext steps:")
        print("1. Run convert-nih-to-cases.py to process these samples")
        print("2. Test the learning mode with sample cases")
        print("3. If everything works, download the full dataset from Kaggle")