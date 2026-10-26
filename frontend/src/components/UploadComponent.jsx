import { useState } from 'react';
import { uploadDocument } from '../services/api.js';

export default function UploadComponent({ onUploaded }) {
  const [owner, setOwner] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!owner.trim() || !file) {
      setError('Informe o responsável e selecione um arquivo.');
      return;
    }

    const form = event.currentTarget;
    setUploading(true);
    try {
      const document = await uploadDocument(file, owner);
      form.reset();
      setFile(null);
      setSuccess(`Documento "${document.originalName}" enviado com sucesso.`);
      onUploaded();
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section aria-labelledby="upload-title">
      <h2 id="upload-title">Enviar documento</h2>
      <form onSubmit={handleSubmit} aria-busy={uploading}>
        <fieldset disabled={uploading}>
          <p>
            <label htmlFor="owner">Responsável</label>{' '}
            <input
              id="owner"
              name="owner"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              required
            />
          </p>
          <p>
            <label htmlFor="file">Arquivo</label>{' '}
            <input
              id="file"
              name="file"
              type="file"
              onChange={(event) => setFile(event.target.files[0] ?? null)}
              required
            />
          </p>
          <p>O servidor valida os tipos permitidos e o limite de tamanho do arquivo.</p>
          <button type="submit">{uploading ? 'Enviando…' : 'Enviar documento'}</button>
        </fieldset>
      </form>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </section>
  );
}
