import DownloadButton from './DownloadButton.jsx';

export default function DocumentList({ documents, loading, error, onRefresh }) {
  return (
    <section aria-labelledby="documents-title" aria-busy={loading}>
      <h2 id="documents-title">Documentos</h2>
      <p>A lista é global. O responsável informado não representa uma identidade autenticada.</p>
      <button type="button" onClick={onRefresh} disabled={loading}>
        Atualizar lista
      </button>
      {loading && <p role="status">Carregando documentos…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && documents.length === 0 && (
        <p>Nenhum documento enviado.</p>
      )}
      {documents.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <caption>Documentos disponíveis para download</caption>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Responsável</th>
                <th scope="col">Tamanho (bytes)</th>
                <th scope="col">Data de envio</th>
                <th scope="col">Tipo</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td>{document.originalName}</td>
                  <td>{document.owner}</td>
                  <td>{document.size.toLocaleString('pt-BR')}</td>
                  <td>
                    <time dateTime={document.uploadedAt}>
                      {new Date(document.uploadedAt).toLocaleString('pt-BR')}
                    </time>
                  </td>
                  <td>{document.mimeType}</td>
                  <td><DownloadButton document={document} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
