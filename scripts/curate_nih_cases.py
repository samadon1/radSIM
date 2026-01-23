#!/usr/bin/env python3
"""
NIH Chest X-Ray Case Curation Script

This script helps curate educational cases from the NIH Chest X-Ray dataset.

Usage:
    python curate_nih_cases.py --csv Data_Entry_2017.csv --images ./images --output ./public/cases

Requirements:
    pip install pandas pillow
"""

import argparse
import json
import shutil
from pathlib import Path
from typing import List, Dict
import pandas as pd
from datetime import datetime

# Target conditions and counts for initial case library
CURATION_PLAN = {
    'No Finding': {'count': 3, 'skill': 'beginner'},
    'Pneumonia': {'count': 5, 'skill': 'beginner'},
    'Cardiomegaly': {'count': 3, 'skill': 'beginner'},
    'Effusion': {'count': 3, 'skill': 'beginner'},
    'Infiltration': {'count': 2, 'skill': 'intermediate'},
    'Mass': {'count': 2, 'skill': 'intermediate'},
    'Nodule': {'count': 2, 'skill': 'intermediate'},
}


def parse_args():
    parser = argparse.ArgumentParser(description='Curate NIH Chest X-Ray cases')
    parser.add_argument('--csv', required=True, help='Path to Data_Entry_2017.csv')
    parser.add_argument('--images', required=True, help='Path to images directory')
    parser.add_argument('--output', required=True, help='Output directory for curated cases')
    parser.add_argument('--bbox-csv', help='Path to BBox_List_2017.csv (optional)')
    parser.add_argument('--dry-run', action='store_true', help='Print plan without copying files')
    return parser.parse_args()


def load_nih_metadata(csv_path: str) -> pd.DataFrame:
    """Load NIH dataset metadata CSV."""
    print(f"Loading metadata from {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} images")
    return df


def select_cases(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """Select cases for each condition based on curation plan."""
    selected = {}

    for condition, config in CURATION_PLAN.items():
        count = config['count']

        if condition == 'No Finding':
            # Select normal cases
            cases = df[df['Finding Labels'] == 'No Finding'].sample(n=min(count, 100))
        else:
            # Select cases with specific finding
            cases = df[df['Finding Labels'].str.contains(condition, na=False)]

            # Prefer cases with single finding for clarity
            single_finding = cases[cases['Finding Labels'] == condition]
            if len(single_finding) >= count:
                cases = single_finding.sample(n=count)
            else:
                cases = cases.sample(n=min(count, len(cases)))

        selected[condition] = cases
        print(f"Selected {len(cases)} cases for {condition}")

    return selected


def create_case_metadata(
    row: pd.Series,
    case_id: str,
    diagnosis: str,
    skill_level: str
) -> Dict:
    """Create case metadata structure."""

    # Determine view position
    view_position = row.get('View Position', 'PA')
    if pd.isna(view_position):
        view_position = 'PA'

    # Extract patient demographics if available
    age = row.get('Patient Age', None)
    if pd.notna(age):
        try:
            age = int(age)
        except (ValueError, TypeError):
            age = None

    gender = row.get('Patient Gender', None)
    if pd.notna(gender) and gender in ['M', 'F']:
        sex = gender
    else:
        sex = None

    # Create findings list
    findings = []
    if diagnosis != 'Normal chest radiograph':
        findings.append({
            'name': diagnosis,
            'description': f'Finding: {diagnosis}',
            'location': 'To be determined by radiologist review'
        })

    # Create case metadata
    metadata = {
        'id': case_id,
        'title': f'{diagnosis} - Case {case_id.split("-")[-1]}',
        'description': f'Chest X-ray demonstrating {diagnosis.lower()}',
        'modality': 'DX',
        'viewPosition': view_position,
        'skillLevel': skill_level,
        'anatomicalRegion': 'Chest',
        'clinicalHistory': 'To be added during manual curation',
        'diagnosis': diagnosis,
        'findings': findings,
        'differential': [],  # To be added during manual curation
        'hints': [],  # To be added during manual curation
        'teachingPoints': [],  # To be added during manual curation
        'files': {
            'imagePath': f'cases/images/{row["Image Index"]}',
            'thumbnailPath': f'cases/thumbnails/{row["Image Index"]}'
        },
        'tags': [t.lower().replace(' ', '-') for t in diagnosis.split()] + ['chest', 'xray'],
        'source': {
            'dataset': 'NIH Chest X-Ray Dataset',
            'originalId': row['Image Index'],
            'license': 'CC0 1.0 Universal',
            'attribution': 'NIH Clinical Center'
        },
        'metadata': {
            'dateAdded': datetime.now().strftime('%Y-%m-%d'),
            'curator': 'RADSIM Team',
            'version': '1.0'
        }
    }

    # Add demographics if available
    if age is not None or sex is not None:
        metadata['demographics'] = {}
        if age is not None:
            metadata['demographics']['age'] = age
        if sex is not None:
            metadata['demographics']['sex'] = sex

    return metadata


def copy_images(
    selected_cases: Dict[str, pd.DataFrame],
    images_dir: Path,
    output_dir: Path,
    dry_run: bool = False
) -> List[Dict]:
    """Copy selected images to output directory and create metadata."""

    images_output = output_dir / 'images'
    thumbs_output = output_dir / 'thumbnails'

    if not dry_run:
        images_output.mkdir(parents=True, exist_ok=True)
        thumbs_output.mkdir(parents=True, exist_ok=True)

    all_cases = []
    case_counter = 1

    for condition, df in selected_cases.items():
        skill_level = CURATION_PLAN[condition]['skill']

        # Map condition to diagnosis
        if condition == 'No Finding':
            diagnosis = 'Normal chest radiograph'
        else:
            diagnosis = condition

        for _, row in df.iterrows():
            case_id = f'cxr-{case_counter:03d}'
            image_filename = row['Image Index']

            # Create metadata
            case_metadata = create_case_metadata(row, case_id, diagnosis, skill_level)
            all_cases.append(case_metadata)

            # Copy image file
            src_image = images_dir / image_filename
            if src_image.exists():
                if not dry_run:
                    dst_image = images_output / image_filename
                    shutil.copy2(src_image, dst_image)
                    print(f"Copied {image_filename} -> {case_id}")
                else:
                    print(f"[DRY RUN] Would copy {image_filename} -> {case_id}")
            else:
                print(f"WARNING: Image not found: {src_image}")

            case_counter += 1

    return all_cases


def generate_thumbnails(output_dir: Path, dry_run: bool = False):
    """Generate thumbnails from images using PIL."""
    try:
        from PIL import Image
    except ImportError:
        print("WARNING: PIL not installed. Run 'pip install pillow' to generate thumbnails.")
        print("You can generate thumbnails later using scripts/generate_thumbnails.py")
        return

    images_dir = output_dir / 'images'
    thumbs_dir = output_dir / 'thumbnails'

    if not images_dir.exists():
        print("No images directory found, skipping thumbnail generation")
        return

    if not dry_run:
        thumbs_dir.mkdir(exist_ok=True)

    for img_path in images_dir.glob('*.png'):
        if dry_run:
            print(f"[DRY RUN] Would generate thumbnail for {img_path.name}")
            continue

        try:
            img = Image.open(img_path)
            # Create thumbnail maintaining aspect ratio
            img.thumbnail((640, 360), Image.Resampling.LANCZOS)

            # Save thumbnail
            thumb_path = thumbs_dir / img_path.name
            img.save(thumb_path)
            print(f"Generated thumbnail: {img_path.name}")
        except Exception as e:
            print(f"Error generating thumbnail for {img_path.name}: {e}")


def save_case_library(cases: List[Dict], output_dir: Path, dry_run: bool = False):
    """Save case library JSON."""
    library = {
        'metadata': {
            'name': 'RADSIM Chest X-Ray Case Library',
            'version': '1.0.0',
            'description': 'Curated collection of educational chest X-ray cases from NIH dataset',
            'lastUpdated': datetime.now().strftime('%Y-%m-%d')
        },
        'cases': cases
    }

    output_file = output_dir / 'chest-xray-library.json'

    if not dry_run:
        with open(output_file, 'w') as f:
            json.dump(library, f, indent=2)
        print(f"\nSaved case library to {output_file}")
        print(f"Total cases: {len(cases)}")
    else:
        print(f"\n[DRY RUN] Would save {len(cases)} cases to {output_file}")

    # Print summary
    print("\nCase Library Summary:")
    print(f"{'Condition':<20} {'Count':<10} {'Skill Level':<15}")
    print("-" * 45)

    condition_counts = {}
    for case in cases:
        diagnosis = case['diagnosis']
        skill = case['skillLevel']
        key = f"{diagnosis} ({skill})"
        condition_counts[key] = condition_counts.get(key, 0) + 1

    for condition, count in sorted(condition_counts.items()):
        print(f"{condition:<35} {count:<10}")

    print(f"\n{'TOTAL':<35} {len(cases):<10}")


def main():
    args = parse_args()

    # Load NIH metadata
    df = load_nih_metadata(args.csv)

    # Select cases
    print("\nSelecting cases based on curation plan...")
    selected = select_cases(df)

    # Create output directory
    output_dir = Path(args.output)

    # Copy images and create metadata
    print("\nProcessing images...")
    cases = copy_images(selected, Path(args.images), output_dir, args.dry_run)

    # Generate thumbnails
    print("\nGenerating thumbnails...")
    generate_thumbnails(output_dir, args.dry_run)

    # Save case library
    save_case_library(cases, output_dir, args.dry_run)

    print("\n" + "=" * 60)
    print("CURATION COMPLETE!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Review the generated case library JSON")
    print("2. Manually curate each case:")
    print("   - Add detailed clinical history")
    print("   - Document specific findings with locations")
    print("   - Add differential diagnoses")
    print("   - Create progressive hints for learners")
    print("   - Add teaching points")
    print("3. Verify all images and thumbnails are present")
    print("4. Test in the RADSIM application")


if __name__ == '__main__':
    main()
