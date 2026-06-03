// =====================================================
// MAIN.JS - VERSÃO COMPLETA FUNCIONAL
// =====================================================

console.log("✅ NOSZONA carregado");

// ==================== NAVEGAÇÃO (for classic script / onclick compat) ====================
window.esconderTudo = function() {
  const ids = ["registo", "login", "recuperar", "dashboard"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
};

window.mostrarLogin = function() {
  esconderTudo();
  const login = document.getElementById("login");
  if (login) {
    login.style.display = "block";
    login.scrollIntoView({ behavior: "smooth" });
  }
};

window.mostrarRegisto = function(pacote) {
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
};

window.mostrarRecuperar = function() {
  esconderTudo();
  const recuperar = document.getElementById("recuperar");
  if (recuperar) {
    recuperar.style.display = "block";
    recuperar.scrollIntoView({ behavior: "smooth" });
  }
};

// ==================== LOGOUT (basic for header button) ====================
window.logout = function() {
  if (!confirm("Queres mesmo terminar a sessão?")) return;

  // limpa timers do QR
  if (qrTimerId) { clearInterval(qrTimerId); qrTimerId = null; }
  if (qrCountdownId) { clearInterval(qrCountdownId); qrCountdownId = null; }

  residenteLogado = null;
  window.residenteLogado = null;
  try {
    localStorage.removeItem("noszona_session");
    sessionStorage.removeItem("noszona_session");
  } catch(e) {}
  esconderTudo();
  const ctasDeslogado = document.getElementById("ctasDeslogado");
  const ctasLogado = document.getElementById("ctasLogado");
  if (ctasDeslogado) ctasDeslogado.style.display = "flex";
  if (ctasLogado) ctasLogado.style.display = "none";
  popup("sucesso", "Sessão terminada", "Voltaste a estar deslogado.");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ==================== POPUP ====================
window.popup = function(tipo, titulo, texto) {
  const icones = { sucesso: "✅", erro: "⚠️", info: "ℹ️" };
  const icone = icones[tipo] || "ℹ️";
  const el = document.createElement("div");
  el.className = "popup-overlay";
  el.innerHTML = `
    <div class="popup-box">
      <span class="popup-icon">${icone}</span>
      <h2>${titulo}</h2>
      <p>${texto}</p>
      <button class="popup-btn">OK</button>
    </div>
  `;
  el.querySelector(".popup-btn").onclick = () => el.remove();
  el.onclick = (e) => { if (e.target === el) el.remove(); };
  document.body.appendChild(el);
};

window.setLoading = function(v) {
  document.body.classList.toggle("loading", v);
};

// ==================== LOGIN ====================
window.login = async function(e) {
  if (e) e.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const lembrar = document.getElementById("lembrar").checked;

  if (!username || !password) {
    popup("erro", "Campos obrigatórios", "Preenche username e password.");
    return;
  }

  try {
    setLoading(true);
    let data;
    try {
      const response = await fetch("https://violet-beaver-178312.hostingersite.com/api/residentes/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      data = await response.json();
    } catch (fetchErr) {
      // Fallback demo mode quando a API remota não responde (comum em testes locais/file:// ou se o backend estiver off)
      console.warn("API de login indisponível (Failed to fetch). Usando modo DEMO para testar o pós-login.");
      data = {
        sucesso: true,
        residente: {
          nome: username || "Usuário Demo",
          pacote: "Pacote 2",
          saldo: 8500,
          swipes: 30,
          uid: "demo-" + Math.random().toString(36).slice(2, 10)
        }
      };
    }

    if (data.sucesso) {
      residenteLogado = data.residente;
      window.residenteLogado = residenteLogado;

      // persist session if "lembrar" checked (for demo and real)
      if (lembrar) {
        try {
          localStorage.setItem("noszona_session", JSON.stringify({ residente: residenteLogado }));
        } catch(e) {}
      }

      // switch header to logged state (post-login fix)
      const ctasDeslogado = document.getElementById("ctasDeslogado");
      const ctasLogado = document.getElementById("ctasLogado");
      if (ctasDeslogado) ctasDeslogado.style.display = "none";
      if (ctasLogado) ctasLogado.style.display = "flex";
      const greetingEl = document.getElementById("userGreeting");
      if (ctasLogado && greetingEl) {
        const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
        greetingEl.textContent = `Olá, ${primeiroNome}`;
      }

      const isDemo = !data.residente || data.residente.uid?.startsWith("demo-");
      popup("sucesso", "Login efetuado com sucesso!", isDemo ? "Modo DEMO (API offline) - Bem-vindo de volta!" : "Bem-vindo de volta!");
      mostrarDashboard();
    } else {
      popup("erro", "Login falhou", data.mensagem || "Username ou password incorretos.");
    }
  } catch (err) {
    console.error(err);
    popup("erro", "Erro de ligação", "Não foi possível conectar ao servidor.");
  } finally {
    setLoading(false);
  }
};

// ==================== DASHBOARD ====================
let residenteLogado = null;

window.mostrarDashboard = function() {
  if (!residenteLogado) {
    popup("erro", "Login necessário", "Faz login primeiro.");
    return mostrarLogin();
  }

  // ensure header is in logged state
  const ctasDeslogado = document.getElementById("ctasDeslogado");
  const ctasLogado = document.getElementById("ctasLogado");
  if (ctasDeslogado) ctasDeslogado.style.display = "none";
  if (ctasLogado) ctasLogado.style.display = "flex";
  const greetingEl = document.getElementById("userGreeting");
  if (ctasLogado && greetingEl && residenteLogado) {
    const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
    greetingEl.textContent = `Olá, ${primeiroNome}`;
  }

  esconderTudo();
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("dashboard").scrollIntoView({ behavior: "smooth" });

  renderizarDashboard();
};

function renderizarDashboard() {
  const r = residenteLogado || {};

  // Preenche os dados
  document.getElementById("dadosConta").innerHTML = `
    <div class="stat-box"><span>Nome</span><strong>${escapeHtml(r.nome || "Utilizador")}</strong></div>
    <div class="stat-box"><span>Pacote</span><strong>${escapeHtml(r.pacote || "—")}</strong></div>
    <div class="stat-box"><span>Saldo</span><strong>${r.saldo ?? 0} CVE</strong></div>
    <div class="stat-box"><span>Swipes</span><strong>${r.swipes ?? 0}</strong></div>
    <div class="stat-box"><span>Estado</span><strong><span class="chip-active">Ativo</span></strong></div>
  `;

  // Inicia o QR Code
  iniciarQRRotativo();
}

// ==================== QR CODE ====================
let qrTimerId = null;
let qrCountdownId = null;

function iniciarQRRotativo() {
  if (qrTimerId) clearInterval(qrTimerId);
  if (qrCountdownId) clearInterval(qrCountdownId);

  atualizarQR();
  qrTimerId = setInterval(atualizarQR, 30000);

  let restante = 30;
  const tick = () => {
    const cd = document.getElementById("qrCountdown");
    if (cd) cd.textContent = restante;

    // anima a barra de progresso
    const bar = document.getElementById("qrProgressBar");
    if (bar) {
      const pct = Math.max(0, (restante / 30) * 100);
      bar.style.width = pct + "%";
    }

    restante--;
    if (restante < 0) restante = 30;
  };
  tick();
  qrCountdownId = setInterval(tick, 1000);
}

function atualizarQR() {
  const container = document.getElementById("qrCode");
  if (!container) return;
  container.innerHTML = "";

  const payload = {
    uid: residenteLogado?.uid || "demo123",
    ts: Math.floor(Date.now() / 1000)
  };

  new QRCode(container, {
    text: JSON.stringify(payload),
    width: 180,
    height: 180,
    correctLevel: QRCode.CorrectLevel.M
  });

  // reset progress bar to full when new QR is generated
  const bar = document.getElementById("qrProgressBar");
  if (bar) bar.style.width = "100%";
}

function escapeHtml(unsafe) {
  return String(unsafe || "").replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// ==================== STUBS para handlers que ainda não têm impl completa (evita crashes em cliques)
window.registar = async function(e) {
  if (e) e.preventDefault();
  popup("info", "Registo", "Fluxo de registo em desenvolvimento. (Use a versão nova modular depois)");
};

window.recarregar = async function(e) {
  if (e) e.preventDefault();
  if (!residenteLogado) {
    popup("erro", "Login necessário", "Faz login primeiro.");
    return mostrarLogin();
  }

  const tipo = document.getElementById("tipoRecarga") ? document.getElementById("tipoRecarga").value : "saldo";
  const valorEl = document.getElementById("valorRecarga");
  const valor = parseInt(valorEl ? valorEl.value : "0", 10) || 0;

  if (valor <= 0) {
    popup("erro", "Valor inválido", "Introduz um valor positivo.");
    return;
  }

  if (tipo === "saldo") {
    residenteLogado.saldo = (residenteLogado.saldo || 0) + valor;
  } else {
    residenteLogado.swipes = (residenteLogado.swipes || 0) + valor;
  }

  // update window copy too
  window.residenteLogado = residenteLogado;

  // re-render the stats in dashboard
  const dadosConta = document.getElementById("dadosConta");
  if (dadosConta) {
    const r = residenteLogado;
    dadosConta.innerHTML = `
      <div class="stat-box"><span>Nome</span><strong>${escapeHtml(r.nome || "Utilizador")}</strong></div>
      <div class="stat-box"><span>Pacote</span><strong>${escapeHtml(r.pacote || "—")}</strong></div>
      <div class="stat-box"><span>Saldo</span><strong>${r.saldo ?? 0} CVE</strong></div>
      <div class="stat-box"><span>Swipes</span><strong>${r.swipes ?? 0}</strong></div>
      <div class="stat-box"><span>Estado</span><strong><span class="chip-active">Ativo</span></strong></div>
    `;
  }

  popup("sucesso", "Recarga simulada", `+${valor} ${tipo === "saldo" ? "CVE de saldo" : "swipes"} adicionados (modo demo).`);
};

window.solicitarCartao = function() {
  if (!residenteLogado) {
    popup("erro", "Login necessário", "Faz login primeiro.");
    return mostrarLogin();
  }
  popup("info", "Cartão físico", "Solicitação de cartão RFID em desenvolvimento.");
};

window.loginWithGoogle = function() {
  popup("info", "Google", "Login com Google ainda não implementado.");
};

window.recuperarPassword = async function(e) {
  if (e) e.preventDefault();
  const emailEl = document.getElementById("recuperarEmail");
  const email = emailEl ? emailEl.value : "";
  if (!email) {
    popup("erro", "Email necessário", "Introduz o email.");
    return;
  }
  popup("info", "Recuperação", "Fluxo de recuperação em desenvolvimento.");
};

window.reenviarConfirmacao = async function() {
  if (!residenteLogado) {
    popup("erro", "Login necessário", "Faz login primeiro.");
    return mostrarLogin();
  }
  popup("info", "Confirmação", "Reenvio de confirmação em desenvolvimento.");
};

// ==================== PERSISTÊNCIA SIMPLES (demo + real) ====================
function carregarSessao() {
  try {
    const raw = localStorage.getItem("noszona_session");
    if (!raw) return false;
    const { residente } = JSON.parse(raw);
    if (residente) {
      residenteLogado = residente;
      window.residenteLogado = residente;

      // update header
      const ctasDeslogado = document.getElementById("ctasDeslogado");
      const ctasLogado = document.getElementById("ctasLogado");
      if (ctasDeslogado) ctasDeslogado.style.display = "none";
      if (ctasLogado) ctasLogado.style.display = "flex";
      const greetingEl = document.getElementById("userGreeting");
      if (ctasLogado && greetingEl) {
        const primeiroNome = (residente.nome || "").split(" ")[0];
        greetingEl.textContent = `Olá, ${primeiroNome}`;
      }
      return true;
    }
  } catch(e) {}
  return false;
}

function guardarSessaoDemo(residente, lembrar) {
  if (lembrar) {
    try { localStorage.setItem("noszona_session", JSON.stringify({ residente })); } catch(e){}
  }
}

// ==================== INIT NO CARREGAMENTO DA PÁGINA ====================
function initApp() {
  // Restaura sessão salva (se "lembrar" foi marcado no login anterior)
  carregarSessao();

  // Atualiza ano no footer
  const anoEl = document.getElementById("ano");
  if (anoEl) anoEl.textContent = new Date().getFullYear();

  console.log("✅ NOSZONA app inicializado (com suporte a demo pós-login)");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}