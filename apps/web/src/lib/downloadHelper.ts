/**
 * Utility to trigger real browser file downloads with zero native browser alerts.
 */
export function triggerFileDownload(fileName: string, content?: string | Blob, mimeType?: string) {
  try {
    if (content) {
      const blob = typeof content === 'string' 
        ? new Blob([content], { type: mimeType || 'application/octet-stream' }) 
        : content;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    // Determine target URL for pre-bundled assets
    let targetUrl = `/${fileName}`;
    if (fileName.endsWith('.png') || fileName.endsWith('.svg')) {
      targetUrl = `/drawings/previews/${fileName}`;
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.txt')) {
      targetUrl = `/documents/${fileName}`;
    } else if (fileName.endsWith('.pdf')) {
      targetUrl = `/${fileName}`;
    }

    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download error:', err);
  }
}
