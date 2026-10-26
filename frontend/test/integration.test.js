import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { downloadDocument, listDocuments, uploadDocument } from '../src/services/api.js';

const require = createRequire(import.meta.url);
const app = require('../../backend/src/app.js');
const documentRepository = require('../../backend/src/repositories/document.repository.js');

test('integra o cliente e os componentes com o backend através do proxy Vite', async (t) => {
  const backend = app.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  t.after(() => new Promise((resolve) => backend.close(resolve)));

  const vite = await createServer({
    server: {
      host: '127.0.0.1',
      port: 0,
      proxy: {
        '/api': { target: `http://127.0.0.1:${backend.address().port}` },
      },
    },
  });
  t.after(() => vite.close());
  await vite.listen();
  const baseUrl = `http://127.0.0.1:${vite.httpServer.address().port}`;
  const nativeFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (url, options) => nativeFetch(`${baseUrl}${url}`, options));

  const content = 'Documento de integração';
  const document = await uploadDocument(
    new File([content], 'integracao.txt', { type: 'text/plain' }),
    'usuario-integracao',
  );
  t.after(() => documentRepository.deleteById(document.id));
  assert.equal(document.originalName, 'integracao.txt');
  assert.equal(document.owner, 'usuario-integracao');
  assert.equal(document.mimeType, 'text/plain');
  const documents = await listDocuments();
  assert.ok(documents.some((item) => item.id === document.id));
  assert.equal(await (await downloadDocument(document.id)).text(), content);
  await assert.rejects(downloadDocument('inexistente'), { message: 'Documento não encontrado.' });

  const { default: DocumentList } = await vite.ssrLoadModule('/src/components/DocumentList.jsx');
  const renderList = (props) => renderToStaticMarkup(createElement(DocumentList, {
    documents: [],
    loading: false,
    error: '',
    onRefresh() {},
    ...props,
  }));
  const listMarkup = renderList({ documents });
  for (const value of [document.originalName, document.owner, document.mimeType, document.uploadedAt]) {
    assert.ok(listMarkup.includes(value));
  }
  assert.ok(listMarkup.includes(`aria-label="Baixar ${document.originalName}"`));
  assert.match(renderList(), /Nenhum documento enviado/);
  const loadingMarkup = renderList({ loading: true });
  assert.match(loadingMarkup, /Carregando documentos/);
  assert.doesNotMatch(loadingMarkup, /Nenhum documento enviado/);
  const errorMarkup = renderList({ error: 'Erro de listagem' });
  assert.match(errorMarkup, /role="alert">Erro de listagem/);
  assert.doesNotMatch(errorMarkup, /Nenhum documento enviado/);
  assert.match(renderList({ documents, error: 'Erro de listagem' }), /integracao.txt/);

  const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
  const appMarkup = renderToStaticMarkup(createElement(App));
  assert.match(appMarkup, /Enviar documento/);
  assert.match(appMarkup, /name="owner"/);
  assert.match(appMarkup, /type="file"/);
  assert.match(appMarkup, /Carregando documentos/);
});
