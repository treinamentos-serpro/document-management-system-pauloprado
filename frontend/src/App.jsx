import { useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/api.js';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  function refreshDocuments() {
    setRefreshVersion((version) => version + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    async function loadDocuments() {
      try {
        const result = await listDocuments({ signal: controller.signal });
        if (!controller.signal.aborted) {
          setDocuments(result);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDocuments();
    return () => controller.abort();
  }, [refreshVersion]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Document Management System</h1>
      <UploadComponent onUploaded={refreshDocuments} />
      <DocumentList
        documents={documents}
        loading={loading}
        error={error}
        onRefresh={refreshDocuments}
      />
    </main>
  );
}
