import { useState } from 'react';
import { downloadDocument } from '../services/api.js';

export default function DownloadButton({ document }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleDownload() {
    setDownloading(true);
    setError('');
    setSuccess('');
    let url;
    let link;
    try {
      const blob = await downloadDocument(document.id);
      url = URL.createObjectURL(blob);
      link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.appendChild(link);
      link.click();
      setSuccess('Download iniciado.');
    } catch (error) {
      setError(error.message);
    } finally {
      link?.remove();
      if (url) {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
      setDownloading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-label={`Baixar ${document.originalName}`}
        aria-busy={downloading}
      >
        {downloading ? 'Baixando…' : 'Baixar'}
      </button>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </>
  );
}
