# Document Management System com GitHub Copilot

## Executar a aplicação

Em terminais separados, execute `npm start --prefix backend` e
`npm run dev --prefix frontend`. Abra `http://localhost:5173`.
O proxy do Vite encaminha as chamadas `/api` para `http://localhost:3000`,
removendo o prefixo. Em produção, configure roteamento equivalente.

A interface permite informar um responsável, enviar um arquivo, consultar os
metadados e baixar documentos com o nome original. A lista é carregada ao abrir
a página e atualizada após uploads; o botão **Atualizar lista** permite tentar
novamente em caso de erro. As operações exibem carregamento, confirmação e erros.
Tipos e limites de upload são validados pelo backend conforme sua configuração.

A listagem é global e o responsável não é uma identidade autenticada. Os
metadados ficam em memória e são perdidos quando o backend reinicia.

Para validar o frontend, execute `npm test --prefix frontend` e
`npm run build --prefix frontend`.

<img src="https://octodex.github.com/images/Professortocat_v2.png" align="right" height="200px" />

Hey paulogprado!

Mona here. I'm done preparing your exercise. Hope you enjoy! 💚

Remember, it's self-paced so feel free to take a break! ☕️

[![](https://img.shields.io/badge/Go%20to%20Exercise-%E2%86%92-1f883d?style=for-the-badge&logo=github&labelColor=197935)](https://github.com/treinamentos-serpro/document-management-system-pauloprado/issues/1)

---

&copy; 2025 GitHub &bull; [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md) &bull; [MIT License](https://gh.io/mit)
