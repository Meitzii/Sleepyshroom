/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Downloads a high-resolution wallpaper image file reliably in modern browsers
 * without corrupting the file or requiring a separate Node.js server route.
 * Works seamlessly in local development, Cloud Run, GitHub Pages, and Vercel.
 */
export async function downloadWallpaperFile(imageUrl: string, filename: string): Promise<boolean> {
  const cleanFilename = filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.png')
    ? filename
    : `${filename.replace(/\.zip$/i, '')}.jpg`;

  try {
    // 1. Fetch the binary image asset directly
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // 2. Extract real image binary blob (JPEG/PNG)
    const blob = await response.blob();
    
    // Ensure blob has proper image MIME type
    const imageBlob = blob.type.startsWith('image/') 
      ? blob 
      : new Blob([blob], { type: 'image/jpeg' });

    // 3. Create temporary object URL and trigger download
    const blobUrl = URL.createObjectURL(imageBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // 4. Clean up after download triggers
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1500);

    return true;
  } catch (err) {
    console.warn('Direct blob download error, attempting fallback download link:', err);
    
    // Fallback: direct anchor download
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = cleanFilename;
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1500);

    return false;
  }
}
