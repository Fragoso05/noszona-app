
// =====================================================
// CONFIGURAÇÃO
// =====================================================
const API_BASE = "https://violet-beaver-178312.hostingersite.com/api";
const SESSION_KEY = "noszona_session";
const QR_INTERVAL_MS = 30000;

// Estado global
let residenteLogado = null;
let tokenSessao = null;
let qrTimerId = null;
let qrCountdownId = null;

// =====================================================
// UTILIDADES
// =====================================================

function popup(tipo, titulo, texto) {
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

function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function setLoading(v) { document.body.classList.toggle("loading", v); }

function setFieldError(id, msg) {
  const input = document.getElementById(id);
  const erro = document.getElementById("erro-" + id);
  if (input) input.classList.add("field-invalid");
  if (erro) { erro.textContent = msg; erro.classList.add("visible"); }
}
function clearFieldError(id) {
  const input = document.getElementById(id);
  const erro = document.getElementById("erro-" + id);
  if (input) input.classList.remove("field-invalid");
  if (erro) { erro.textContent = ""; erro.classList.remove("visible"); }
}
function clearAllErrors(form) {
  form.querySelectorAll(".field-invalid").forEach(el => el.classList.remove("field-invalid"));
  form.querySelectorAll(".field-error").forEach(el => {
    el.textContent = ""; el.classList.remove("visible");
  });
}

// =====================================================
// NAVEGAÇÃO
// =====================================================

function esconderTudo() {
  ["registo", "login", "recuperar", "reset-password", "dashboard"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function mostrarRegisto(pacote) {
  esconderTudo();
  document.getElementById("registo").style.display = "block";
  if (pacote) document.getElementById("pacote").value = pacote;
  document.getElementById("registo").scrollIntoView({ behavior: "smooth" });
}

function mostrarLogin() {
  esconderTudo();
  document.getElementById("login").style.display = "block";
  document.getElementById("login").scrollIntoView({ behavior: "smooth" });
}

function mostrarRecuperar() {
  esconderTudo();
  document.getElementById("recuperar").style.display = "block";
  document.getElementById("recuperar").scrollIntoView({ behavior: "smooth" });
}

function mostrarDashboard() {
  if (!residenteLogado) {
    popup("erro", "Login necessário", "Faz login para aceder à tua conta.");
    return mostrarLogin();
  }
  esconderTudo();
  document.getElementById("dashboard").style.display = "block";
  renderizarDashboard();
  document.getElementById("dashboard").scrollIntoView({ behavior: "smooth" });
}

// =====================================================
// SESSÃO (persistente)
// =====================================================

function guardarSessao(residente, token, lembrar) {
  residenteLogado = residente;
  tokenSessao = token || null;
  const store = lembrar ? localStorage : sessionStorage;
  store.setItem(SESSION_KEY, JSON.stringify({ residente, token }));
  atualizarHeader();
}

function carregarSessao() {
  const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  try {
    const { residente, token } = JSON.parse(raw);
    residenteLogado = residente;
    tokenSessao = token || null;
    atualizarHeader();
    return true;
  } catch (e) {
    limparSessao();
    return false;
  }
}

function limparSessao() {
  residenteLogado = null;
  tokenSessao = null;
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  pararQRRotativo();
  atualizarHeader();
}

function atualizarSessaoStorage() {
  // Atualiza o storage atual com os dados frescos do residente
  if (!residenteLogado) return;
  const dados = JSON.stringify({ residente: residenteLogado, token: tokenSessao });
  const usado = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
  usado.setItem(SESSION_KEY, dados);
}

function logout() {
  if (!confirm("Queres mesmo terminar a sessão?")) return;
  limparSessao();
  esconderTudo();
  popup("sucesso", "Sessão terminada", "Voltaste a estar deslogado.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function atualizarHeader() {
  const logado = !!residenteLogado;
  document.getElementById("ctasDeslogado").style.display = logado ? "none" : "flex";
  document.getElementById("ctasLogado").style.display = logado ? "flex" : "none";
  if (logado) {
    const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
    document.getElementById("userGreeting").textContent = `Olá, ${primeiroNome}`;
  }
}

// =====================================================
// VALIDAÇÃO
// =====================================================

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_TELEFONE = /^[+0-9 ]{7,20}$/;
const REGEX_USERNAME = /^[a-zA-Z0-9_.]+$/;

function validarRegisto() {
  const form = document.getElementById("formRegisto");
  clearAllErrors(form);
  let ok = true;

  // Campos obrigatórios simples
  ["nome", "dataNascimento", "nacionalidade", "documento", "morada", "municipio"].forEach(id => {
    const v = document.getElementById(id).value.trim();
    if (!v) { setFieldError(id, "Campo obrigatório"); ok = false; }
  });

  // Telefone
  const tel = document.getElementById("telefone").value.trim();
  if (!tel) { setFieldError("telefone", "Telefone obrigatório"); ok = false; }
  else if (!REGEX_TELEFONE.test(tel)) {
    setFieldError("telefone", "Formato inválido. Ex: +238 999 99 99"); ok = false;
  }

  // Email
  const email = document.getElementById("email").value.trim();
  if (!email) { setFieldError("email", "Email obrigatório"); ok = false; }
  else if (!REGEX_EMAIL.test(email)) {
    setFieldError("email", "Email inválido"); ok = false;
  }

  // Username
  const username = document.getElementById("username").value.trim();
  if (!username) { setFieldError("username", "Username obrigatório"); ok = false; }
  else if (username.length < 3) {
    setFieldError("username", "Mínimo 3 caracteres"); ok = false;
  } else if (!REGEX_USERNAME.test(username)) {
    setFieldError("username", "Só letras, números, . e _"); ok = false;
  }

  // Password
  const pwd = document.getElementById("password").value;
  if (!pwd) { setFieldError("password", "Password obrigatória"); ok = false; }
  else if (pwd.length < 8) {
    setFieldError("password", "Mínimo 8 caracteres"); ok = false;
  } else if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    setFieldError("password", "Inclui letras E números"); ok = false;
  }

  // Pacote
  const pacote = document.getElementById("pacote").value;
  if (!pacote) { setFieldError("pacote", "Escolhe um pacote"); ok = false; }

  // Data de nascimento (mínimo 12 anos)
  const dn = document.getElementById("dataNascimento").value;
  if (dn) {
    const idade = (Date.now() - new Date(dn).getTime()) / (1000*60*60*24*365.25);
    if (idade < 12) { setFieldError("dataNascimento", "Idade mínima: 12 anos"); ok = false; }
    else if (idade > 120) { setFieldError("dataNascimento", "Data inválida"); ok = false; }
  }

  return ok;
}

function validarLogin() {
  const form = document.getElementById("formLogin");
  clearAllErrors(form);
  let ok = true;
  if (!document.getElementById("loginUsername").value.trim()) {
    setFieldError("loginUsername", "Username obrigatório"); ok = false;
  }
  if (!document.getElementById("loginPassword").value) {
    setFieldError("loginPassword", "Password obrigatória"); ok = false;
  }
  return ok;
}

// =====================================================
// REGISTO (suporte a Google + verificação de email)
// =====================================================

async function registar(e) {
  if (e) e.preventDefault();
  if (!validarRegisto()) return;

  const residente = {
    nome: document.getElementById("nome").value.trim(),
    dataNascimento: document.getElementById("dataNascimento").value,
    nacionalidade: document.getElementById("nacionalidade").value.trim(),
    documento: document.getElementById("documento").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    email: document.getElementById("email").value.trim().toLowerCase(),
    morada: document.getElementById("morada").value.trim(),
    municipio: document.getElementById("municipio").value.trim(),
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value,
    pacote: document.getElementById("pacote").value,
    provedor: "local"          // "local" ou "google"
  };

  try {
    setLoading(true);

    const response = await fetch(API_BASE + "/residentes/registar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(residente)
    });

    const data = await response.json();

    if (data.sucesso) {
      if (residente.provedor === "google") {
        popup("sucesso", "Conta Google criada!", 
          "Verifica o teu email para confirmar a conta e poder fazer login.");
      } else {
        popup("sucesso", "Conta criada com sucesso!", 
          "Verifica o teu email para ativar a conta antes de fazer login.");
      }
      mostrarLogin();   // volta para a tela de login
    } else {
      popup("erro", "Erro no registo", data.mensagem || "Verifica os dados e tenta novamente.");
    }
  } catch (e) {
    popup("erro", "Erro de ligação", "Não foi possível comunicar com o servidor.");
  } finally {
    setLoading(false);
  }
}

// =====================================================
// ENVIAR RECUPERAÇÃO DE PASSWORD (já existe o form)
// =====================================================
async function enviarRecuperacao() {
  const email = document.getElementById("recuperarEmail").value.trim();
  if (!email) {
    alert("Por favor introduz o teu email");
    return;
  }

  try {
    const response = await fetch(API_BASE + "/residentes/recuperar-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase() })
    });
    const data = await response.json();
    popup("sucesso", "Verifica o teu email", "Se a conta existir, recebes em breve um link para redefinir a password.");
    document.getElementById("recuperar").style.display = "none";
  } catch (e) {
    popup("erro", "Erro", "Não foi possível enviar agora. Tenta mais tarde.");
  }
  
}

// =====================================================
// LOGIN
// =====================================================

async function login(e) {
  if (e) e.preventDefault();
  if (!validarLogin()) return;
  const lembrar = document.getElementById("lembrar").checked;
  try {
    setLoading(true);
    const r = await fetch(API_BASE + "/residentes/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("loginUsername").value.trim(),
        password: document.getElementById("loginPassword").value
      })
    });
    const d = await r.json();
    if (!d.sucesso) {
      popup("erro", "Login não reconhecido", d.mensagem || "Verifica os dados ou cria uma conta nova.");
      return;
    }
    guardarSessao(d.residente, d.token, lembrar);
    mostrarDashboard();
   } catch (e) {
    console.error("Erro no login:", e);
    popup("erro", "Erro de ligação", "Não foi possível comunicar com o servidor. Verifica tua internet.");
  } finally {
    setLoading(false);
  }
}
// =====================================================
// LOGIN COM GOOGLE
// =====================================================
function loginWithGoogle() {
    popup("info", "Login com Google", "Esta funcionalidade está em desenvolvimento.\n\nEm breve podes entrar com a tua conta Google.");
    
    // Futuro: descomenta quando tiveres o backend pronto
    // window.location.href = API_BASE + "/auth/google";
}

// =====================================================
// RECUPERAR PASSWORD
// =====================================================

async function recuperarPassword(e) {
  if (e) e.preventDefault();
  clearAllErrors(document.getElementById("formRecuperar"));
  const email = document.getElementById("recuperarEmail").value.trim();
  if (!email) { setFieldError("recuperarEmail", "Email obrigatório"); return; }
  if (!REGEX_EMAIL.test(email)) { setFieldError("recuperarEmail", "Email inválido"); return; }

  try {
    setLoading(true);
    await fetch("https://violet-beaver-178312.hostingersite.com/red/api/residentes/recuperar-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase() })
    });
    // Por privacidade, mostramos sempre a mesma mensagem
    popup("sucesso", "Verifica o teu email",
      "Se a conta existir, recebes em breve um link para redefinir a password.");
    document.getElementById("formRecuperar").reset();
  } catch (e) {
    popup("erro", "Erro de ligação", "Não foi possível comunicar com o servidor.");
  } finally {
    setLoading(false);
  }
}

async function reenviarConfirmacao() {
  try {
    setLoading(true);
    const r = await fetch(API_BASE + "/residentes/reenviar-confirmacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: residenteLogado.email })
    });
    const d = await r.json();
    popup("sucesso", "Email reenviado",
      d.mensagem || "Verifica a tua caixa de entrada (e a pasta de spam).");
  } catch (e) {
    popup("erro", "Erro", "Não foi possível reenviar agora. Tenta mais tarde.");
  } finally {
    setLoading(false);
  }
}

// =====================================================
// DASHBOARD
// =====================================================

function renderizarDashboard() {
  const r = residenteLogado;
  document.getElementById("dadosConta").innerHTML = `
    <div class="stat-box"><span>Nome</span><strong>${escapeHtml(r.nome)}</strong></div>
    <div class="stat-box"><span>Pacote</span><strong>${escapeHtml(r.pacote || "—")}</strong></div>
    <div class="stat-box"><span>Saldo</span><strong>${escapeHtml(r.saldo ?? 0)} CVE</strong></div>
    <div class="stat-box"><span>Swipes</span><strong>${escapeHtml(r.swipes ?? 0)}</strong></div>
    <div class="stat-box"><span>Estado</span><strong><span class="chip-active">${escapeHtml(r.estado || "ativo")}</span></strong></div>
    <div class="stat-box"><span>UID Cartão</span><strong>${escapeHtml(r.uid || "Não gerado")}</strong></div>
    <div class="stat-box"><span>Cartão físico</span><strong>${r.pedidoCartao ? "Solicitado" : "Não solicitado"}</strong></div>
    <div class="stat-box"><span>Pagamento</span><strong>${escapeHtml(r.pagamentoStatus || "—")}</strong></div>
  `;

  // Banner email não confirmado
  const banner = document.getElementById("bannerEmailNaoConfirmado");
  banner.style.display = r.emailConfirmado === false ? "flex" : "none";

  iniciarQRRotativo();
}

// =====================================================
// QR ROTATIVO (anti-fraude)
// =====================================================
/* O QR roda a cada 30s. Cada QR contém:
 *   { uid: qrToken, ts: timestamp, sig: assinatura }
 * Em produção o backend assina com HMAC-SHA256 + chave secreta.
 * Aqui geramos client-side só para demonstrar; substituir quando
 * o endpoint /qr-token estiver implementado no backend.
 */

function pararQRRotativo() {
  if (qrTimerId) { clearInterval(qrTimerId); qrTimerId = null; }
  if (qrCountdownId) { clearInterval(qrCountdownId); qrCountdownId = null; }
}

function iniciarQRRotativo() {
  pararQRRotativo();
  atualizarQR();
  qrTimerId = setInterval(atualizarQR, QR_INTERVAL_MS);

  // Countdown visual
  let restante = QR_INTERVAL_MS / 1000;
  const tick = () => {
    document.getElementById("qrCountdown").textContent = restante;
    const pct = (restante / (QR_INTERVAL_MS/1000)) * 100;
    document.getElementById("qrProgressBar").style.width = pct + "%";
    restante--;
    if (restante < 0) restante = QR_INTERVAL_MS / 1000;
  };
  tick();
  qrCountdownId = setInterval(tick, 1000);
}

function atualizarQR() {
  if (!residenteLogado || !residenteLogado.qrToken) return;
  const ts = Math.floor(Date.now() / 1000);
  const payload = {
    uid: residenteLogado.qrToken,
    ts: ts,
    sig: simpleSign(residenteLogado.qrToken + ":" + ts)
  };
  const container = document.getElementById("qrCode");
  container.innerHTML = "";
  new QRCode(container, {
    text: JSON.stringify(payload),
    width: 200,
    height: 200,
    correctLevel: QRCode.CorrectLevel.M
  });
}

// Hash simples (não criptográfico) — em produção o servidor assina com HMAC
function simpleSign(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

// =====================================================
// RECARGA (sem dados de cartão!)
// =====================================================

async function recarregar(e) {
  if (e) e.preventDefault();
  if (!residenteLogado) {
    popup("erro", "Login necessário", "Faz login antes de recarregar.");
    return mostrarLogin();
  }
  clearFieldError("valorRecarga");
  const valor = Number(document.getElementById("valorRecarga").value);
  if (!valor || valor <= 0) {
    setFieldError("valorRecarga", "Valor deve ser maior que 0");
    return;
  }

  try {
    setLoading(true);
    const r = await fetch(API_BASE + "/residentes/recarregar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tokenSessao ? { "Authorization": "Bearer " + tokenSessao } : {})
      },
      body: JSON.stringify({
        id: residenteLogado.id,
        tipo: document.getElementById("tipoRecarga").value,
        valor: valor
      })
    });
    const d = await r.json();
    if (d.sucesso) {
      if (d.paymentUrl) {
        popup("info", "A redirecionar...", "Vais para o portal seguro Vinti4.");
        setTimeout(() => window.location.href = d.paymentUrl, 1500);
      } else {
        residenteLogado = d.residente || residenteLogado;
        atualizarSessaoStorage();
        renderizarDashboard();
        popup("sucesso", "Conta recarregada!", d.mensagem || "Saldo atualizado com sucesso.");
        document.getElementById("formRecarga").reset();
      }
    } else {
      popup("erro", "Erro na recarga", d.mensagem || "Tenta novamente.");
    }
  } catch (e) {
    popup("erro", "Erro de ligação", "Não foi possível comunicar com o servidor.");
  } finally {
    setLoading(false);
  }
}

// =====================================================
// CARTÃO FÍSICO
// =====================================================

async function solicitarCartao() {
  if (!residenteLogado) {
    popup("erro", "Login necessário", "Faz login primeiro.");
    return mostrarLogin();
  }
  if (!confirm("Confirmas o pedido do cartão físico RFID?")) return;
  try {
    setLoading(true);
    const r = await fetch(API_BASE + "/residentes/solicitar-cartao", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tokenSessao ? { "Authorization": "Bearer " + tokenSessao } : {})
      },
      body: JSON.stringify({ id: residenteLogado.id })
    });
    const d = await r.json();
    if (d.sucesso) {
      residenteLogado = d.residente || residenteLogado;
      atualizarSessaoStorage();
      renderizarDashboard();
      popup("sucesso", "Pedido enviado!", "O teu cartão físico NOSZONA Smart foi solicitado à administração.");
    } else {
      popup("erro", "Erro", d.mensagem || "Não foi possível solicitar o cartão.");
    }
  } catch (e) {
    popup("erro", "Erro de ligação", "Não foi possível comunicar com o servidor.");
  } finally {
    setLoading(false);
  }
}



// =====================================================
// REDEFINIR PASSWORD PELO LINK DO EMAIL
// =====================================================

let resetTokenAtual = null;

function esconderResetPassword() {
  const sec = document.getElementById("reset-password");
  if (sec) sec.style.display = "none";
}

// Mantém o código existente e apenas acrescenta o comportamento
// para esconder o formulário de nova password quando o utilizador muda de ecrã.
const mostrarLoginOriginal = mostrarLogin;
mostrarLogin = function() {
  mostrarLoginOriginal();
  esconderResetPassword();
};

const mostrarRegistoOriginal = mostrarRegisto;
mostrarRegisto = function(pacote) {
  mostrarRegistoOriginal(pacote);
  esconderResetPassword();
};

const mostrarRecuperarOriginal = mostrarRecuperar;
mostrarRecuperar = function() {
  mostrarRecuperarOriginal();
  esconderResetPassword();
};

const mostrarDashboardOriginal = mostrarDashboard;
mostrarDashboard = function() {
  mostrarDashboardOriginal();
  esconderResetPassword();
};

function mostrarResetPassword(token) {
  esconderTudo();
  resetTokenAtual = token;

  const sec = document.getElementById("reset-password");
  if (!sec) return;

  sec.style.display = "block";
  sec.scrollIntoView({ behavior: "smooth" });
}

function verificarRotaResetPassword() {
  const hash = window.location.hash || "";

  if (!hash.startsWith("#reset-password")) return;

  const queryString = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(queryString);
  const token = params.get("token");

  if (!token) {
    popup("erro", "Link inválido", "O link de recuperação não tem token.");
    mostrarLogin();
    return;
  }

  mostrarResetPassword(token);
}

async function redefinirPassword(e) {
  if (e) e.preventDefault();

  const form = document.getElementById("formResetPassword");
  clearAllErrors(form);

  const novaPassword = document.getElementById("novaPassword").value.trim();
  const confirmarNovaPassword = document.getElementById("confirmarNovaPassword").value.trim();

  if (!novaPassword) {
    setFieldError("novaPassword", "Nova password obrigatória");
    return;
  }

  if (novaPassword.length < 8) {
    setFieldError("novaPassword", "A password deve ter pelo menos 8 caracteres");
    return;
  }

  if (novaPassword !== confirmarNovaPassword) {
    setFieldError("confirmarNovaPassword", "As passwords não coincidem");
    return;
  }

  if (!resetTokenAtual) {
    popup("erro", "Token inválido", "O link de recuperação não é válido.");
    return;
  }

  try {
    setLoading(true);

    const resposta = await fetch("https://violet-beaver-178312.hostingersite.com/red/api/residentes/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: resetTokenAtual,
        password: novaPassword
      })
    });

    const texto = await resposta.text();
    let dados;

    try {
      dados = JSON.parse(texto);
    } catch (erroJson) {
      throw new Error("Resposta inválida do servidor: " + texto);
    }

    if (!dados.sucesso) {
      popup("erro", "Erro", dados.mensagem || "Não foi possível alterar a password.");
      return;
    }

    popup("sucesso", "Password alterada", "A tua password foi atualizada com sucesso. Já podes fazer login.");
    form.reset();
    resetTokenAtual = null;
    window.location.hash = "";
    mostrarLogin();

  } catch (erro) {
    console.error("Erro ao redefinir password:", erro);
    popup("erro", "Erro de ligação", "Não foi possível comunicar com o servidor.");
  } finally {
    setLoading(false);
  }
}

window.addEventListener("hashchange", verificarRotaResetPassword);
window.addEventListener("load", verificarRotaResetPassword);

// =====================================================
// INICIALIZAÇÃO
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  // Ano no footer
  document.getElementById("ano").textContent = new Date().getFullYear();

  // Limpa erros enquanto se escreve (UX)
  document.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("input", () => {
      if (el.id) clearFieldError(el.id);
    });
  });

  // Restaura sessão se existir
  carregarSessao();

  // Verifica se o link aberto é de redefinição de password
  verificarRotaResetPassword();
});

// =====================================================
// PATCH EXTRA: abrir automaticamente o formulario de reset-password
// =====================================================
// Este bloco apenas reforca a abertura do formulario quando o link vem do email.
// Nao altera as funcoes antigas; so garante que #reset-password?token=... mostra o formulario correto.
(function () {
  function abrirFormularioResetPorHash() {
    const hash = window.location.hash || "";

    if (!hash.startsWith("#reset-password")) {
      return false;
    }

    const queryString = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(queryString);
    const token = params.get("token");

    if (!token) {
      if (typeof popup === "function") {
        popup("erro", "Link inválido", "O link de recuperação não tem token.");
      }
      return false;
    }

    // Guarda o token para a funcao redefinirPassword(event)
    try {
      resetTokenAtual = token;
    } catch (e) {
      window.resetTokenAtual = token;
    }

    // Esconde os outros paineis sem mexer no resto da pagina
    ["registo", "login", "recuperar", "dashboard"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    const secaoReset = document.getElementById("reset-password");

    if (!secaoReset) {
      if (typeof popup === "function") {
        popup("erro", "Erro", "A secção de nova password não foi encontrada no HTML.");
      }
      return false;
    }

    secaoReset.style.display = "block";

    setTimeout(() => {
      secaoReset.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    return true;
  }

  window.addEventListener("DOMContentLoaded", () => {
    abrirFormularioResetPorHash();
    setTimeout(abrirFormularioResetPorHash, 300);
    setTimeout(abrirFormularioResetPorHash, 900);
  });

  window.addEventListener("load", () => {
    abrirFormularioResetPorHash();
    setTimeout(abrirFormularioResetPorHash, 300);
  });

  window.addEventListener("hashchange", abrirFormularioResetPorHash);

  // Caso o script seja carregado com a pagina ja pronta
  setTimeout(abrirFormularioResetPorHash, 300);
})();
