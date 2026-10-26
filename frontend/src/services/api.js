const API_PREFIX = '/api';

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new Error('Não foi possível conectar ao servidor.');
  }

  if (!response.ok) {
    let message = 'Não foi possível concluir a operação.';
    if (response.headers.get('content-type')?.includes('application/json')) {
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(message);
      }
      if (response.status < 500 && typeof payload?.error?.message === 'string') {
        message = payload.error.message;
      }
    }
    throw new Error(message);
  }

  return response;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    throw new Error('O servidor retornou uma resposta inválida.');
  }
}

export async function listDocuments({ signal } = {}) {
  const response = await request('/documents', { signal });
  const payload = await readJson(response);
  if (!Array.isArray(payload?.documents)) {
    throw new Error('O servidor retornou uma lista inválida.');
  }
  return payload.documents;
}

export async function uploadDocument(file, owner) {
  const body = new FormData();
  body.append('owner', owner.trim());
  body.append('file', file);
  const response = await request('/upload', { method: 'POST', body });
  const payload = await readJson(response);
  if (!payload?.document || typeof payload.document.id !== 'string') {
    throw new Error('O servidor retornou um documento inválido.');
  }
  return payload.document;
}

export async function downloadDocument(id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  try {
    return await response.blob();
  } catch {
    throw new Error('Não foi possível ler o arquivo recebido.');
  }
}
