const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.resolve(__dirname, '../../storage');
const documents = new Map();

function create(document) {
  documents.set(document.id, { ...document });
  return { ...document };
}

function findAll() {
  return Array.from(documents.values(), (document) => ({ ...document }));
}

function findById(id) {
  const document = documents.get(id);
  return document ? { ...document } : null;
}

function getStoragePath(storageFilename) {
  const safeFilename = path.basename(storageFilename);
  return path.join(storageDirectory, safeFilename);
}

async function findDownloadById(id) {
  const document = documents.get(id);
  if (!document) {
    return null;
  }

  const filePath = getStoragePath(document.storageFilename);
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  return { document: { ...document }, filePath };
}

async function removeStoredFile(storageFilename) {
  await fs.rm(getStoragePath(storageFilename), { force: true });
}

async function deleteById(id) {
  const document = documents.get(id);
  if (!document) {
    return false;
  }

  documents.delete(id);
  await removeStoredFile(document.storageFilename);
  return true;
}

module.exports = {
  create,
  deleteById,
  findAll,
  findById,
  findDownloadById,
  removeStoredFile,
};