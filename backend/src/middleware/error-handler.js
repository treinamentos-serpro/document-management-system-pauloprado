const multer = require('multer');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  let statusCode = error.statusCode || 500;
  let code = error.code || 'INTERNAL_SERVER_ERROR';
  let message = statusCode < 500 ? error.message : 'Erro interno do servidor.';

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      code = 'FILE_TOO_LARGE';
      message = 'O arquivo excede o tamanho máximo permitido.';
    } else {
      statusCode = 400;
      code = 'INVALID_UPLOAD';
      message = 'Os campos do upload são inválidos.';
    }
  } else if (error.code === 'ENOENT') {
    statusCode = 404;
    code = 'DOCUMENT_NOT_FOUND';
    message = 'Documento não encontrado.';
  }

  res.status(statusCode).json({
    error: { code, message },
  });
}

module.exports = errorHandler;