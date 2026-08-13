# 🏖️ Sistema de Programação de Férias (CLT)

Aplicação completa para funcionários programarem suas férias e gestores aprovarem, seguindo as regras da CLT (período aquisitivo, fracionamento em até 3 períodos e abono pecuniário).

## ✨ Funcionalidades

- Login do funcionário por CPF, sem senha
- Login do gestor com usuário e senha (hash bcrypt)
- Validação automática das regras da CLT ao solicitar férias:
  - Início do gozo somente após 1 ano do período aquisitivo
  - Prazo limite de gozo (período concessivo)
  - Fracionamento em até 3 períodos (um com ≥14 dias, demais com ≥5 dias)
  - Abono pecuniário de até 1/3 dos dias de direito (máx. 10 dias)
- Painel do gestor: dashboard, CRUD de funcionários, importação em lote e aprovação/rejeição de solicitações
- Comprovante de férias para impressão após aprovação
- Interface responsiva (mobile-first) com tema claro/escuro

## 📦 Estrutura do Projeto

```
sistema-ferias/
├── api/
│   ├── auth.js            # Login gestor/funcionário, troca de senha, criar gestor
│   ├── funcionarios.js    # CRUD de funcionários + importação em lote
│   ├── ferias.js          # Solicitação, listagem e aprovação/rejeição
│   └── dashboard.js       # Estatísticas do gestor
├── lib/
│   ├── db.js               # Conexão compartilhada com o MongoDB
│   ├── auth.js              # Geração/validação de JWT
│   └── clt.js                # Regras de negócio da CLT
├── css/theme.css            # Tema claro/escuro e estilos globais
├── js/                       # Lógica de cada página (vanilla JS)
├── scripts/seed.js          # Cria o usuário gestor master (rodar localmente)
├── funcionarios_para_importar.csv  # CSV pronto, gerado a partir da sua planilha
├── index.html, funcionario-*.html, gestor-*.html
├── package.json / vercel.json / .env.example
```

## 🚀 Execução local (VSCode)

### Pré-requisitos
- Node.js 20+
- Conta MongoDB Atlas (ou MongoDB local)
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`

### Passo a passo

1. Extraia o projeto e abra a pasta no VSCode.
2. Instale as dependências:
   ```
   npm install
   ```
3. Copie `.env.example` para `.env` e preencha:
   ```
   MONGODB_URI="mongodb+srv://usuario:senha@cluster.mongodb.net/"
   DB_NAME="ferias_stf"
   JWT_SECRET="uma-string-longa-e-aleatoria"
   ```
4. Exporte as variáveis no terminal (ou use um plugin como `dotenv-cli`) e crie o usuário gestor master:
   ```
   set -a; source .env; set +a
   npm run seed
   ```
   Isso imprime no terminal o usuário e a senha gerada — guarde essa senha, você poderá trocá-la depois em **Configurações**.
5. Rode o projeto localmente com o CLI da Vercel (simula as funções serverless de `/api`):
   ```
   npx vercel dev
   ```
6. Abra `http://localhost:3000`.

> Dica: para importar os funcionários da sua planilha, abra `gestor-funcionarios.html`, cole o conteúdo do arquivo `funcionarios_para_importar.csv` (sem a linha de cabeçalho, trocando `;` conforme necessário) na caixa de **Importação em lote**. **Atenção:** a planilha original não possui CPF — foi deixado em branco no CSV gerado; edite antes de importar (o CPF é a chave de login do funcionário) ou cadastre manualmente.

## 🔧 Variáveis de Ambiente

| Variável       | Obrigatório | Descrição                                  | Exemplo                                |
| -------------- | ----------- | ------------------------------------------- | --------------------------------------- |
| `MONGODB_URI`  | ✅          | String de conexão do MongoDB                | `mongodb+srv://user:senha@cluster/...`  |
| `DB_NAME`      | ⛔️ (default `ferias_stf`) | Banco usado por todas as coleções | `ferias_stf`                            |
| `JWT_SECRET`   | ✅ (em produção) | Segredo para assinar os tokens de login | string aleatória longa                  |

## 🌐 Deploy na Vercel (via GitHub)

1. Crie um repositório novo no GitHub e suba este projeto:
   ```
   git init
   git add .
   git commit -m "Sistema de férias inicial"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```
2. No [painel da Vercel](https://vercel.com/new), clique em **Import Project** e selecione o repositório recém-criado.
3. Em **Environment Variables**, adicione `MONGODB_URI`, `DB_NAME` e `JWT_SECRET` (os mesmos valores do seu `.env`).
   - Se preferir, use a **integração nativa do MongoDB Atlas com a Vercel** (marketplace de integrações) para preencher `MONGODB_URI` automaticamente.
4. Clique em **Deploy**. A cada `git push` na branch `main`, a Vercel fará um novo deploy automaticamente.
5. Após o primeiro deploy, rode `npm run seed` (localmente, apontando para o mesmo `MONGODB_URI` de produção) para criar o gestor master — esse script **não** é exposto como rota pública, por segurança.

## 🔒 Segurança

- Senhas de gestores armazenadas com hash `bcrypt`.
- Autenticação via JWT (`Authorization: Bearer <token>`), válido por 12h.
- Rotas de funcionários/férias/aprovação exigem token de gestor; funcionário só acessa e altera seus próprios dados.
- Nenhuma rota de criação do usuário master é exposta publicamente — o script `scripts/seed.js` roda apenas localmente/via terminal.

## 📋 API Endpoints (resumo)

| Rota                | Método | Descrição |
| -------------------- | ------ | --------- |
| `/api/auth`          | POST   | `action`: `login-gestor`, `login-funcionario`, `trocar-senha-gestor` |
| `/api/funcionarios`  | GET    | Lista (gestor, filtrada por região), dados próprios (`?me=true`) ou lista de regiões (`?listaRegioes=true`) |
| `/api/funcionarios`  | POST   | Cria um funcionário, ou importa em lote (`{ lote: [...] }`) |
| `/api/funcionarios`  | PUT/DELETE | Edita/remove um funcionário (gestor, respeitando a região) |
| `/api/gestores`      | GET    | Lista gestores (sem o hash de senha) |
| `/api/gestores`      | POST   | Cria um gestor `{ username, password, nome, regioes }` |
| `/api/gestores`      | PUT    | Edita um gestor `{ id, nome, regioes, novaSenha? }` |
| `/api/gestores`      | DELETE | Remove um gestor (`?id=...`) |
| `/api/ferias`        | GET    | Lista solicitações (próprias, ou todas dentro da região do gestor) |
| `/api/ferias`        | POST   | Funcionário envia uma solicitação de férias |
| `/api/ferias`        | PATCH  | Gestor aprova/rejeita/cancela (`?id=...`, `{ status: 'aprovado'|'rejeitado'|'cancelado', comentario }`) |
| `/api/dashboard`     | GET    | Estatísticas para o gestor (filtradas por região) |

## 📄 Licença

Uso interno / privado.

## 🆕 Changelog

**v1.3**
- **Máscara de CPF** aplicada em todos os campos de CPF (login do funcionário e cadastro/edição pelo gestor) — aceita digitação ou colagem com ou sem pontuação, sempre enviando somente números para o banco.
- **Abono pecuniário** sem o "0" fixo pré-digitado — agora aparece apenas como exemplo em cinza (placeholder).
- **Tabela "Funcionários sem solicitação"** no dashboard agora tem colunas clicáveis para ordenar, com ordem alfabética por nome como padrão.
- **Texto de importação em lote** reformulado — o exemplo de formato foi movido para dentro do campo (placeholder), evitando que o texto vazasse do card.
- **Tabela de funcionários** sem quebra de linha em nenhuma célula e sem barra de rolagem horizontal (texto truncado com "..." e tooltip ao passar o mouse quando necessário).
- **Cadastro e edição de funcionários agora em modal**: um único botão "+ Novo funcionário" abre o formulário; cada linha da tabela tem um botão de lápis (✏️) que abre o mesmo formulário em modo de edição, com botões Cancelar / Salvar / Excluir.
- **Importação em lote também em modal**, com duas abas: colar o texto (como antes) ou enviar um arquivo `.csv`. Em ambos os casos, se a primeira linha for um cabeçalho (ex.: começa com "nome"), ela é detectada e ignorada automaticamente.
- **Solicitações** agora abre por padrão com "Todos os status" selecionado (antes vinha filtrado em "Pendentes").
- **Gestores** segue o mesmo padrão de modal: botão "+ Novo gestor" e lápis para editar (nome, regiões, redefinir senha) ou excluir.

**v1.2**
- **Lista de funcionários**: ordenação padrão pelo Prazo Limite (mais próximo primeiro); todas as colunas (Nome, Período Aquisitivo início/fim, Prazo Limite, Matrícula, CPF, Região) agora são clicáveis para ordenar (clique novamente para inverter).
- **Datas do RH**: o cadastro/importação agora aceita as datas reais informadas pelo RH (fim do aquisitivo, data limite de início e data limite de programação). Quando não informadas, o sistema calcula automaticamente seguindo o padrão observado nas planilhas (fim do aquisitivo = início + 1 ano - 1 dia; limite de início = fim do aquisitivo + 11 meses; limite de programação = limite de início - 1 mês). A solicitação de férias agora também bloqueia o envio após a data limite de programação.
- **Regiões e permissões de gestor**: cada gestor pode ter uma ou mais regiões vinculadas ao seu cadastro (nenhuma região = acesso a todas). O acesso é validado no backend em todas as rotas (funcionários, solicitações e dashboard), não apenas na interface.
- **Filtro dinâmico de regiões**: lista suspensa com checkboxes nas telas de Funcionários e Solicitações para escolher quais regiões (dentre as permitidas) visualizar no momento.
- **CRUD completo de Funcionários**: adicionado botão Editar (o cadastro reaproveita o mesmo formulário de criação).
- **Nova tela "Gestores"**: CRUD completo de contas de gestor — criar, listar, editar (nome, regiões, redefinir senha) e excluir (com proteção contra remover o último gestor ou a própria conta logada).
- **Senhas mais seguras na interface**: campo de confirmação de senha e ícone de "olho" para mostrar/ocultar em todos os formulários de senha (login do gestor, trocar senha, criar/editar gestor).

**v1.1**
- Gestor agora pode **cancelar** uma solicitação já aprovada (novo status `cancelado`), liberando o funcionário para enviar uma nova solicitação.
- O documento impresso pelo funcionário deixou de se chamar "Comprovante de Férias" e passou a ser **"Programação de Férias — Pré-aprovada"**, com aviso explícito de que não substitui a aprovação final do RH/gerente.
- Texto inicial do portal alterado para "Programação de férias - Stefanini".
- Novo **Dashboard visual** do gestor:
  - Gráfico de rosca (donut) com a distribuição de solicitações por status.
  - Gráfico de barras com a quantidade de funcionários de férias por mês (seletor de ano).
  - **Calendário anual (linha do tempo/Gantt)** com uma linha por funcionário e barras coloridas mostrando os períodos aprovados — permite identificar visualmente sobreposições entre pessoas diferentes.
  - Lista dos **dias com maior concentração de férias** (dias em que 2+ funcionários estarão simultaneamente de férias).


