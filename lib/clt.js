// Regras de negócio da CLT para férias (Art. 130, 134 e 143).

const MS_DIA = 24 * 60 * 60 * 1000;

function parseData(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function somaDias(dataInicio, dias) {
  return new Date(dataInicio.getTime() + (dias - 1) * MS_DIA);
}

function fmt(d) {
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
}

/**
 * Calcula as datas do ciclo de férias a partir do início do período aquisitivo,
 * seguindo o mesmo padrão observado nas planilhas do RH:
 *   - Fim do período aquisitivo = início + 1 ano - 1 dia
 *   - Data limite para início das férias = fim do aquisitivo + 11 meses
 *   - Data limite para programação das férias = data limite de início - 1 mês
 * Estas datas são apenas um valor padrão sugerido: sempre que o RH informar as datas
 * reais (via cadastro manual ou importação em lote), elas devem prevalecer.
 */
function calcularDatasPadrao(inicioStr) {
  const inicio = new Date(inicioStr + "T00:00:00Z");

  const fimAquisitivo = new Date(inicio);
  fimAquisitivo.setUTCFullYear(fimAquisitivo.getUTCFullYear() + 1);
  fimAquisitivo.setUTCDate(fimAquisitivo.getUTCDate() - 1);

  const dataLimiteInicioFerias = new Date(fimAquisitivo);
  dataLimiteInicioFerias.setUTCMonth(dataLimiteInicioFerias.getUTCMonth() + 11);

  const dataLimiteProgramacao = new Date(dataLimiteInicioFerias);
  dataLimiteProgramacao.setUTCMonth(dataLimiteProgramacao.getUTCMonth() - 1);

  return {
    periodoAquisitivoFim: fimAquisitivo.toISOString().slice(0, 10),
    dataLimiteInicioFerias: dataLimiteInicioFerias.toISOString().slice(0, 10),
    dataLimiteProgramacao: dataLimiteProgramacao.toISOString().slice(0, 10),
  };
}

/**
 * Valida uma solicitação de férias de um funcionário contra as regras da CLT
 * e as datas específicas informadas pelo RH.
 * @param {object} funcionario - documento do funcionário
 * @param {Array} periodos - [{ inicio: 'YYYY-MM-DD', dias: Number }]
 * @param {Number} abonoPecuniarioDias
 * @param {{ adiantar13?: boolean, periodoAdiantamento13?: number }} opcoes13 - adiantamento da 1ª parcela do 13º (Lei 4.749/1965)
 * @returns {{ valid: boolean, error?: string, totalDias?: number }}
 */
function validarSolicitacao(funcionario, periodos, abonoPecuniarioDias, opcoes13) {
  const diasDireito = Number(funcionario.diasDireito || 30);
  const abono = Number(abonoPecuniarioDias || 0);
  const adiantar13 = !!(opcoes13 && opcoes13.adiantar13);
  const periodoAdiantamento13 = opcoes13 ? Number(opcoes13.periodoAdiantamento13) : null;

  const abonoMax = Math.min(10, Math.floor(diasDireito / 3));
  if (abono < 0 || abono > abonoMax) {
    return { valid: false, error: `O abono pecuniário deve estar entre 0 e ${abonoMax} dias (máx. 1/3 dos ${diasDireito} dias de direito).` };
  }

  if (!Array.isArray(periodos) || periodos.length < 1 || periodos.length > 3) {
    return { valid: false, error: "As férias devem ser divididas em no mínimo 1 e no máximo 3 períodos." };
  }

  const totalDiasGozo = diasDireito - abono;
  const somaPeriodos = periodos.reduce((acc, p) => acc + Number(p.dias || 0), 0);
  if (somaPeriodos !== totalDiasGozo) {
    return {
      valid: false,
      error: `A soma dos dias dos períodos (${somaPeriodos}) deve ser igual a ${totalDiasGozo} dias (${diasDireito} de direito - ${abono} de abono).`,
    };
  }

  if (periodos.length > 1) {
    const temPeriodoLongo = periodos.some((p) => Number(p.dias) >= 14);
    if (!temPeriodoLongo) {
      return { valid: false, error: "Ao fracionar as férias, pelo menos um período deve ter 14 dias corridos ou mais." };
    }
    const algumCurtoDemais = periodos.some((p) => Number(p.dias) < 5);
    if (algumCurtoDemais) {
      return { valid: false, error: "Cada período fracionado deve ter no mínimo 5 dias corridos." };
    }
  }

  const periodoAquisitivoFim = parseData(funcionario.periodoAquisitivoFim);
  const dataLimiteInicioFerias = parseData(funcionario.dataLimiteInicioFerias);
  const dataLimiteProgramacao = parseData(funcionario.dataLimiteProgramacao);

  if (!periodoAquisitivoFim) {
    return { valid: false, error: "Funcionário sem período aquisitivo cadastrado corretamente." };
  }

  if (dataLimiteProgramacao) {
    const hoje = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
    if (hoje > dataLimiteProgramacao) {
      return {
        valid: false,
        error: `O prazo para programar estas férias venceu em ${fmt(dataLimiteProgramacao)}. Entre em contato com seu gestor.`,
      };
    }
  }

  const datasOrdenadas = [];

  for (const p of periodos) {
    const inicio = parseData(p.inicio);
    if (!inicio) {
      return { valid: false, error: "Data de início inválida em um dos períodos." };
    }
    if (!Number.isInteger(Number(p.dias)) || Number(p.dias) < 1) {
      return { valid: false, error: "Quantidade de dias inválida em um dos períodos." };
    }

    if (inicio <= periodoAquisitivoFim) {
      return {
        valid: false,
        error: `A data escolhida deve ser posterior ao fim do período aquisitivo (${fmt(periodoAquisitivoFim)}).`,
      };
    }

    const fim = somaDias(inicio, Number(p.dias));
    if (dataLimiteInicioFerias && inicio > dataLimiteInicioFerias) {
      return {
        valid: false,
        error: `O início do período ultrapassa o prazo limite (${fmt(dataLimiteInicioFerias)}). As férias venceram ou estão prestes a vencer.`,
      };
    }

    datasOrdenadas.push({ inicio, fim });
  }

  // Verifica sobreposição entre períodos.
  datasOrdenadas.sort((a, b) => a.inicio - b.inicio);
  for (let i = 1; i < datasOrdenadas.length; i++) {
    if (datasOrdenadas[i].inicio <= datasOrdenadas[i - 1].fim) {
      return { valid: false, error: "Os períodos informados não podem se sobrepor." };
    }
  }

  // Adiantamento da 1ª parcela do 13º salário nas férias (Lei 4.749/1965, art. 2º, § único,
  // com redação dada pela Lei 13.183/2015): só pode ser vinculado a UM dos períodos, e o pedido
  // (esta própria solicitação) precisa ser feito por escrito em janeiro do ano correspondente ao período.
  if (adiantar13) {
    if (!Number.isInteger(periodoAdiantamento13) || periodoAdiantamento13 < 1 || periodoAdiantamento13 > periodos.length) {
      return { valid: false, error: "Selecione a qual período o adiantamento da 1ª parcela do 13º salário está vinculado." };
    }
    const periodoEscolhido = periodos[periodoAdiantamento13 - 1];
    const inicioEscolhido = parseData(periodoEscolhido.inicio);
    const hoje = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
    const dentroDeJaneiro = hoje.getUTCMonth() === 0;
    const mesmoAno = inicioEscolhido && hoje.getUTCFullYear() === inicioEscolhido.getUTCFullYear();
    if (!dentroDeJaneiro || !mesmoAno) {
      return {
        valid: false,
        error:
          "O adiantamento da 1ª parcela do 13º salário só pode ser solicitado em janeiro do ano em que as férias escolhidas terão início (Lei 4.749/1965).",
      };
    }
  }

  return { valid: true, totalDias: totalDiasGozo };
}

module.exports = { validarSolicitacao, calcularDatasPadrao };
