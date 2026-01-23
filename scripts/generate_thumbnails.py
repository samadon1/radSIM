#!/usr/bin/env python3
"""
Thumbnail Generator for RADSIM Case Library

Generates web-optimized thumbnails from medical images.

Usage:
    python generate_thumbnails.py --input ./public/cases/images --output ./public/cases/thumbnails

Requirements:
    pip install pillow
"""

import argparse
from pathlib import Path
from PIL import Image
import sys


def parse_args():
    parser = argparse.ArgumentParser(description='Generate thumbnails for case library')
    parser.add_argument('--input', required=True, help='Input images directory')
    parser.add_argument('--output', required=True, help='Output thumbnails directory')
    parser.add_argument('--width', type=int, default=640, help='Thumbnail max width')
    parser.add_argument('--height', type=int, default=360, help='Thumbnail max height')
    parser.add_argument('--quality', type=int, default=85, help='JPEG quality (1-100)')
    parser.add_argument('--format', default='JPEG', choices=['JPEG', 'PNG'], help='Output format')
    return parser.parse_args()


def generate_thumbnail(
    input_path: Path,
    output_dir: Path,
    max_size: tuple,
    quality: int = 85,
    output_format: str = 'JPEG'
):
    """Generate a thumbnail from an image."""
    try:
        # Open image
        img = Image.open(input_path)

        # Convert to RGB if saving as JPEG
        if output_format == 'JPEG' and img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')

        # Create thumbnail maintaining aspect ratio
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        # Determine output filename
        output_ext = '.jpg' if output_format == 'JPEG' else '.png'
        output_filename = input_path.stem + output_ext
        output_path = output_dir / output_filename

        # Save thumbnail
        if output_format == 'JPEG':
            img.save(output_path, 'JPEG', quality=quality, optimize=True)
        else:
            img.save(output_path, 'PNG', optimize=True)

        return True, output_filename
    except Exception as e:
        return False, str(e)


def main():
    args = parse_args()

    # Validate directories
    input_dir = Path(args.input)
    if not input_dir.exists():
        print(f"Error: Input directory not found: {input_dir}")
        sys.exit(1)

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Supported image formats
    supported_formats = ['.png', '.jpg', '.jpeg', '.dcm', '.nii', '.nii.gz', '.nrrd', '.mha']

    # Find all images
    image_files = []
    for ext in ['.png', '.jpg', '.jpeg']:
        image_files.extend(input_dir.glob(f'*{ext}'))

    if not image_files:
        print(f"No images found in {input_dir}")
        sys.exit(1)

    print(f"Found {len(image_files)} images")
    print(f"Generating thumbnails ({args.width}x{args.height})...")

    # Generate thumbnails
    max_size = (args.width, args.height)
    success_count = 0
    error_count = 0

    for img_path in image_files:
        success, result = generate_thumbnail(
            img_path,
            output_dir,
            max_size,
            args.quality,
            args.format
        )

        if success:
            print(f"✓ {result}")
            success_count += 1
        else:
            print(f"✗ {img_path.name}: {result}")
            error_count += 1

    # Summary
    print("\n" + "=" * 60)
    print(f"Thumbnail generation complete!")
    print(f"Success: {success_count}")
    print(f"Errors: {error_count}")
    print(f"Output directory: {output_dir}")
    print("=" * 60)


if __name__ == '__main__':
    main()
