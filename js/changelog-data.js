// Histórico de versões do Sistema de Férias.
// Convenção: mais recente primeiro. Sempre que uma nova solicitação de alteração
// for atendida, uma nova entrada deve ser adicionada ao topo desta lista.
const HISTORICO_VERSOES = [
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
      alterado: [
        "A opção de adiantar o 13º só fica disponível para marcação em janeiro do ano em que o período escolhido começa (regra legal); fora dessa janela, o campo aparece desabilitado com explicação.",
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
