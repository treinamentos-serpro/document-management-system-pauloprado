// Seed do servidor backend do Document Management System.
//
// As rotas delegam para controllers, services e repositories, que mantêm
// separadas as responsabilidades HTTP, de negócio e de persistência.
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const documentsRouter = require('./routes/documents.routes');
const errorHandler = require('./middleware/error-handler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Endpoint de verificação de saúde.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', documentsRouter);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
