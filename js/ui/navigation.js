// =====================================================
// NAVEGAÇÃO ENTRE SECÇÕES
// =====================================================

export function esconderTudo() {
  const ids = ["registo", "login", "recuperar", "dashboard"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

export function mostrarLogin() {
  esconderTudo();
  const login = document.getElementById("login");
  if (login) {
    login.style.display = "block";
    login.scrollIntoView({ behavior: "smooth" });
  }
}

export function mostrarRegisto(pacote) {
  esconderTudo();
  const registo = document.getElementById("registo");
  if (registo) {
    registo.style.display = "block";
    if (pacote) {
      const pacoteInput = document.getElementById("pacote");
      if (pacoteInput) pacoteInput.value = pacote;
    }
    registo.scrollIntoView({ behavior: "smooth" });
  }
}

export function mostrarDashboard() {
  // Verificação simples de login (pode ser melhorada)
  const logado = !!window.residenteLogado;
  if (!logado) {
    alert("Precisas de fazer login primeiro.");
    mostrarLogin();
    return;
  }
  esconderTudo();
  const dash = document.getElementById("dashboard");
  if (dash) {
    dash.style.display = "block";
    dash.scrollIntoView({ behavior: "smooth" });
  }
}

// Expor funções globalmente para onclick no HTML
window.mostrarLogin = mostrarLogin;
window.mostrarRegisto = mostrarRegisto;
window.mostrarDashboard = mostrarDashboard;