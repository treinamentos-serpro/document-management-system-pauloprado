const { randomUUID } = require('node:crypto');
const path = require('node:path');
const documentRepository = require('../repositories/document.repository');

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function toPublicDocument(document) {
  const { storageFilename, ...publicDocument } = document;
  return publicDocument;
}

function normalizeOriginalName(originalName) {
  return path.basename(originalName.replace(/\\/g, '/'));
}

async function uploadDocument(file, owner) {
  if (!file) {
    throw createError(400, 'FILE_REQUIRED', 'O arquivo é obrigatório.');
  }

  if (typeof owner !== 'string' || !owner.trim()) {
    await documentRepository.removeStoredFile(file.filename);
    throw createError(400, 'OWNER_REQUIRED', 'O campo owner é obrigatório.');
  }

  const document = {
    id: randomUUID(),
    originalName: normalizeOriginalName(file.originalname),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: owner.trim(),
    mimeType: file.mimetype,
    storageFilename: file.filename,
  };

  try {
    documentRepository.create(document);
  } catch (error) {
    await documentRepository.removeStoredFile(file.filename);
    throw error;
  }

  return toPublicDocument(document);
}

function listDocuments() {
  return documentRepository
    .findAll()
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .map(toPublicDocument);
}

async function getDocumentDownload(id) {
  const download = await documentRepository.findDownloadById(id);
  if (!download) {
    throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return {
    document: toPublicDocument(download.document),
    filePath: download.filePath,
  };
}

module.exports = {
  getDocumentDownload,
  listDocuments,
  uploadDocument,
};