const documentsService = require('../services/documents.service');

async function upload(req, res) {
  const document = await documentsService.uploadDocument(req.file, req.body.owner);
  res.status(201).json({ document });
}

function list(req, res) {
  res.json({ documents: documentsService.listDocuments() });
}

async function download(req, res, next) {
  const { document, filePath } = await documentsService.getDocumentDownload(req.params.id);
  res.type(document.mimeType);
  res.download(filePath, document.originalName, (error) => {
    if (error) {
      next(error);
    }
  });
}

module.exports = {
  download,
  list,
  upload,
};