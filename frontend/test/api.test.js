import assert from 'node:assert/strict';
import { test } from 'node:test';
import { downloadDocument, listDocuments, uploadDocument } from '../src/services/api.js';

test('lista documentos usando o prefixo /api e o sinal de cancelamento', async (t) => {
  const documents = [{ id: 'document-1', originalName: 'nota.txt' }];
  const signal = new AbortController().signal;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/documents');
    assert.equal(options.signal, signal);
    return Response.json({ documents });
  });
  assert.deepEqual(await listDocuments({ signal }), documents);
});

test('envia arquivo e owner em multipart sem definir Content-Type manualmente', async (t) => {
  const file = new File(['conteudo'], 'nota.txt', { type: 'text/plain' });
  const document = { id: 'document-1', originalName: file.name };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/upload');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers, undefined);
    assert.equal(options.body.get('owner'), 'usuario-1');
    const uploadedFile = options.body.get('file');
    assert.equal(uploadedFile.name, file.name);
    assert.equal(await uploadedFile.text(), 'conteudo');
    return Response.json({ document }, { status: 201 });
  });
  assert.deepEqual(await uploadDocument(file, ' usuario-1 '), document);
});

test('baixa conteúdo binário e codifica o identificador no caminho', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/api/documents/id%2Fcom%20espa%C3%A7o/download');
    return new Response(new Uint8Array([0, 1, 255]));
  });
  const blob = await downloadDocument('id/com espaço');
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), new Uint8Array([0, 1, 255]));
});

test('apresenta as mensagens seguras de validação e download do backend', async (t) => {
  for (const status of [400, 404, 413, 415]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json({
      error: { code: 'ERROR', message: `Erro de operação ${status}.` },
    }, { status }));
    await assert.rejects(downloadDocument('id'), { message: `Erro de operação ${status}.` });
    t.mock.restoreAll();
  }
});

test('não expõe detalhes de falhas internas ou respostas HTML', async (t) => {
  for (const response of [
    Response.json({ error: { message: '/storage/caminho-interno' } }, { status: 500 }),
    new Response('<html>erro do proxy</html>', { status: 502 }),
    new Response('{', { status: 400, headers: { 'Content-Type': 'application/json' } }),
  ]) {
    t.mock.method(globalThis, 'fetch', async () => response);
    await assert.rejects(listDocuments(), { message: 'Não foi possível concluir a operação.' });
    t.mock.restoreAll();
  }
});

test('sinaliza falhas de conexão e preserva cancelamento', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(listDocuments(), { message: 'Não foi possível conectar ao servidor.' });
  t.mock.restoreAll();

  const abortError = new DOMException('Cancelado', 'AbortError');
  t.mock.method(globalThis, 'fetch', async () => { throw abortError; });
  await assert.rejects(listDocuments(), (error) => error === abortError);
});

test('rejeita respostas de sucesso inválidas em vez de retornar uma lista vazia', async (t) => {
  for (const payload of [null, {}, { documents: null }]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json(payload));
    await assert.rejects(listDocuments(), { message: 'O servidor retornou uma lista inválida.' });
    t.mock.restoreAll();
  }
  t.mock.method(globalThis, 'fetch', async () => new Response('não é JSON'));
  await assert.rejects(listDocuments(), { message: 'O servidor retornou uma resposta inválida.' });
});

test('rejeita upload sem os metadados esperados', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({}));
  await assert.rejects(
    uploadDocument(new File(['teste'], 'nota.txt'), 'usuario'),
    { message: 'O servidor retornou um documento inválido.' },
  );
});
