#!/usr/bin/env python3
"""
Convert NIH Chest X-Ray Dataset to RADSIM Case Library Format

Processes BBox_List_2017.csv and Data_Entry_2017.csv to create
finding-specific case libraries for the learning mode.
"""

import pandas as pd
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
import shutil
from PIL import Image

# Configuration
BBOX_CSV = "../data/radsim_annotated_images/BBox_List_2017.csv"
DATA_CSV = "../data/radsim_annotated_images/radsim_metadata.csv"
IMAGES_DIR = "../data/radsim_annotated_images/images"
OUTPUT_DIR = "../public/cases/nih-learning"

# Disease categories from NIH dataset
FINDINGS = [
    "Atelectasis", "Cardiomegaly", "Consolidation", "Edema",
    "Effusion", "Emphysema", "Fibrosis", "Hernia",
    "Infiltration", "Mass", "Nodule", "Pleural_thickening",
    "Pneumonia", "Pneumothorax"
]

# Clinical context templates for synthetic patient histories
CLINICAL_TEMPLATES = {
    "Pneumonia": [
        "Fever, productive cough, and dyspnea for {days} days",
        "Community-acquired pneumonia symptoms, fever {temp}°F",
        "Cough with purulent sputum, pleuritic chest pain"
    ],
    "Cardiomegaly": [
        "Progressive dyspnea on exertion, bilateral lower extremity edema",
        "History of heart failure, worsening shortness of breath",
        "Orthopnea and paroxysmal nocturnal dyspnea"
    ],
    "Effusion": [
        "Progressive dyspnea, decreased breath sounds on exam",
        "Pleuritic chest pain, shortness of breath",
        "Recent pneumonia, persistent dyspnea"
    ],
    "Pneumothorax": [
        "Sudden onset chest pain and dyspnea",
        "Spontaneous pneumothorax, acute respiratory distress",
        "Trauma with chest pain and shortness of breath"
    ],
    "Atelectasis": [
        "Post-operative day {days}, decreased breath sounds",
        "Recent surgery, mild hypoxemia",
        "Diminished breath sounds in lung base"
    ],
    "Consolidation": [
        "Fever, cough, and chest pain for {days} days",
        "Lobar consolidation symptoms, productive cough",
        "Community-acquired pneumonia presentation"
    ],
    "Edema": [
        "Heart failure exacerbation, bilateral lower extremity swelling",
        "Progressive dyspnea, orthopnea",
        "Pulmonary edema symptoms, acute onset"
    ],
    "Nodule": [
        "Incidental finding on routine chest X-ray",
        "Screening chest X-ray, asymptomatic",
        "Follow-up for previously identified nodule"
    ],
    "Mass": [
        "Weight loss, chronic cough",
        "Hemoptysis, smoking history {years} pack-years",
        "Chest mass on screening, further evaluation needed"
    ],
}

def get_script_dir():
    """Get the directory where this script is located"""
    return Path(__file__).parent.absolute()

def load_data():
    """Load CSV files with proper column handling"""
    script_dir = get_script_dir()
    bbox_path = script_dir / BBOX_CSV
    data_path = script_dir / DATA_CSV

    print(f"Loading {bbox_path}...")
    bbox_df = pd.read_csv(bbox_path)

    print(f"Loading {data_path}...")
    data_df = pd.read_csv(data_path)

    # Rename bbox columns for clarity
    # Original: Image Index,Finding Label,Bbox [x,y,w,h],Unnamed: 6,Unnamed: 7,Unnamed: 8
    bbox_df.columns = ['Image Index', 'Finding Label', 'x', 'y', 'w', 'h', 'Unnamed: 6', 'Unnamed: 7', 'Unnamed: 8']

    print(f"Loaded {len(bbox_df)} bounding box annotations")
    print(f"Loaded {len(data_df)} patient records")

    return bbox_df, data_df

def determine_skill_level(finding: str) -> str:
    """Assign skill level based on finding complexity"""
    beginner = ["Cardiomegaly", "Pneumothorax", "Effusion", "Pneumonia"]
    advanced = ["Fibrosis", "Emphysema", "Hernia", "Infiltration", "Nodule"]

    if finding in beginner:
        return "beginner"
    elif finding in advanced:
        return "advanced"
    else:
        return "intermediate"

def generate_clinical_context(finding: str, age: Optional[int]) -> str:
    """Generate synthetic clinical history"""
    import random

    templates = CLINICAL_TEMPLATES.get(finding, [
        "Routine chest radiograph",
        "Chest pain and dyspnea",
        "Follow-up imaging"
    ])

    template = random.choice(templates)

    # Fill in template variables
    context = template.format(
        days=random.randint(1, 7),
        temp=random.randint(100, 103),
        years=random.randint(10, 40)
    )

    return context

def get_differential_diagnoses(finding: str) -> List[str]:
    """Get differential diagnoses for a finding"""
    differentials = {
        "Pneumonia": ["Atelectasis", "Pulmonary edema", "Lung cancer"],
        "Cardiomegaly": ["Pericardial effusion", "Dilated cardiomyopathy"],
        "Effusion": ["Heart failure", "Pneumonia", "Malignancy"],
        "Pneumothorax": ["Bullous emphysema", "Pneumomediastinum"],
        "Atelectasis": ["Pneumonia", "Pleural effusion", "Mass"],
        "Nodule": ["Granuloma", "Primary lung cancer", "Metastasis"],
        "Mass": ["Lung cancer", "Abscess", "Vascular lesion"],
    }

    return differentials.get(finding, [])

def convert_to_case(row_idx: int, image_id: str, finding: str, bbox: Dict, data_row: pd.Series) -> Dict:
    """Convert data to RadiologyCaseMetadata format"""

    case = {
        "id": f"nih-{finding.lower().replace('_', '-')}-{row_idx:04d}",
        "title": f"{finding.replace('_', ' ')} - Learning Case {row_idx:04d}",
        "description": f"Chest X-ray demonstrating {finding.lower().replace('_', ' ')}",
        "modality": "DX",
        "viewPosition": data_row.get('View Position', 'PA') if pd.notna(data_row.get('View Position')) else 'PA',
        "skillLevel": determine_skill_level(finding),
        "anatomicalRegion": "Chest",
        "clinicalHistory": generate_clinical_context(finding, data_row.get('Patient Age')),
        "demographics": {
            "age": int(data_row['Patient Age']) if pd.notna(data_row.get('Patient Age')) else None,
            "sex": data_row['Patient Gender'] if pd.notna(data_row.get('Patient Gender')) else None
        },
        "diagnosis": finding.replace('_', ' '),
        "findings": [
            {
                "name": finding.replace('_', ' '),
                "roi": bbox
            }
        ],
        "differential": get_differential_diagnoses(finding),
        "hints": [],  # Can be populated later
        "teachingPoints": [],  # Can be populated later
        "files": {
            "imagePath": f"cases/nih-learning/images/{image_id}",
            "thumbnailPath": f"cases/nih-learning/thumbnails/{image_id}"
        },
        "tags": [finding.lower().replace('_', ' '), "chest", "xray", "learning", "nih"],
        "source": {
            "dataset": "NIH Chest X-Ray Dataset",
            "originalId": image_id,
            "license": "CC0 1.0 Universal",
            "attribution": "NIH Clinical Center"
        },
        "metadata": {
            "dateAdded": datetime.now().isoformat()[:10],
            "curator": "RADSIM Learning Pipeline",
            "version": "1.0"
        }
    }

    return case

def create_thumbnails():
    """Generate thumbnails for all images"""
    script_dir = get_script_dir()
    images_dir = script_dir / IMAGES_DIR
    output_dir = script_dir / OUTPUT_DIR

    thumb_dir = output_dir / "thumbnails"
    thumb_dir.mkdir(parents=True, exist_ok=True)

    print("\nGenerating thumbnails...")

    image_files = list(images_dir.glob("*.png"))
    for i, image_path in enumerate(image_files):
        if i % 50 == 0:
            print(f"  Progress: {i}/{len(image_files)}")

        try:
            img = Image.open(image_path)
            img.thumbnail((256, 256), Image.Resampling.LANCZOS)

            thumb_path = thumb_dir / image_path.name
            img.save(thumb_path, "PNG", optimize=True)
        except Exception as e:
            print(f"  Error processing {image_path.name}: {e}")

    print(f"✓ Generated {len(image_files)} thumbnails")

def copy_images():
    """Copy images to output directory"""
    script_dir = get_script_dir()
    images_dir = script_dir / IMAGES_DIR
    output_dir = script_dir / OUTPUT_DIR

    dest_dir = output_dir / "images"
    dest_dir.mkdir(parents=True, exist_ok=True)

    print("\nCopying images...")

    image_files = list(images_dir.glob("*.png"))
    for i, image_path in enumerate(image_files):
        if i % 50 == 0:
            print(f"  Progress: {i}/{len(image_files)}")

        shutil.copy2(image_path, dest_dir / image_path.name)

    print(f"✓ Copied {len(image_files)} images")

def main():
    """Main processing function"""
    print("=" * 60)
    print("NIH Chest X-Ray to RADSIM Case Library Converter")
    print("=" * 60)

    # Load data
    bbox_df, data_df = load_data()

    # Merge dataframes
    print("\nMerging datasets...")
    merged = bbox_df.merge(
        data_df,
        on='Image Index',
        how='left'
    )

    print(f"Merged {len(merged)} records")

    # Group by finding type
    cases_by_finding = {finding: [] for finding in FINDINGS}

    print("\nProcessing cases...")

    for idx, row in merged.iterrows():
        if idx % 100 == 0:
            print(f"  Processed {idx}/{len(merged)} rows")

        finding = row['Finding Label']

        if finding in FINDINGS:
            # Extract bounding box (need to parse the CSV format)
            # The bbox coordinates should be in columns after 'Finding Label'
            try:
                # Try to extract bbox from the row
                # Columns are now: x, y, w, h (after renaming)
                x = float(row['x']) if pd.notna(row.get('x')) else 0
                y = float(row['y']) if pd.notna(row.get('y')) else 0
                w = float(row['w']) if pd.notna(row.get('w')) else 0
                h = float(row['h']) if pd.notna(row.get('h')) else 0

                bbox = {
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h
                }
            except Exception as e:
                print(f"  Warning: Could not parse bbox for row {idx}: {e}")
                bbox = {"x": 0, "y": 0, "width": 0, "height": 0}

            image_id = row['Image Index']
            case = convert_to_case(idx, image_id, finding, bbox, row)
            cases_by_finding[finding].append(case)

    # Copy images and create thumbnails
    copy_images()
    create_thumbnails()

    # Save finding-specific JSON files
    script_dir = get_script_dir()
    output_dir = script_dir / OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    print("\nSaving case library files...")

    for finding, cases in cases_by_finding.items():
        if not cases:
            continue

        output_file = output_dir / f"{finding.lower()}.json"

        library = {
            "metadata": {
                "name": f"RADSIM {finding} Learning Cases",
                "version": "1.0.0",
                "description": f"NIH chest X-ray cases with {finding}",
                "lastUpdated": datetime.now().isoformat()[:10]
            },
            "cases": cases
        }

        with open(output_file, 'w') as f:
            json.dump(library, f, indent=2)

        print(f"  ✓ {output_file.name}: {len(cases)} cases")

    # Create master index
    all_cases = [case for cases in cases_by_finding.values() for case in cases]

    master_index = {
        "metadata": {
            "name": "RADSIM Learning Mode - Master Index",
            "version": "1.0.0",
            "description": "All NIH annotated cases for spaced repetition practice",
            "lastUpdated": datetime.now().isoformat()[:10]
        },
        "cases": all_cases
    }

    master_file = output_dir / "master-index.json"
    with open(master_file, 'w') as f:
        json.dump(master_index, f, indent=2)

    print(f"\n  ✓ {master_file.name}: {len(all_cases)} total cases")

    print("\n" + "=" * 60)
    print("Conversion Complete!")
    print("=" * 60)
    print(f"\nOutput directory: {output_dir}")
    print(f"Total cases: {len(all_cases)}")
    print(f"Finding types: {len([f for f, c in cases_by_finding.items() if c])}")

if __name__ == "__main__":
    main()
