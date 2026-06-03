// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

export function popup(tipo, titulo, texto) {
  const icones = { sucesso: "✅", erro: "⚠️", info: "ℹ️" };
  const icone = icones[tipo] || "ℹ️";

  const el = document.createElement("div");
  el.className = "popup-overlay";
  el.innerHTML = `
    <div class="popup-box">
      <span class="popup-icon">${icone}</span>
      <h2></h2>
      <p></p>
      <button class="popup-btn">OK</button>
    </div>
  `;

  el.querySelector("h2").textContent = titulo;
  el.querySelector("p").textContent = texto;

  el.querySelector(".popup-btn").onclick = () => el.remove();
  el.onclick = (e) => { if (e.target === el) el.remove(); };

  document.body.appendChild(el);
}

export function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function setLoading(v) {
  document.body.classList.toggle("loading", v);
}

export function setFieldError(id, msg) {
  const input = document.getElementById(id);
  const erro = document.getElementById("erro-" + id);
  if (input) input.classList.add("field-invalid");
  if (erro) {
    erro.textContent = msg;
    erro.classList.add("visible");
  }
}

export function clearFieldError(id) {
  const input = document.getElementById(id);
  const erro = document.getElementById("erro-" + id);
  if (input) input.classList.remove("field-invalid");
  if (erro) {
    erro.textContent = "";
    erro.classList.remove("visible");
  }
}

export function clearAllErrors(form) {
  form.querySelectorAll(".field-invalid").forEach(el => el.classList.remove("field-invalid"));
  form.querySelectorAll(".field-error").forEach(el => {
    el.textContent = "";
    el.classList.remove("visible");
  });
}