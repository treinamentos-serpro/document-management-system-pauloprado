# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web para enviar, listar e baixar documentos armazenados localmente, associando cada documento a um identificador simples de usuário.

## 2. Escopo

### Dentro do escopo

- Enviar documentos por uma interface web.
- Validar tipo e tamanho do arquivo recebido.
- Registrar metadados do documento em memória durante a execução do backend.
- Listar os documentos registrados, incluindo o identificador de owner informado no envio.
- Baixar um documento pelo seu identificador.
- Exibir estados de carregamento e erros nas operacoes da interface.
- Manter os arquivos enviados no filesystem local da aplicação, em `backend/storage`.

### Fora do escopo

- Armazenamento externo, em nuvem ou por servicos de terceiros.
- Banco de dados ou persistencia duravel de metadados.
- Autenticação, autorização e isolamento de documentos por usuário.
- Versionamento, compartilhamento, edicao ou exclusao de documentos.
- Recuperacao automatica dos metadados depois de reiniciar o backend.
- Leitura, conversão, indexação ou verificação antimalware do conteúdo dos arquivos.

## 3. Requisitos funcionais

| ID | Requisito | Criterio de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um arquivo com um identificador de owner. | Um envio válido cria um identificador único, grava o arquivo no armazenamento local e retorna os metadados do documento. |
| RF-02 | O sistema aceita apenas os tipos de documento configurados. | O tipo e a extensão devem pertencer à allowlist; os demais envios são rejeitados sem criar metadados. |
| RF-03 | O sistema limita o tamanho do arquivo enviado. | O limite padrão é 10 MiB e pode ser configurado por ambiente; arquivos maiores são rejeitados. |
| RF-04 | O usuário pode listar os documentos registrados. | A resposta contém os metadados públicos de todos os documentos em memória, em ordem decrescente de data de envio. |
| RF-05 | O usuário pode baixar um documento pelo identificador. | Um identificador existente retorna o conteúdo binário como anexo com o nome original; um identificador inexistente retorna erro 404. |
| RF-06 | O sistema associa cada documento ao owner recebido no upload. | `owner` é uma string não vazia fornecida pelo cliente; não representa uma identidade autenticada. |
| RF-07 | A interface permite realizar upload, consultar a lista e baixar documentos. | A interface apresenta confirmação ou erro para cada operação sem expor detalhes internos do servidor. |
| RF-08 | O sistema oferece verificação operacional de saúde. | `GET /health` responde com o estado `ok` enquanto o processo estiver ativo. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados no filesystem local em `backend/storage`, usando Multer com `diskStorage`. Nenhum provedor externo pode ser usado. |
| RNF-02 | Os metadados devem permanecer em memória nesta fase; a reinicialização do backend pode torná-los indisponíveis mesmo que os arquivos continuem no disco. |
| RNF-03 | A configuracao operacional deve vir de variaveis de ambiente, incluindo a porta e o limite de tamanho do upload. |
| RNF-04 | O backend deve separar rotas, controllers, services e repositories, com dependencias no sentido `routes -> controllers -> services -> repositories`. |
| RNF-05 | O backend usa Node.js, Express e CommonJS; o frontend usa React, Vite e JavaScript ESM, sem TypeScript nesta fase. |
| RNF-06 | O nome original do arquivo nunca deve ser usado como caminho físico de armazenamento. O nome físico deve ser gerado pelo sistema e o caminho deve permanecer dentro de `backend/storage`. |
| RNF-07 | Erros não devem expor stack traces, caminhos locais ou detalhes internos ao cliente. |
| RNF-08 | A API deve distinguir erros de validação, arquivo acima do limite, tipo não aceito e documento inexistente usando códigos HTTP apropriados. |

### Política de upload

- Limite padrão: 10 MiB (10.485.760 bytes), configurável por `UPLOAD_MAX_SIZE_BYTES`.
- Allowlist padrão: PDF, TXT, DOC, DOCX e ODT, configurável por `UPLOAD_ALLOWED_EXTENSIONS` como lista de extensões separadas por vírgula.
- A validação deve considerar extensão e tipo MIME declarado; essa verificação não garante que o conteúdo interno corresponda ao formato declarado.
- Apenas um arquivo é aceito por requisição.
- O nome original é preservado como metadado e nome sugerido no download. O armazenamento físico usa um nome gerado e único.
- Arquivos parcialmente gravados devem ser removidos se o processamento do upload falhar.

| Extensão | Tipo MIME aceito |
| --- | --- |
| `.pdf` | `application/pdf` |
| `.txt` | `text/plain` |
| `.doc` | `application/msword` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.odt` | `application/vnd.oasis.opendocument.text` |

## 5. Modelo de dados

### Metadados publicos do documento

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único, gerado pelo backend (UUID). |
| `originalName` | string | Sim | Nome original recebido no upload; usado para exibição e download, nunca como caminho físico. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Sim | Data e hora do recebimento em ISO 8601, UTC. |
| `owner` | string | Sim | Identificador simples enviado pelo cliente; não é autenticado. |
| `mimeType` | string | Sim | Tipo MIME declarado e aceito para o arquivo. |

### Dados internos de persistencia

O repository mantém os metadados em memória, indexados por `id`. Cada registro também referencia um `storageFilename` gerado pelo sistema. Esse campo é interno, não deve aparecer na API e é resolvido dentro de `backend/storage` para localizar o arquivo. O caminho completo do filesystem nunca é retornado ao cliente.

O arquivo é gravado em disco antes de publicar seu registro no repository. Se o registro não puder ser criado, o arquivo recém-gravado deve ser removido. Os metadados não são reconstruídos a partir dos arquivos ao reiniciar o processo.

## 6. Contratos de API

Os caminhos abaixo são os caminhos públicos usados pelo frontend (`/api/...`). No desenvolvimento, o proxy do Vite encaminha `/api` para `http://localhost:3000` e remove esse prefixo antes de enviar a requisição ao Express. Em outro ambiente, a infraestrutura deve fornecer o roteamento equivalente.

As respostas de erro usam o formato:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição segura para o usuário"
  }
}
```

### POST /api/upload

- Content-Type: `multipart/form-data`.
- Campos obrigatorios:
  - `file`: um arquivo permitido, maximo de 10 MiB por default.
  - `owner`: identificador não vazio, tratado como texto opaco.
- Sucesso: `201 Created`, JSON com o objeto `document` contendo os metadados publicos.

```json
{
  "document": {
    "id": "UUID",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-10-26T12:00:00.000Z",
    "owner": "usuario-123",
    "mimeType": "application/pdf"
  }
}
```

- `400 Bad Request`: arquivo ou owner ausente/inválido.
- `413 Payload Too Large`: arquivo excede o limite configurado.
- `415 Unsupported Media Type`: extensão ou tipo MIME não permitido.
- `500 Internal Server Error`: falha inesperada ao gravar o arquivo ou registrar metadados; resposta sem detalhes internos.

### GET /api/documents

- Sem autenticação e sem filtro por owner; retorna a lista global dos documentos conhecidos pelo processo atual.
- Sucesso: `200 OK`, JSON com `documents`, uma lista de metadados públicos. Lista vazia é representada por `[]`.
- A lista e ordenada por `uploadedAt` decrescente.
- Falha inesperada: `500 Internal Server Error` no formato padrão de erro.

```json
{
  "documents": []
}
```

### GET /api/documents/:id/download

- `id`: identificador do documento retornado pelo upload ou pela listagem.
- Sucesso: `200 OK`, corpo binario, `Content-Disposition: attachment` com `originalName` e `Content-Type` correspondente ao MIME registrado.
- `404 Not Found`: documento sem metadados conhecidos ou arquivo correspondente ausente.
- `500 Internal Server Error`: falha inesperada de leitura, sem expor o caminho local.

### GET /health

- Endpoint operacional existente, fora do prefixo `/api`.
- Sucesso: `200 OK`, JSON `{ "status": "ok" }`.

## 7. Decisões arquiteturais

### Backend

- `routes/`: declara os endpoints e encaminha requisições aos controllers.
- `controllers/`: valida entrada HTTP, chama services e traduz resultados para respostas HTTP.
- `services/`: aplica regras de negócio, como validação do upload, criação de metadados e coordenação entre armazenamento e repository.
- `repositories/`: encapsula a escrita/leitura de arquivos locais e o acesso ao mapa de metadados em memória.
- Multer com `diskStorage` grava arquivos em `backend/storage`; o destino e o nome físico são controlados pela aplicação.
- Configuração por ambiente; `PORT` define a porta do Express. Os valores padrão de upload estão descritos na política de upload.

### Frontend

- React com componentes funcionais e Hooks, organizado em componentes, paginas e servicos.
- Comunicacao via `fetch` para a API com prefixo `/api`, usando o proxy do Vite no desenvolvimento.
- A interface deve apresentar os metadados publicos, permitir upload e download e comunicar estados de erro/carregamento.

### Estado atual

Esta especificação descreve o destino funcional, não o estado implementado. O seed atual do backend exporta o app Express e implementa apenas `GET /health`; as rotas de negócio, armazenamento Multer, repositories e interface funcional ainda precisam ser desenvolvidos. Portanto, os contratos acima são requisitos planejados.

## 8. Plano de execução futuro

As etapas abaixo orientam uma futura implementação do produto. Elas não fazem parte da execução desta tarefa, que se limita a criar esta especificação.

1. **Fundação do backend e upload:** configurar armazenamento local com Multer `diskStorage`, limites e allowlist; criar repository de metadados em memória; implementar upload e validações.
2. **Consulta e download:** implementar listagem global e download por identificador; cobrir erros, limpeza de arquivos em falhas e comportamento para arquivo ausente.
3. **Fluxos do frontend:** criar interface para enviar documentos, consultar a lista e baixar arquivos, com estados de carregamento, sucesso e erro.
4. **Integração e verificação:** integrar frontend pelo proxy `/api`; testar contratos HTTP, limites/tipos, persistência local e comportamento após reinício; revisar mensagens e segurança de caminhos.

## 9. Premissas e limitacoes

- O campo `owner` é apenas um valor fornecido pelo cliente. Sem autenticação, não comprova identidade nem restringe acesso.
- A listagem é global e qualquer cliente que alcance a API pode solicitar qualquer documento conhecido pelo processo. Autorização por usuário requer uma decisão e implementação futuras.
- Reiniciar o backend limpa os metadados em memória; os arquivos podem permanecer no disco sem referência. Reconciliação e limpeza de arquivos órfãos não fazem parte deste MVP.
- O limite e a allowlist propostos são defaults futuros configuráveis, não funcionalidades já presentes no seed.
- O armazenamento local depende do filesystem e das permissões do processo. Não há garantia de durabilidade dos metadados nem de compartilhamento entre múltiplas instâncias do backend.