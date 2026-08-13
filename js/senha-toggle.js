// Transforma um <input type="password"> em um campo com botão de "olho" para mostrar/ocultar.
// Uso: adicionarToggleSenha('idDoInput');
function adicionarToggleSenha(inputId) {
  const input = document.getElementById(inputId);
  if (!input || input.dataset.toggleAplicado) return;
  input.dataset.toggleAplicado = "true";

  const wrapper = document.createElement("div");
  wrapper.className = "senha-wrap";
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "senha-toggle-btn";
  btn.setAttribute("aria-label", "Mostrar senha");
  btn.textContent = "👁";
  wrapper.appendChild(btn);

  btn.addEventListener("click", () => {
    const mostrando = input.type === "text";
    input.type = mostrando ? "password" : "text";
    btn.textContent = mostrando ? "👁" : "🙈";
  });
}

// Valida se dois campos de senha coincidem, exibindo mensagem de erro em um elemento alvo.
// Retorna true se válido (e não vazio).
function validarConfirmacaoSenha(senhaId, confirmarId, minLength = 6) {
  const senha = document.getElementById(senhaId).value;
  const confirmar = document.getElementById(confirmarId).value;
  if (!senha || senha.length < minLength) {
    return { valid: false, error: `A senha deve ter pelo menos ${minLength} caracteres.` };
  }
  if (senha !== confirmar) {
    return { valid: false, error: "As senhas não coincidem." };
  }
  return { valid: true };
}
