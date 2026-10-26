const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();
const storageDirectory = path.resolve(__dirname, '../../storage');
const defaultMaxFileSize = 10 * 1024 * 1024;
const mimeTypesByExtension = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
};

function getMaxFileSize() {
  const configuredSize = Number(process.env.UPLOAD_MAX_SIZE_BYTES);
  return Number.isSafeInteger(configuredSize) && configuredSize > 0
    ? configuredSize
    : defaultMaxFileSize;
}

function getAllowedExtensions() {
  const configuredExtensions = process.env.UPLOAD_ALLOWED_EXTENSIONS;
  if (!configuredExtensions) {
    return Object.keys(mimeTypesByExtension);
  }

  return configuredExtensions
    .split(',')
    .map((extension) => {
      const normalizedExtension = extension.trim().toLowerCase();
      return normalizedExtension.startsWith('.')
        ? normalizedExtension
        : `.${normalizedExtension}`;
    })
    .filter((extension) => mimeTypesByExtension[extension]);
}

fs.mkdirSync(storageDirectory, { recursive: true });

const allowedExtensions = new Set(getAllowedExtensions());
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => callback(null, storageDirectory),
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: getMaxFileSize(),
    files: 1,
    fields: 1,
    fieldSize: 256,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedMimeType = mimeTypesByExtension[extension];
    if (!allowedExtensions.has(extension) || file.mimetype !== expectedMimeType) {
      const error = new Error('Tipo de arquivo não permitido.');
      error.statusCode = 415;
      error.code = 'UNSUPPORTED_FILE_TYPE';
      callback(error);
      return;
    }

    callback(null, true);
  },
});

router.post('/upload', upload.single('file'), documentsController.upload);
router.get('/documents', documentsController.list);
router.get('/documents/:id/download', documentsController.download);

module.exports = router;