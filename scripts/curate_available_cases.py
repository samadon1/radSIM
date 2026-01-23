#!/usr/bin/env python3
"""
Curate cases from actually available images only
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import the main script
sys.path.insert(0, str(Path(__file__).parent))

from curate_nih_cases import *

def get_available_images(images_dir: Path) -> set:
    """Get set of available image filenames."""
    available = set()
    for img_path in images_dir.glob('*.png'):
        available.add(img_path.name)
    return available


def select_cases_from_available(df: pd.DataFrame, available_images: set) -> Dict[str, pd.DataFrame]:
    """Select cases only from available images."""
    # Filter dataframe to only available images
    df_available = df[df['Image Index'].isin(available_images)]

    print(f"Total images in CSV: {len(df)}")
    print(f"Available images: {len(df_available)}")

    selected = {}

    for condition, config in CURATION_PLAN.items():
        count = config['count']

        if condition == 'No Finding':
            cases = df_available[df_available['Finding Labels'] == 'No Finding']
        else:
            cases = df_available[df_available['Finding Labels'].str.contains(condition, na=False)]
            # Prefer single findings
            single_finding = cases[cases['Finding Labels'] == condition]
            if len(single_finding) >= count:
                cases = single_finding

        if len(cases) >= count:
            selected[condition] = cases.sample(n=count, random_state=42)
            print(f"Selected {count} cases for {condition}")
        else:
            selected[condition] = cases
            print(f"WARNING: Only found {len(cases)} cases for {condition}, wanted {count}")

    return selected


def main():
    args = parse_args()

    # Load metadata
    df = load_nih_metadata(args.csv)

    # Get available images
    images_dir = Path(args.images)
    print("\nScanning available images...")
    available = get_available_images(images_dir)
    print(f"Found {len(available)} available images in {images_dir}")

    # Select cases from available
    print("\nSelecting cases from available images...")
    selected = select_cases_from_available(df, available)

    # Create output directory
    output_dir = Path(args.output)

    # Copy images and create metadata
    print("\nProcessing images...")
    cases = copy_images(selected, images_dir, output_dir, args.dry_run)

    # Generate thumbnails
    print("\nGenerating thumbnails...")
    generate_thumbnails(output_dir, args.dry_run)

    # Save case library
    save_case_library(cases, output_dir, args.dry_run)

    print("\n" + "=" * 60)
    print("CURATION COMPLETE!")
    print("=" * 60)


if __name__ == '__main__':
    main()
