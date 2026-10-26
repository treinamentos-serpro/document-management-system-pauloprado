const { test } = require('node:test');
const assert = require('node:assert');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const app = require('../src/app');
const documentRepository = require('../src/repositories/document.repository');

const storageDirectory = path.resolve(__dirname, '../storage');

async function startServer(t) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download de documento', async (t) => {
  const baseUrl = await startServer(t);
  const form = new FormData();
  form.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'nota.txt');
  form.append('owner', 'usuario-teste');

  const uploadResponse = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  assert.strictEqual(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  t.after(() => documentRepository.deleteById(document.id));

  assert.strictEqual(document.originalName, 'nota.txt');
  assert.strictEqual(document.owner, 'usuario-teste');
  assert.strictEqual(document.mimeType, 'text/plain');
  assert.strictEqual(typeof document.storageFilename, 'undefined');

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(listResponse.status, 200);
  const listedDocuments = await listResponse.json();
  assert.ok(listedDocuments.documents.some((item) => item.id === document.id));

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment; filename="nota.txt"/);
  assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');
});

test('rejeita tipo nao permitido e owner ausente sem manter arquivos', async (t) => {
  const baseUrl = await startServer(t);
  const filesBefore = await fs.readdir(storageDirectory);

  const unsupportedForm = new FormData();
  unsupportedForm.append('file', new Blob(['conteudo'], { type: 'application/octet-stream' }), 'script.exe');
  unsupportedForm.append('owner', 'usuario-teste');
  const unsupportedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: unsupportedForm,
  });
  assert.strictEqual(unsupportedResponse.status, 415);

  const missingOwnerForm = new FormData();
  missingOwnerForm.append('file', new Blob(['conteudo'], { type: 'text/plain' }), 'nota.txt');
  const missingOwnerResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: missingOwnerForm,
  });
  assert.strictEqual(missingOwnerResponse.status, 400);

  assert.deepStrictEqual(await fs.readdir(storageDirectory), filesBefore);
});

test('rejeita arquivos acima do limite de tamanho', async (t) => {
  const baseUrl = await startServer(t);
  const form = new FormData();
  const oversizedFile = new Uint8Array(10 * 1024 * 1024 + 1);
  form.append('file', new Blob([oversizedFile], { type: 'text/plain' }), 'grande.txt');
  form.append('owner', 'usuario-teste');

  const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });

  assert.strictEqual(response.status, 413);
  assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
});

test('retorna 404 para documento desconhecido', async (t) => {
  const baseUrl = await startServer(t);
  const response = await fetch(`${baseUrl}/documents/id-inexistente/download`);

  assert.strictEqual(response.status, 404);
  assert.deepStrictEqual(await response.json(), {
    error: {
      code: 'DOCUMENT_NOT_FOUND',
      message: 'Documento não encontrado.',
    },
  });
});
