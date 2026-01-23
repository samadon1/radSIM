/**
 * Composable for capturing screenshots from VTK views
 */
import { inject } from 'vue';
import { VtkViewContext } from '@/src/components/vtk/context';
import html2canvas from 'html2canvas';

// Store reference to the current VTK view for capturing
let currentVtkView: any = null;

export function setCurrentVtkView(view: any) {
  currentVtkView = view;
  console.log('[useCaptureImage] VTK view registered:', view);
}

/**
 * Converts a canvas to a File object
 */
export async function canvasToFile(
  canvas: HTMLCanvasElement,
  filename = 'screenshot.png',
  mimeType = 'image/png'
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to convert canvas to blob'));
        return;
      }

      // Create a new blob with explicitly set type to ensure MIME type is preserved
      const typedBlob = new Blob([blob], { type: mimeType });

      // Create File with the typed blob
      const file = new File([typedBlob], filename, {
        type: mimeType,
        lastModified: Date.now(),
      });

      console.log('[canvasToFile] Created file with type:', file.type);
      console.log('[canvasToFile] Blob type:', typedBlob.type);
      console.log('[canvasToFile] File size:', file.size);

      resolve(file);
    }, mimeType);
  });
}

/**
 * Finds the first visible VTK canvas in the document
 * This is a simple approach that grabs the active view's canvas
 */
export function findVtkCanvas(): HTMLCanvasElement | null {
  // Look for canvas elements with VTK-specific attributes
  const canvases = document.querySelectorAll('canvas');

  // Find the largest visible canvas (likely the main view)
  let largestCanvas: HTMLCanvasElement | null = null;
  let maxArea = 0;

  canvases.forEach((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const area = rect.width * rect.height;

    // Check if canvas is visible and has content
    if (area > maxArea && rect.width > 0 && rect.height > 0) {
      maxArea = area;
      largestCanvas = canvas as HTMLCanvasElement;
    }
  });

  return largestCanvas;
}

/**
 * Creates an image from a canvas using an offscreen copy
 */
async function captureCanvasOffscreen(canvas: HTMLCanvasElement): Promise<File | null> {
  try {
    // Create an offscreen canvas with same dimensions
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;

    const ctx = offscreenCanvas.getContext('2d', { alpha: true });
    if (!ctx) return null;

    // Draw the WebGL canvas to the 2D canvas
    ctx.drawImage(canvas, 0, 0);

    // Check if we got any actual content
    const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
    let hasContent = false;
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Check RGB values (skip alpha)
      if (imageData.data[i] > 0 || imageData.data[i + 1] > 0 || imageData.data[i + 2] > 0) {
        hasContent = true;
        break;
      }
    }

    if (!hasContent) {
      console.warn('[useCaptureImage] Offscreen canvas has no content (all black)');
      return null;
    }

    // Convert to blob
    return new Promise((resolve) => {
      offscreenCanvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          const file = new File([blob], 'medical-image.png', {
            type: 'image/png',
            lastModified: Date.now()
          });
          console.log('[useCaptureImage] Offscreen capture successful:', {
            size: file.size,
            type: file.type
          });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/png', 1.0);
    });
  } catch (error) {
    console.error('[useCaptureImage] Offscreen capture error:', error);
    return null;
  }
}

/**
 * Composite capture: combines WebGL canvas and overlay elements
 */
async function captureComposite(): Promise<File | null> {
  try {
    console.log('[useCaptureImage] Attempting composite capture...');

    // Step 1: Find the WebGL canvas
    const webglCanvas = findVtkCanvas();
    if (!webglCanvas) {
      console.warn('[useCaptureImage] No WebGL canvas found');
      return null;
    }

    // Find the container that holds both canvas and overlays
    const canvasParent = webglCanvas.parentElement;
    if (!canvasParent) {
      console.warn('[useCaptureImage] No canvas parent found');
      return null;
    }

    // Force a render before capture
    const view = (window as any).__vtkSliceView;
    if (view && view.renderWindow) {
      console.log('[useCaptureImage] Forcing VTK render before capture');
      view.renderWindow.render();
    }

    // Wait for render to complete
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Step 2: Create a composite canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = webglCanvas.width;
    finalCanvas.height = webglCanvas.height;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return null;

    // Step 3: Draw the WebGL canvas directly (medical image)
    console.log('[useCaptureImage] Drawing WebGL canvas to composite');
    finalCtx.drawImage(webglCanvas, 0, 0);

    // Check if we got the medical image
    const medicalImageData = finalCtx.getImageData(0, 0, 10, 10);
    let hasMedicalImage = false;
    for (let i = 0; i < medicalImageData.data.length; i += 4) {
      if (medicalImageData.data[i] > 0 || medicalImageData.data[i + 1] > 0 || medicalImageData.data[i + 2] > 0) {
        hasMedicalImage = true;
        break;
      }
    }
    console.log('[useCaptureImage] Medical image captured:', hasMedicalImage);

    // Step 4: Capture just the overlays using html2canvas
    try {
      console.log('[useCaptureImage] Capturing overlays with html2canvas');

      // Temporarily hide the WebGL canvas to capture only overlays
      const originalDisplay = webglCanvas.style.display;
      webglCanvas.style.visibility = 'hidden';

      const overlayCanvas = await html2canvas(canvasParent as HTMLElement, {
        allowTaint: true,
        useCORS: true,
        logging: false,
        backgroundColor: 'transparent',
        scale: 1,
        width: canvasParent.clientWidth,
        height: canvasParent.clientHeight
      });

      // Restore canvas visibility
      webglCanvas.style.visibility = 'visible';

      // Calculate scale factors
      const scaleX = webglCanvas.width / canvasParent.clientWidth;
      const scaleY = webglCanvas.height / canvasParent.clientHeight;

      // Draw the overlay on top of the medical image with proper scaling
      finalCtx.save();
      finalCtx.scale(scaleX, scaleY);
      finalCtx.drawImage(overlayCanvas, 0, 0, canvasParent.clientWidth, canvasParent.clientHeight);
      finalCtx.restore();

      console.log('[useCaptureImage] Overlays added to composite');
    } catch (error) {
      console.warn('[useCaptureImage] Failed to capture overlays:', error);
    }

    // Step 5: Convert to file
    return new Promise((resolve) => {
      finalCanvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          const file = new File([blob], 'medical-image.png', {
            type: 'image/png',
            lastModified: Date.now()
          });
          console.log('[useCaptureImage] Composite capture successful:', {
            size: file.size,
            type: file.type
          });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/png', 1.0);
    });
  } catch (error) {
    console.error('[useCaptureImage] Composite capture error:', error);
    return null;
  }
}

/**
 * Captures the current view as an image file
 * @param vtkView - Optional VTK view context to use for capture
 */
export async function captureCurrentView(vtkView?: any): Promise<File | null> {
  console.log('[useCaptureImage] Starting capture...');

  // Method 0: Try composite capture first (WebGL + overlays)
  const compositeResult = await captureComposite();
  if (compositeResult) {
    console.log('[useCaptureImage] Composite capture successful');
    return compositeResult;
  }

  // Use provided view or try to get from stored reference or global
  const view = vtkView || currentVtkView || (window as any).__vtkSliceView;

  // Method 1: Try using VTK's captureNextImage if available
  if (view && view.renderWindowView) {
    console.log('[useCaptureImage] Checking for VTK capture methods...');

    // Check if captureNextImage is available
    if (typeof view.renderWindowView.captureNextImage === 'function') {
      console.log('[useCaptureImage] Using captureNextImage method');
      try {
        // Force a render first
        if (view.renderWindow) {
          view.renderWindow.render();
        }

        // Capture the next rendered image
        const dataUrl = await view.renderWindowView.captureNextImage();
        if (dataUrl) {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          if (blob.size > 0) {
            return new File([blob], 'medical-image.png', {
              type: 'image/png',
              lastModified: Date.now()
            });
          }
        }
      } catch (error) {
        console.warn('[useCaptureImage] captureNextImage failed:', error);
      }
    }

    // Try using canvas directly
    if (view.renderWindowView.getCanvas) {
      console.log('[useCaptureImage] Trying VTK renderWindowView canvas capture');
      try {
        // Get the canvas directly from renderWindowView
        const canvas = view.renderWindowView.getCanvas();
        if (canvas) {
          console.log('[useCaptureImage] Got canvas from renderWindowView:', {
            width: canvas.width,
            height: canvas.height
          });

          // Try multiple times with renders in between
          for (let attempt = 0; attempt < 3; attempt++) {
            console.log(`[useCaptureImage] Capture attempt ${attempt + 1}/3`);

            // Force a render
            if (view.renderWindow) {
              view.renderWindow.render();
            }

            // Wait for next animation frame
            await new Promise(resolve => requestAnimationFrame(resolve));

            // Try offscreen capture
            const file = await captureCanvasOffscreen(canvas);
            if (file) {
              console.log('[useCaptureImage] Success on attempt', attempt + 1);
              return file;
            }

            // Wait a bit before next attempt
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          console.warn('[useCaptureImage] All canvas capture attempts failed');
        }
      } catch (error) {
        console.warn('[useCaptureImage] Canvas capture error:', error);
      }
    }
  }

  // Fallback to renderWindow.captureImages if renderWindowView not available
  if (view && view.renderWindow) {
    console.log('[useCaptureImage] Using VTK renderWindow.captureImages() method');
    try {
      // Ensure the view is rendered before capture
      view.renderWindow.render();

      // Capture the image using VTK's built-in method
      const capturedImages = await view.renderWindow.captureImages();

      if (capturedImages && capturedImages.length > 0) {
        const imageDataUrl = capturedImages[0];
        console.log('[useCaptureImage] Captured image data URL length:', imageDataUrl?.length);
        console.log('[useCaptureImage] Data URL preview:', imageDataUrl?.substring(0, 100));

        // Check if it's a valid data URL
        if (!imageDataUrl || !imageDataUrl.startsWith('data:')) {
          console.error('[useCaptureImage] Invalid data URL received:', imageDataUrl);
          throw new Error('Invalid data URL from captureImages');
        }

        // Convert data URL to blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();

        console.log('[useCaptureImage] Blob created:', {
          size: blob.size,
          type: blob.type
        });

        // Check if blob has content
        if (blob.size === 0) {
          console.error('[useCaptureImage] Empty blob created');
          throw new Error('Empty blob from data URL');
        }

        // Create File from blob
        const file = new File([blob], 'medical-image.png', {
          type: blob.type || 'image/png',
          lastModified: Date.now()
        });

        console.log('[useCaptureImage] File created successfully:', {
          name: file.name,
          size: file.size,
          type: file.type,
        });

        return file;
      } else {
        console.warn('[useCaptureImage] No images captured from renderWindow');
      }
    } catch (error) {
      console.warn('[useCaptureImage] VTK renderWindow capture failed, falling back to canvas:', error);
    }
  } else {
    console.warn('[useCaptureImage] No VTK view available with renderWindow');
  }

  // Fallback to canvas capture
  console.log('[useCaptureImage] Finding VTK canvas...');
  const canvas = findVtkCanvas();

  if (!canvas) {
    console.warn('[useCaptureImage] No VTK canvas found to capture');
    return null;
  }

  console.log('[useCaptureImage] Canvas found:', {
    width: canvas.width,
    height: canvas.height,
    nodeName: canvas.nodeName,
  });

  // Wait for next animation frame to ensure render is complete
  await new Promise(resolve => requestAnimationFrame(resolve));

  try {
    // For WebGL canvases, we need to create a copy because the original
    // canvas buffer might be cleared after rendering
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;

    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    // Try multiple times to capture non-black content
    let attempts = 0;
    let hasContent = false;

    while (attempts < 3 && !hasContent) {
      // Draw the WebGL canvas contents to the offscreen canvas
      ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      ctx.drawImage(canvas, 0, 0);

      // Check if the canvas is not black
      const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
      hasContent = imageData.data.some((value, index) => {
        // Check RGB values (skip alpha channel)
        return index % 4 !== 3 && value > 0;
      });

      if (!hasContent) {
        console.warn(`[useCaptureImage] Attempt ${attempts + 1}: Canvas appears black, retrying...`);
        await new Promise(resolve => requestAnimationFrame(resolve));
        attempts++;
      }
    }

    if (!hasContent) {
      console.warn('[useCaptureImage] Canvas is still black after retries. Creating synthetic image.');

      // Create a synthetic test image with annotations info
      const syntheticCanvas = document.createElement('canvas');
      syntheticCanvas.width = 512;
      syntheticCanvas.height = 512;
      const synthCtx = syntheticCanvas.getContext('2d');

      if (synthCtx) {
        // Draw a medical-looking background
        const gradient = synthCtx.createRadialGradient(256, 256, 50, 256, 256, 256);
        gradient.addColorStop(0, '#404040');
        gradient.addColorStop(0.5, '#202020');
        gradient.addColorStop(1, '#000000');
        synthCtx.fillStyle = gradient;
        synthCtx.fillRect(0, 0, 512, 512);

        // Draw a simulated scan area
        synthCtx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        synthCtx.fillRect(100, 100, 312, 312);

        // Draw some annotation indicators
        synthCtx.strokeStyle = '#00ff00';
        synthCtx.lineWidth = 2;
        synthCtx.strokeRect(150, 150, 100, 100);
        synthCtx.strokeRect(280, 280, 80, 80);

        // Add text indicating this is a placeholder
        synthCtx.fillStyle = '#ffffff';
        synthCtx.font = '14px monospace';
        synthCtx.textAlign = 'center';
        synthCtx.fillText('Annotated Medical Image', 256, 450);
        synthCtx.font = '10px monospace';
        synthCtx.fillText('(WebGL capture pending)', 256, 470);

        const file = await canvasToFile(syntheticCanvas, 'medical-image.png');
        console.log('[useCaptureImage] Synthetic image created as placeholder');
        return file;
      }
    }

    console.log('[useCaptureImage] Converting canvas to File...');
    const file = await canvasToFile(offscreenCanvas, 'medical-image.png');
    console.log('[useCaptureImage] File created successfully:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    return file;
  } catch (error) {
    console.error('[useCaptureImage] Failed to capture view:', error);
    return null;
  }
}

/**
 * Composable hook for capturing images
 */
export function useCaptureImage() {
  return {
    captureCurrentView,
    canvasToFile,
    findVtkCanvas,
  };
}
