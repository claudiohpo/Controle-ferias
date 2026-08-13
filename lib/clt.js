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

/**
 * Valida uma solicitação de férias de um funcionário contra as regras da CLT.
 * @param {object} funcionario - documento do funcionário (com periodoAquisitivoInicio, periodoAquisitivoFim, dataMaxGozo, diasDireito)
 * @param {Array} periodos - [{ inicio: 'YYYY-MM-DD', dias: Number }]
 * @param {Number} abonoPecuniarioDias - 0 a min(10, diasDireito/3)
 * @returns {{ valid: boolean, error?: string, totalDias?: number }}
 */
function validarSolicitacao(funcionario, periodos, abonoPecuniarioDias) {
  const diasDireito = Number(funcionario.diasDireito || 30);
  const abono = Number(abonoPecuniarioDias || 0);

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
  const dataMaxGozo = parseData(funcionario.dataMaxGozo);

  if (!periodoAquisitivoFim) {
    return { valid: false, error: "Funcionário sem período aquisitivo cadastrado corretamente." };
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

    if (inicio < periodoAquisitivoFim) {
      return {
        valid: false,
        error: `A data escolhida deve ser no mínimo um ano após o início do período aquisitivo (a partir de ${periodoAquisitivoFim.toISOString().slice(0, 10)}).`,
      };
    }

    const fim = somaDias(inicio, Number(p.dias));
    if (dataMaxGozo && fim > dataMaxGozo) {
      return {
        valid: false,
        error: `O período informado ultrapassa o prazo limite de gozo (${dataMaxGozo.toISOString().slice(0, 10)}). As férias venceram ou estão prestes a vencer.`,
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

  return { valid: true, totalDias: totalDiasGozo };
}

module.exports = { validarSolicitacao };
