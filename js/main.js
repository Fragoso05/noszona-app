// =====================================================
// MAIN.JS - VERSÃO COMPLETA FUNCIONAL
// =====================================================

console.log("✅ NOSZONA carregado");

// ==================== NAVEGAÇÃO ====================
window.esconderTudo = function() {
  ["registo", "login", "recuperar", "dashboard"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
};

window.mostrarLogin = function() {
  esconderTudo();
  document.getElementById("login").style.display = "block";
  document.getElementById("login").scrollIntoView({ behavior: "smooth" });
};

window.mostrarRegisto = function(pacote = 'Pacote 2') {
  esconderTudo();
  document.getElementById("registo").style.display = "block";
  if (pacote) document.getElementById("pacote").value = pacote;
  document.getElementById("registo").scrollIntoView({ behavior: "smooth" });
};

window.mostrarRecuperar = function() {
  esconderTudo();
  document.getElementById("recuperar").style.display = "block";
  document.getElementById("recuperar").scrollIntoView({ behavior: "smooth" });
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
    const response = await fetch("https://violet-beaver-178312.hostingersite.com/api/residentes/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.sucesso) {
      residenteLogado = data.residente;
      popup("sucesso", "Login efetuado com sucesso!", "Bem-vindo de volta!");
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
    document.getElementById("qrCountdown").textContent = restante;
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
}

function escapeHtml(unsafe) {
  return String(unsafe || "").replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}