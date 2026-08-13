// Aplica máscara 000.000.000-00 a um <input>, aceitando digitação ou colagem
// com ou sem pontuação (sempre sanitiza para apenas números internamente).
function aplicarMascaraCPF(input) {
  if (!input || input.dataset.mascaraCpf) return;
  input.dataset.mascaraCpf = "true";
  input.maxLength = 14;
  input.setAttribute("inputmode", "numeric");

  function formatar() {
    let v = input.value.replace(/\D/g, "").slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    input.value = v;
  }

  input.addEventListener("input", formatar);
  input.addEventListener("paste", () => setTimeout(formatar, 0));
  formatar();
}

// Retorna somente os dígitos de um valor de CPF (para enviar à API).
function somenteNumerosCPF(valor) {
  return String(valor || "").replace(/\D/g, "");
}
