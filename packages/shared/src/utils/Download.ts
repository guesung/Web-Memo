interface DownloadOption {
  fileExtension: 'json' | 'csv';
  fileName?: string;
}
export const downloadBlob = (blob: Blob, { fileExtension, fileName = 'web-memo' }: DownloadOption) => {
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');

  downloadAnchor.href = url;
  downloadAnchor.download = `${fileName}.${fileExtension}`;
  downloadAnchor.click();
};
