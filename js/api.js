const Api = (function () {
  const TOKEN_KEY = "ferias_token";
  const PERFIL_KEY = "ferias_perfil"; // 'gestor' | 'funcionario'
  const NOME_KEY = "ferias_nome";
  const REGIOES_KEY = "ferias_regioes";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setSessao(token, perfil, nome, regioes) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(PERFIL_KEY, perfil);
    if (nome) localStorage.setItem(NOME_KEY, nome);
    localStorage.setItem(REGIOES_KEY, JSON.stringify(regioes || []));
  }

  function getPerfil() {
    return localStorage.getItem(PERFIL_KEY);
  }

  function getNome() {
    return localStorage.getItem(NOME_KEY) || "";
  }

  // Retorna as regiões do gestor logado. Array vazio = acesso a todas as regiões.
  function getRegioes() {
    try {
      return JSON.parse(localStorage.getItem(REGIOES_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PERFIL_KEY);
    localStorage.removeItem(NOME_KEY);
    localStorage.removeItem(REGIOES_KEY);
  }

  async function request(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = getToken();
      if (token) headers["Authorization"] = "Bearer " + token;
    }
    const resp = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }
    if (!resp.ok) {
      const erro = new Error((data && data.error) || `Erro ${resp.status}`);
      erro.status = resp.status;
      erro.data = data;
      throw erro;
    }
    return data;
  }

  // Garante que o usuário tem sessão do perfil esperado, senão redireciona.
  function exigirPerfil(perfil, paginaLogin) {
    if (getPerfil() !== perfil || !getToken()) {
      window.location.href = paginaLogin;
      return false;
    }
    return true;
  }

  return { request, getToken, setSessao, getPerfil, getNome, getRegioes, logout, exigirPerfil };
})();
