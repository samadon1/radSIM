/**
 * Utility for generating natural language descriptions from annotations
 */

import { SegmentMask } from '@/src/types/segment';
import type { RGBAColor } from '@kitware/vtk.js/types';

// Color name mapping for common medical imaging colors
const COLOR_NAMES: Record<string, string> = {
  '255,0,0': 'red',
  '0,255,0': 'green',
  '0,0,255': 'blue',
  '255,255,0': 'yellow',
  '255,0,255': 'magenta',
  '0,255,255': 'cyan',
  '141,228,211': 'cyan', // The specific cyan used in the app
  '255,128,0': 'orange',
  '128,0,255': 'purple',
  '255,192,203': 'pink',
  '128,128,128': 'gray',
  '255,255,255': 'white',
  '220,38,127': 'red', // Another red variant
  '255,176,0': 'orange', // Another orange variant
};

/**
 * Get a friendly color name from RGBA values
 */
function getColorName(rgba: RGBAColor): string {
  // Debug log to see what color we're getting
  console.log('[AnnotationDescriber] Color RGBA:', rgba);

  // Check if values are already in 0-255 range (not normalized)
  const isNormalized = rgba[0] <= 1 && rgba[1] <= 1 && rgba[2] <= 1;

  // Convert RGBA to RGB string for lookup
  const r = isNormalized ? Math.round(rgba[0] * 255) : Math.round(rgba[0]);
  const g = isNormalized ? Math.round(rgba[1] * 255) : Math.round(rgba[1]);
  const b = isNormalized ? Math.round(rgba[2] * 255) : Math.round(rgba[2]);

  const key = `${r},${g},${b}`;
  console.log('[AnnotationDescriber] Color key:', key);

  // Try exact match first
  if (COLOR_NAMES[key]) {
    return COLOR_NAMES[key];
  }

  // Find closest color
  let minDistance = Infinity;
  let closestColor = 'custom color';

  for (const [colorKey, name] of Object.entries(COLOR_NAMES)) {
    const [cr, cg, cb] = colorKey.split(',').map(Number);
    const distance = Math.sqrt(
      Math.pow(r - cr, 2) +
      Math.pow(g - cg, 2) +
      Math.pow(b - cb, 2)
    );

    if (distance < minDistance && distance < 100) { // Increased threshold for "close enough"
      minDistance = distance;
      closestColor = name;
    }
  }

  console.log('[AnnotationDescriber] Closest color:', closestColor, 'distance:', minDistance);
  return closestColor;
}

/**
 * Generate description for segments
 */
export function describeSegments(segments: SegmentMask[]): string {
  if (!segments || segments.length === 0) return '';

  // Filter only visible segments
  const visibleSegments = segments.filter(seg => seg.visible);
  if (visibleSegments.length === 0) return '';

  // Single segment
  if (visibleSegments.length === 1) {
    const seg = visibleSegments[0];
    return `Segmented ${seg.name.toLowerCase()} in ${getColorName(seg.color)}`;
  }

  // Multiple segments - create readable list
  const segmentDescriptions = visibleSegments.map(seg =>
    `${seg.name.toLowerCase()} (${getColorName(seg.color)})`
  );

  // Format as proper English list
  if (visibleSegments.length === 2) {
    return `Segmented ${segmentDescriptions.join(' and ')}`;
  }

  const lastSegment = segmentDescriptions.pop();
  return `Segmented ${segmentDescriptions.join(', ')}, and ${lastSegment}`;
}

/**
 * Generate description for ruler measurements
 */
export function describeRulers(rulers: any[]): string {
  if (!rulers || rulers.length === 0) return '';

  const descriptions: string[] = [];

  rulers.forEach(ruler => {
    // Get the length from the ruler store (computed property)
    const length = ruler.length || 0;
    const label = ruler.labelName || ruler.name || 'Distance';

    // Format with appropriate precision
    if (length > 0) {
      descriptions.push(`${label}: ${length.toFixed(1)}mm`);
    }
  });

  return descriptions.join('. ');
}

/**
 * Generate description for rectangles
 */
export function describeRectangles(rectangles: any[]): string {
  if (!rectangles || rectangles.length === 0) return '';

  // Get all unique labels - prioritize labelName, then label
  const labeledRects = rectangles.map(rect => {
    // Debug logging
    console.log('[AnnotationDescriber] Rectangle full object:', rect);
    console.log('[AnnotationDescriber] Rectangle label info:', {
      labelName: rect.labelName,
      label: rect.label,
      name: rect.name,
      color: rect.color
    });

    // labelName should be the actual label text
    // If all rectangles have the same labelName, that's a bug in how they're stored
    return rect.labelName || rect.name || 'region';
  });

  // If single rectangle
  if (rectangles.length === 1) {
    return `Marked ${labeledRects[0]}`;
  }

  // Multiple rectangles - group by label AND color
  const labelGroups: Record<string, { count: number; color?: string }> = {};

  rectangles.forEach((rect, index) => {
    const label = labeledRects[index];
    const key = label;

    if (!labelGroups[key]) {
      labelGroups[key] = { count: 0, color: rect.color };
    }
    labelGroups[key].count++;
  });

  const descriptions: string[] = [];
  for (const [label, info] of Object.entries(labelGroups)) {
    // Get color name for this label's color
    let colorDesc = '';
    if (info.color) {
      console.log('[AnnotationDescriber] Rectangle color for', label, ':', info.color);

      // Parse color based on format
      let rgba: RGBAColor | null = null;

      if (typeof info.color === 'string') {
        if (info.color.startsWith('#')) {
          // Hex format
          const hex = info.color.replace('#', '');
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          rgba = [r, g, b, 255];
        } else if (info.color.startsWith('rgb')) {
          // rgb() or rgba() format
          const match = info.color.match(/\d+/g);
          if (match) {
            rgba = [parseInt(match[0]), parseInt(match[1]), parseInt(match[2]), parseInt(match[3] || '255')];
          }
        }
      }

      // If we have valid RGBA, get color name
      if (rgba) {
        const colorName = getColorName(rgba);
        if (colorName !== 'custom color') {
          colorDesc = ` in ${colorName}`;
        }
      }
    }

    // Build description without extra spaces
    const baseLabel = label.trim();
    if (info.count === 1) {
      descriptions.push(colorDesc ? `${baseLabel}${colorDesc}` : baseLabel);
    } else {
      const plural = `${info.count} ${baseLabel} regions`;
      descriptions.push(colorDesc ? `${plural}${colorDesc}` : plural);
    }
  }

  // Format as proper English list
  if (descriptions.length === 1) {
    return `Marked ${descriptions[0]}`;
  } else if (descriptions.length === 2) {
    return `Marked ${descriptions.join(' and ')}`;
  } else {
    const last = descriptions.pop();
    return `Marked ${descriptions.join(', ')}, and ${last}`;
  }
}

/**
 * Generate description for polygons
 */
export function describePolygons(polygons: any[]): string {
  if (!polygons || polygons.length === 0) return '';

  const descriptions: string[] = [];

  polygons.forEach(polygon => {
    const label = polygon.labelName || polygon.name || 'region';
    descriptions.push(`Outlined ${label} with polygon`);
  });

  return descriptions.join('. ');
}

/**
 * Infer clinical context from measurements
 */
function inferClinicalContext(measurements: any): string {
  const contexts: string[] = [];

  if (!measurements) return '';

  const { rulers } = measurements;

  // Check for cardiothoracic ratio
  if (rulers && rulers.length >= 2) {
    const cardiacMeasurement = rulers.find((r: any) =>
      r.labelName?.toLowerCase().includes('cardiac') ||
      r.labelName?.toLowerCase().includes('heart') ||
      r.name?.toLowerCase().includes('cardiac') ||
      r.name?.toLowerCase().includes('heart')
    );

    const thoracicMeasurement = rulers.find((r: any) =>
      r.labelName?.toLowerCase().includes('thoracic') ||
      r.labelName?.toLowerCase().includes('chest') ||
      r.labelName?.toLowerCase().includes('thorax') ||
      r.name?.toLowerCase().includes('thoracic') ||
      r.name?.toLowerCase().includes('chest')
    );

    if (cardiacMeasurement?.length && thoracicMeasurement?.length) {
      const ctr = (cardiacMeasurement.length / thoracicMeasurement.length * 100).toFixed(1);
      contexts.push(`CTR: ${ctr}%`);
    }
  }

  return contexts.join('. ');
}

/**
 * Generate complete annotation description
 */
export function generateAnnotationDescription(
  segments: SegmentMask[],
  measurements: { rulers: any[], rectangles: any[], polygons: any[] },
  imageType?: string
): string {
  const parts: string[] = [];

  // Add segmentation descriptions
  const segmentDesc = describeSegments(segments);
  if (segmentDesc) {
    parts.push(segmentDesc);
  }

  // Add measurement descriptions
  const rulerDesc = describeRulers(measurements.rulers);
  if (rulerDesc) {
    parts.push(rulerDesc);
  }

  const rectDesc = describeRectangles(measurements.rectangles);
  if (rectDesc) {
    parts.push(rectDesc);
  }

  const polyDesc = describePolygons(measurements.polygons);
  if (polyDesc) {
    parts.push(polyDesc);
  }

  // Add clinical context if applicable
  const clinicalContext = inferClinicalContext(measurements);
  if (clinicalContext) {
    parts.push(clinicalContext);
  }

  // Return complete description or a default message
  if (parts.length === 0) {
    return 'Added annotations to the image';
  }

  return parts.join('. ');
}

/**
 * Generate a brief summary for UI display
 */
export function generateAnnotationSummary(
  segmentCount: number,
  measurementCount: number
): string {
  const parts: string[] = [];

  if (segmentCount > 0) {
    parts.push(`${segmentCount} segment${segmentCount > 1 ? 's' : ''}`);
  }

  if (measurementCount > 0) {
    parts.push(`${measurementCount} measurement${measurementCount > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'No annotations';
  }

  return parts.join(' and ');
}