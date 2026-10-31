// Save a file. Inside a claude.ai artifact the page can't download directly,
// so use the platform's `downloads` capability there; elsewhere use a normal link.
export async function saveFile(filename, blob) {
  if (window.claude?.use) {
    try {
      const downloads = await window.claude.use('downloads');
      if (downloads) {
        await downloads.save({ filename, data: blob });
        return true;
      }
    } catch (e) {
      if (e?.code === 'declined') return false;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
