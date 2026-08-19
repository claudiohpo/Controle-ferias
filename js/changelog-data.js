// Histórico de versões do Sistema de Férias.
// Convenção: mais recente primeiro. Sempre que uma nova solicitação de alteração
// for atendida, uma nova entrada deve ser adicionada ao topo desta lista.
const HISTORICO_VERSOES = [
  {
    versao: "1.12",
    data: "2026-08-17",
    mudancas: {
      adicionado: [
        "Funcionário agora pode informar o número da requisição enviada oficialmente pelo portal NatCorp ao RH, vinculando-a à sua solicitação de férias aprovada — botão e modal aparecem apenas quando o status é 'aprovado'.",
        "O número pode ser editado a qualquer momento pelo próprio funcionário.",
        "Coluna 'Nº NatCorp' na tabela de Solicitações do gestor e no relatório exportável (PDF/Excel).",
        "Novo card no dashboard 'Requisições NatCorp', com a contagem de números já informados; clicável, abre um modal com a lista de funcionários e seus respectivos códigos.",
      ],
    },
  },
  {
    versao: "1.11",
    data: "2026-08-15",
    mudancas: {
      alterado: [
        "O fracionamento de férias passou de até 3 para até 2 períodos, conforme política interna da empresa (a CLT permitiria até 3, mas não será utilizado).",
        "O adiantamento da 1ª parcela do 13º salário deixou de exigir a escolha de um período específico — agora é só uma marcação simples de 'sim/não'. Se não solicitado, o funcionário recebe o 13º normalmente, na data padrão, como os demais.",
      ],
    },
  },
  {
    versao: "1.10",
    data: "2026-08-15",
    mudancas: {
      corrigido: [
        "Corrigido bug em que as tabelas redimensionáveis (Solicitações, Funcionários) voltaram a cortar texto ('17/08/20..', '🎁 Período...') mesmo com o sistema de redimensionamento ativo — havia uma regra de CSS genérica forçando a tabela a caber 100% no espaço do container, mesmo quando o conteúdo precisava de mais espaço.",
        "As telas de Solicitações e Funcionários agora usam um container mais largo, para aproveitar melhor o espaço da tela em vez de depender de rolagem horizontal.",
      ],
    },
  },
  {
    versao: "1.9",
    data: "2026-08-15",
    mudancas: {
      adicionado: [
        "Ordenação por clique nas colunas da tabela de Solicitações (Funcionário, Início do Período, Status, Enviado em), igual à já existente em Funcionários.",
        "Detecção de sobreposição de férias: cada solicitação agora mostra uma coluna 'Sobreposição' com quantos outros funcionários já aprovados (ou também pendentes) têm período coincidente, com nomes e datas ao passar o mouse.",
        "Campo 'Limite simultâneo' configurável na tela de Solicitações — quando aprovar uma solicitação pendente ultrapassaria esse número de pessoas de férias ao mesmo tempo, a coluna de sobreposição sinaliza em amarelo/vermelho.",
        "O mesmo limite agora é usado no dashboard, na seção 'Dias com maior concentração de férias', para destacar visualmente os dias que ultrapassam o recomendado.",
      ],
      corrigido: [
        "A seção 'Dias com maior concentração de férias' do dashboard não corta mais os nomes dos funcionários — a lista completa aparece agora, com quebra de linha normal em vez de reticências.",
      ],
    },
  },
  {
    versao: "1.8",
    data: "2026-08-14",
    mudancas: {
      corrigido: [
        "Removida a restrição que só permitia marcar o adiantamento da 1ª parcela do 13º salário em janeiro. O sistema serve para montar a programação/escala de férias entre funcionário e gestor — não é o lançamento oficial — então o funcionário agora pode manifestar essa preferência a qualquer momento; o requerimento formal e o cumprimento do prazo legal ficam a cargo do RH.",
      ],
    },
  },
  {
    versao: "1.7",
    data: "2026-08-14",
    mudancas: {
      adicionado: [
        "Opção de adiantamento da 1ª parcela do 13º salário junto com as férias (Lei 4.749/1965), vinculada a um dos até 3 períodos escolhidos.",
        "No formulário de solicitação do funcionário: checkbox para pedir o adiantamento + seleção de qual período recebe o benefício.",
        "Coluna '13º adiantado' nas listas de solicitações do funcionário e do gestor, mostrando o período vinculado.",
        "Documento de pré-aprovação impresso pelo funcionário agora informa se há adiantamento do 13º e em qual período.",
        "Relatório exportável (PDF/Excel) agora inclui a coluna '1ª parcela do 13º', marcando exatamente o período em que o pagamento deve ser antecipado — pronto para o RH processar a folha.",
      ],
    },
  },
  {
    versao: "1.6",
    data: "2026-08-14",
    mudancas: {
      adicionado: [
        "Botão 'Exportar relatório' na tela de Solicitações, com modal para escolher um ou mais status (Pendente, Aprovado, Rejeitado, Cancelado) a incluir.",
        "Exportação em PDF e em Excel (.xlsx), com uma linha por período de férias — funcionário, CPF, matrícula, região, gestor, status, datas de início/fim, dias, abono pecuniário, data da solicitação e comentário do gestor — pronto para efetivar a programação junto ao RH.",
        "A exportação respeita o filtro de região já aplicado na tela de Solicitações.",
      ],
      alterado: [
        "Novas solicitações de férias passaram a registrar também a matrícula e o gestor do funcionário no momento do envio, para relatórios mais completos.",
      ],
    },
  },
  {
    versao: "1.5",
    data: "2026-08-14",
    mudancas: {
      adicionado: [
        "Cadastro próprio de Regiões (CRUD: adicionar, renomear, excluir), acessível pelo botão '🌎 Gerenciar regiões' nas telas de Funcionários e Gestores.",
        "No cadastro de funcionário, a região agora é escolhida em uma lista suspensa (baseada no cadastro de regiões) em vez de texto livre.",
        "No cadastro/edição de gestor, as regiões disponíveis para conceder acesso mostram sempre a lista completa cadastrada no sistema — não ficam mais restritas às regiões que o próprio gestor logado já possui.",
        "Ao editar o próprio cadastro (nome, regiões ou senha), a sessão do gestor é atualizada automaticamente, sem precisar deslogar e logar de novo.",
        "Calendário anual de férias aprovadas agora é contínuo entre anos e rolável horizontalmente, com o nome do funcionário fixo na lateral durante a rolagem e uma linha marcando o dia de hoje.",
        "Favicons e ícone de instalação (PWA) com o tema do guarda-sol de praia, em vários tamanhos.",
      ],
      corrigido: [
        "Corrigido bug em que desmarcar regiões no filtro (Funcionários/Solicitações) não atualizava a lista corretamente — a filtragem agora é aplicada instantaneamente no navegador.",
        "Corrigido o 'flash' de tela clara antes de escurecer ao trocar de página no modo escuro.",
      ],
      alterado: ["Sistema renomeado de 'Sistema de Férias' para 'FieldBreak' em todas as telas."],
    },
  },
  {
    versao: "1.4",
    data: "2026-08-13",
    mudancas: {
      adicionado: [
        "Redimensionamento manual de colunas (arrastar a borda) em todas as tabelas do sistema.",
        "Botão 'Excluir funcionários' para seleção múltipla via checkbox e exclusão em lote, com confirmação antes de apagar.",
        "Histórico de versões do sistema, acessível pelo painel do gestor (este modal).",
      ],
      corrigido: [
        "Tabelas não cortam mais nomes, CPFs, datas e demais dados; os títulos das colunas podem quebrar linha, os dados nunca.",
        "Cards 'Status das solicitações' e 'Funcionários de férias por mês' do dashboard agora têm a mesma largura e altura.",
      ],
    },
  },
  {
    versao: "1.3",
    data: "2026-08-13",
    mudancas: {
      adicionado: [
        "Máscara de CPF (000.000.000-00) em todos os campos de CPF, com sanitização automática ao digitar ou colar.",
        "Importação em lote por upload de arquivo .csv, além de colar texto; detecção automática de linha de cabeçalho.",
        "Cadastro e edição de funcionários e gestores passaram a usar janelas modais, com botão de lápis para editar.",
        "Ordenação por clique nas colunas da tabela 'Funcionários sem solicitação' do dashboard.",
      ],
      corrigido: [
        "Campo de abono pecuniário não inicia mais com '0' fixo (agora é apenas um exemplo em cinza).",
        "Texto de instruções da importação em lote não ultrapassa mais os limites do card.",
        "Tela de Solicitações agora abre com 'Todos os status' selecionado por padrão.",
      ],
    },
  },
  {
    versao: "1.2",
    data: "2026-08-13",
    mudancas: {
      adicionado: [
        "Ordenação por qualquer coluna na lista de funcionários (padrão: Prazo Limite, do mais próximo ao mais distante).",
        "Suporte a datas de férias informadas manualmente pelo RH (fim do aquisitivo, limite de início e de programação), com cálculo automático como alternativa quando não informadas.",
        "Regiões vinculadas a cada gestor, com controle de acesso validado no backend (não apenas na interface).",
        "Filtro dinâmico de regiões (lista suspensa com checkboxes) nas telas de Funcionários e Solicitações.",
        "Tela 'Gestores' com CRUD completo de contas (criar, listar, editar regiões/senha, excluir).",
        "Confirmação de senha e botão de mostrar/ocultar (👁) em todos os formulários de senha.",
      ],
      alterado: ["Solicitação de férias passou a ser bloqueada após a data limite de programação informada pelo RH."],
    },
  },
  {
    versao: "1.1",
    data: "2026-08-13",
    mudancas: {
      adicionado: [
        "Cancelamento de férias já aprovadas, pelo gestor.",
        "Dashboard visual: gráfico de status das solicitações, gráfico de funcionários de férias por mês, calendário anual (linha do tempo) e lista de dias com maior concentração de férias.",
      ],
      alterado: [
        "Documento antes chamado 'Comprovante de Férias' passou a se chamar 'Programação de Férias — Pré-aprovada', deixando claro que não substitui a aprovação final do RH/gerente.",
        "Texto inicial do portal alterado para 'Programação de férias - Stefanini'.",
      ],
    },
  },
  {
    versao: "1.0",
    data: "2026-08-13",
    mudancas: {
      adicionado: [
        "Lançamento inicial do sistema de programação de férias (Node.js + Vercel + MongoDB).",
        "Login do funcionário por CPF e login do gestor por usuário/senha.",
        "Validação das regras da CLT: período aquisitivo, fracionamento em até 3 períodos, abono pecuniário.",
        "Cadastro de funcionários (individual e em lote) e aprovação/rejeição de solicitações de férias pelo gestor.",
        "Tema claro/escuro e interface responsiva.",
      ],
    },
  },
];
