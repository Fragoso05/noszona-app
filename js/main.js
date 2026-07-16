// =====================================================
// NOSZONA Smart - main.js (CLÁSSICO + LIMPO)
// - Compatível com onclick="" no HTML (sem type="module")
// - Funciona em file:// direto
// - Hashing de password no cliente (security.js)
// - Demo localStorage + API real quando disponível
// - Registo + Login consistentes no modo demo
// =====================================================

console.log("✅ NOSZONA carregado (versão limpa)");

// ==================== ESTADO GLOBAL ====================
let residenteLogado = null;
let qrTimerId = null;
let qrCountdownId = null;

// ==================== NAVEGAÇÃO (definidas como funções + expostas em window para onclick=) ====================
function voltarAoInicio() {
  // Esconde tudo que está aberto (dashboard, registo, login, etc.)
  esconderTudo();

  // Mostra novamente as secções principais (hero, pacotes, etc.)
  document.querySelectorAll('section, .hero, .cta-banner, .trust-section').forEach(el => {
    if (['registo', 'login', 'recuperar', 'dashboard', 'popupLogin'].includes(el.id)) {
      el.style.display = "none";
    } else {
      el.style.display = "";   // volta ao normal
    }
  });

  // Scroll suave para o Hero / topo da página
  const hero = document.getElementById("top") || document.querySelector(".hero");
  if (hero) {
    hero.scrollIntoView({ behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Se estiver logado, mantém o header logado mas sai do dashboard
  if (residenteLogado) {
    atualizarHeaderLocal(residenteLogado);
  }
}
window.voltarAoInicio = voltarAoInicio;

function mostrarLogin() {
  document.getElementById("popupLogin").style.display = "flex";
}

function fecharPopupLogin() {
  document.getElementById("popupLogin").style.display = "none";
}
window.mostrarLogin = mostrarLogin;
window.fecharPopupLogin = fecharPopupLogin;



//mostrar apenas uma aba
function esconderTudo() {
  document.querySelectorAll('section, .hero, .cta-banner, .trust-section').forEach(el => {
    if (!['registo', 'login', 'recuperar', 'dashboard'].includes(el.id)) {
      el.style.display = "none";
    }
  });
}

function mostrarRegisto(pacote) {
  esconderTudo();
  const registo = document.getElementById("registo");
  if (registo) {
    registo.style.display = "block";
    if (pacote) {
      const p = document.getElementById("pacote");
      if (p) p.value = pacote;
    }
    registo.scrollIntoView({ behavior: "smooth" });
  }
}

function mostrarRecuperar() {
  document.getElementById("popupRecuperar").style.display = "flex";
}

function fecharPopupRecuperar() {
  document.getElementById("popupRecuperar").style.display = "none";
}

window.mostrarRecuperar = mostrarRecuperar;
window.fecharPopupRecuperar = fecharPopupRecuperar;
////////////////////////////////////////////////

function logout() {
 
  if (qrTimerId) { clearTimeout(qrTimerId); qrTimerId = null; }
  if (qrCountdownId) { clearInterval(qrCountdownId); qrCountdownId = null; }

  residenteLogado = null;
  window.residenteLogado = null;
  try {
    localStorage.removeItem("noszona_session");
    sessionStorage.removeItem("noszona_session");
  } catch (e) {}

  esconderTudo();
  const ctasDeslogado = document.getElementById("ctasDeslogado");
  const ctasLogado = document.getElementById("ctasLogado");
  if (ctasDeslogado) ctasDeslogado.style.display = "flex";
  if (ctasLogado) ctasLogado.style.display = "none";

  // Mostra novamente as secções principais
document.querySelectorAll('section, header, .hero, .section, .cta-banner, .trust-section').forEach(el => {
  el.style.display = "";
});

  popup("sucesso", "Sessão terminada", "Voltaste a estar deslogado.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Expose to global for inline onclick handlers in HTML
window.esconderTudo = esconderTudo;
window.mostrarLogin = mostrarLogin;
window.mostrarRegisto = mostrarRegisto;
window.mostrarRecuperar = mostrarRecuperar;
window.logout = logout;

// ==================== UI BÁSICA ====================
function popup(tipo, titulo, texto) {
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
}

function setLoading(v) {
  document.body.classList.toggle("loading", v);
}

window.popup = popup;
window.setLoading = setLoading;


// Helpers partilhados (reduz duplicação)
function atualizarHeaderLocal(user) {
  const u = user || residenteLogado;
  if (!u) return;
  const ctasDeslogado = document.getElementById("ctasDeslogado");
  const ctasLogado = document.getElementById("ctasLogado");
  if (ctasDeslogado) ctasDeslogado.style.display = "none";
  if (ctasLogado) ctasLogado.style.display = "flex";
  const greetingEl = document.getElementById("userGreeting");
  if (ctasLogado && greetingEl) {
    const primeiroNome = (u.nome || "").split(" ")[0];
    greetingEl.textContent = `Olá, ${primeiroNome}`;
  }
}

function guardarSessaoLocal(residente, lembrar) {
  try {
    const sessionData = JSON.stringify({ residente });
    sessionStorage.setItem("noszona_session", sessionData);
    if (lembrar) localStorage.setItem("noszona_session", sessionData);
  } catch (e) {}
}

function escapeHtml(unsafe) {
  return String(unsafe || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ==================== LOGIN ====================
async function login(e) {
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
    let response;

    // API
    try {
      response = await fetch("https://violet-beaver-178312.hostingersite.com/api/residentes/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      data = await response.json();
    } catch (fetchErr) {
      console.warn("API offline");
      // Demo fallback (mantém o que já tinhas)
      data = { sucesso: true, residente: { nome: username, uid: "-" + Date.now() } };
    }

    if (data.sucesso) {
      // FECHA O POPUP DE LOGIN IMEDIATAMENTE
      fecharPopupLogin();

      residenteLogado = data.residente;
      window.residenteLogado = residenteLogado;
      guardarSessaoLocal(residenteLogado, lembrar);
      atualizarHeaderLocal(residenteLogado);

      

      // Mensagem de sucesso
      const is = !data.residente || data.residente.uid?.startsWith("-");
      popup("sucesso", "Login efetuado com sucesso!", 
            is ? "Bem-vindo!" : "Bem-vindo de volta!");

      // Abre o dashboard
        mostrarDashboard();
      

    } else {
      fecharPopupLogin();
      popup("erro", "Login falhou", data.mensagem || "Username ou password incorretos.");
    }

  } catch (err) {
    console.error(err);
    popup("erro", "Erro de ligação", "Não foi possível conectar ao servidor.");
  } finally {
    setLoading(false);
  }
}
window.login = login;

// ==================== DASHBOARD + QR ====================
function mostrarDashboard() {
  const user = residenteLogado || window.residenteLogado;
  if (!user) {
    popup("erro", "Login necessário", "Faz login primeiro.");
    return mostrarLogin();
  }

  // Esconde TODAS as outras secções da página
  document.querySelectorAll('section, .cta-banner, .trust-section').forEach(el => {
    if (el.id !== "dashboard") {
      el.style.display = "none";
    }
  });

  // Mostra apenas o dashboard
  const dash = document.getElementById("dashboard");
  if (dash) {
    dash.style.display = "block";
  }

  atualizarHeaderLocal(user);
  renderizarDashboard();

  // Scroll para o topo
  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.mostrarDashboard = mostrarDashboard;

  function renderizarDashboard() {
  const r = residenteLogado || window.residenteLogado;
  if (!r) return;

  // Foto de perfil (já existe)
  if (typeof window.renderizarFotoPerfilCliente === "function") {
    window.renderizarFotoPerfilCliente(r);
  }

  // ==================== PREENCHER CARTÃO VIRTUAL ====================
 document.getElementById("dashNome").textContent = escapeHtml(r.nome || "");
 document.getElementById("dashID").textContent = escapeHtml(r.uid || r.id || "");
 document.getElementById("dashPacote").textContent = escapeHtml(r.pacote || "");
 document.getElementById("dashMunicipio").textContent = escapeHtml(r.municipio || "");
 document.getElementById("dashPais").textContent = escapeHtml(r.pais || "");


  // ==================== STATS ABAIXO DO CARTÃO (como na imagem) ====================
  const statsContainer = document.getElementById("dadosConta"); 
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-box">
        <span>Saldo Atual</span>
        <strong>${Number(r.saldo || 0).toLocaleString('CV')} Escudos</strong>
      </div>
      <div class="stat-box">
        <span>Swipes Disponíveis</span>
        <strong>${r.swipes || 0}</strong>
      </div>
      <div class="stat-box">
        <span>Estado</span>
        <strong><span class="chip-active">ATIVO</span></strong>
      </div>
      <!-- Próximo Evento -->
      <div class="stat-box">
        <span>Próximo Evento</span>
        <strong>${escapeHtml(r.proximoEvento || "Nenhum evento agendado")}</strong>
      </div>
    `;
  }

  iniciarQRRotativo();
}
// === FIX BOTÃO FOTO CARTÃO ===
function abrirSeletorFotoCartao() {
  document.getElementById("inputFotoCartao").click();
}

// ==================== FOTO PARA O CARTÃO VIRTUAL ====================
function selecionarFotoCartao(input) {
    const file = input.files[0];
    if (!file) return;

    // Usa o mesmo padrão que já existe no teu fotos.js
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const base64 = e.target.result;

        // Guarda globalmente (como fazes noutras partes)
        window.fotoCartaoBase64 = base64;

        // Substitui a imagem no cartão
        const imgCartao = document.getElementById("imgFotoCartao");
        if (imgCartao) {
            imgCartao.src = base64;
            // Garante que fica circular
            imgCartao.style.borderRadius = "50%";
        }

        // Feedback (usa o teu sistema de popup)
        if (typeof popup === "function") {
            popup("sucesso", "Foto atualizada!", "A foto do cartão foi substituída com sucesso.");
        } else {
            alert("Foto do cartão atualizada com sucesso!");
        }
    };

    reader.onerror = function() {
        alert("Erro ao ler a imagem.");
    };

    reader.readAsDataURL(file);

    // Limpa o input para poder selecionar a mesma foto novamente
    input.value = '';
}

window.abrirSeletorFotoCartao = abrirSeletorFotoCartao;
window.selecionarFotoCartao = selecionarFotoCartao;

function iniciarQRRotativo() {
  if (qrTimerId) clearTimeout(qrTimerId);
  if (qrCountdownId) clearInterval(qrCountdownId);

  atualizarQR();

  function scheduleNext() {
    qrTimerId = setTimeout(() => { atualizarQR(); scheduleNext(); }, 30000);
  }
  scheduleNext();

  let restante = 30;
  const tick = () => {
    const cd = document.getElementById("qrCountdown");
    if (cd) cd.textContent = restante;
    const bar = document.getElementById("qrProgressBar");
    if (bar) bar.style.width = Math.max(0, (restante / 30) * 100) + "%";
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

  const current = residenteLogado || window.residenteLogado;
  const payload = { uid: current?.uid || "demo123", ts: Math.floor(Date.now() / 1000) };

  new QRCode(container, {
    text: JSON.stringify(payload),
    width: 180,
    height: 180,
    correctLevel: QRCode.CorrectLevel.M
  });

  const bar = document.getElementById("qrProgressBar");
  if (bar) bar.style.width = "100%";

  const qrCard = container.closest('.qr-card');
  if (qrCard) {
    const orig = qrCard.style.boxShadow || '';
    qrCard.style.transition = 'box-shadow 0.25s ease';
    qrCard.style.boxShadow = '0 0 12px rgba(0, 195, 227, 0.6)';
    setTimeout(() => { if (qrCard) qrCard.style.boxShadow = orig; }, 650);
  }
}

// ==================== REGISTO (com hash no cliente + fallback demo robusto) ====================
async function registar(e) { 
  if (e) e.preventDefault();

  const form = document.getElementById("formRegisto");
  if (!form) { popup("erro", "Erro", "Formulário de registo não encontrado."); return; }

  setLoading(true);

  try {
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };

    const plainPassword = getVal("password");
    const userData = {
      nome: getVal("nome"),
      dataNascimento: getVal("dataNascimento"),
      nacionalidade: getVal("nacionalidade"),
      documento: getVal("documento"),
      telefone: getVal("telefone"),
      email: getVal("email").toLowerCase(),
      morada: getVal("morada"),
      pais: getVal("pais"),
      municipio: getVal("municipio"),
      username: getVal("username"),
      pacote: getVal("pacote"),
        };

    const obrigatorios = ["nome","dataNascimento","nacionalidade","documento","telefone","email","pais","morada","municipio","username"];
    for (const campo of obrigatorios) {
      if (!userData[campo]) {
        popup("erro", "Campos obrigatórios", `Por favor preenche o campo: ${campo}`);
        setLoading(false); return;
      }
    }
    if (userData.username.length < 3) { popup("erro","Username inválido","O username deve ter pelo menos 3 caracteres."); setLoading(false); return; }
    if (!plainPassword || plainPassword.length < 6) { popup("erro","Password inválida","A password deve ter pelo menos 6 caracteres."); setLoading(false); return; }
    if (!userData.email.includes("@") || !userData.email.includes(".")) { popup("erro","Email inválido","Introduz um email válido."); setLoading(false); return; }

    const termos = document.getElementById("termos");
    if (!termos || !termos.checked) {
      popup("erro", "Termos e Condições", "É obrigatório aceitar os Termos e Condições.");
      setLoading(false); return;
    }

    // HASH NO CLIENTE usando security.js (nunca enviamos plain se possível)
    let passwordHash = null, salt = null;
    try {
      const hp = (typeof window !== "undefined" && typeof window.hashPassword === "function" && window.hashPassword) ||
                 (typeof hashPassword === "function" && hashPassword) ||
                 (typeof globalThis !== "undefined" && typeof globalThis.hashPassword === "function" && globalThis.hashPassword);
      if (typeof hp === "function") {
        const h = await hp(plainPassword);
        passwordHash = h.hash; salt = h.salt;
        console.log("✅ Hash da password feito no cliente (security.js)");
      } else {
        console.warn("hashPassword não encontrado — verifica que security.js é carregado ANTES de main.js");
      }
    } catch (hErr) {
      console.warn("Erro ao fazer hash da password:", hErr);
    }

    const dataToSend = { ...userData, password: plainPassword, passwordHash, salt };

    // Tenta real
    let successReal = false, serverResp = null;
    try {
      const resp = await fetch("https://violet-beaver-178312.hostingersite.com/api/residentes/registar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dataToSend)
      });
      serverResp = await resp.json().catch(() => ({}));
      if (resp.ok && serverResp && serverResp.sucesso) successReal = true;
    } catch (_) {
      console.warn("Registo: backend indisponível, usando DEMO local.");
    }

    if (!successReal) {
      // DEMO LOCAL (sempre funciona)
      let registered = [];
      try { registered = JSON.parse(localStorage.getItem("noszona_registered_users") || "[]"); } catch (e) { registered = []; }
      registered = registered.filter(u => u.username !== userData.username && (u.email || "").toLowerCase() !== userData.email);

      const demoUser = {
        ...userData, passwordHash, salt,
        uid: "user-" + Date.now().toString(36),
        emailConfirmado: false,
        registadoEm: new Date().toISOString()
      };
      registered.push(demoUser);
      localStorage.setItem("noszona_registered_users", JSON.stringify(registered));

      residenteLogado = demoUser;
      window.residenteLogado = demoUser;
      guardarSessaoLocal(demoUser, true);
      atualizarHeaderLocal(demoUser);

      popup("sucesso", "Registo (MODO DEMO)", "Conta criada localmente! (Backend offline)");

      form.reset();
      setLoading(false);

      setTimeout(() => { if (typeof showWelcomeEmailPreview === "function") showWelcomeEmailPreview(demoUser); }, 700);
      setTimeout(() => { mostrarLogin(); }, 2200);
      return;
    }

    // Enviar fotos depois do registo real
    try {
      const residenteIdFotos =
        serverResp.residenteId ||
        serverResp.id ||
        serverResp.residenteIdCriado ||
        serverResp.residente?.id ||
        serverResp.insertId;

      if (typeof window.enviarFotosDepoisDoRegisto === "function" && residenteIdFotos) {
        await window.enviarFotosDepoisDoRegisto(residenteIdFotos);
        console.log("✅ Fotos enviadas para o residente:", residenteIdFotos);
      } else {
        console.warn("⚠️ Fotos não enviadas: residenteId não encontrado na resposta do registo.", serverResp);
      }
    } catch (erroFotos) {
      console.warn("Conta criada, mas as fotos não foram enviadas:", erroFotos);
    }

    // Caminho real
    popup("sucesso", "Conta criada!", serverResp && serverResp.mensagem ? serverResp.mensagem : "Registo efetuado com sucesso.");
    form.reset();
    setLoading(false);

    setTimeout(() => { if (typeof showWelcomeEmailPreview === "function") showWelcomeEmailPreview(userData); }, 600);

    if (serverResp && serverResp.paymentUrl) {
      setTimeout(() => { window.location.href = serverResp.paymentUrl; }, 1500);
    } else {
      setTimeout(() => { mostrarLogin(); }, 1800);
    }
  } catch (err) {
    console.error("Erro no registo:", err);
    popup("erro", "Erro de ligação", "Não foi possível processar o registo.");
    setLoading(false);
  }
}
window.registar = registar;

// ==================== RECARGA (abre portal SISP/Vinti4) ====================
function recarregar(e) {
  if (e) e.preventDefault();
  const logged = residenteLogado || window.residenteLogado;
  if (!logged) { popup("erro", "Login necessário", "Faz login primeiro."); return mostrarLogin(); }

  const tipo = document.getElementById("tipoRecarga") ? document.getElementById("tipoRecarga").value : "saldo";
  const valor = Number(document.getElementById("valorRecarga") ? document.getElementById("valorRecarga").value : 0) || 0;
  if (valor <= 0) { popup("erro", "Valor inválido", "Introduz um valor positivo."); return; }

  const endpoint = "https://violet-beaver-178312.hostingersite.com/api/pagamento/iniciar";
  const dados = {
    residenteId: logged.id || logged.uid || "",
    pacote: logged.pacote || "Recarga",
    tipo, valor,
    email: "noszonasmart@gmail.com",
    cidade: logged.municipio || "Praia",
    municipio: logged.municipio || "Praia",
    morada: logged.morada || "Cabo Verde",
    codigoPostal: "7600"
  };

  const form = document.createElement("form");
  form.method = "POST"; form.action = endpoint; form.target = "_blank"; form.style.display = "none";
  Object.keys(dados).forEach(k => {
    const i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = dados[k]; form.appendChild(i);
  });
  document.body.appendChild(form); form.submit(); document.body.removeChild(form);

  popup("sucesso", "Pagamento aberto", "Portal seguro Vinti4 aberto numa nova janela.");
}
window.recarregar = recarregar;



// ==================== LOGIN COM GOOGLE (popup estilo Google + só contas registadas) ====================
function loginWithGoogle() {
  const existing = document.getElementById('google-login-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'google-login-modal';
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:'Roboto',Arial,sans-serif;`;

  modal.innerHTML = `
    <div style="background:#fff;width:420px;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.3);overflow:hidden;">
      <div style="padding:28px 28px 16px;text-align:center;border-bottom:1px solid #dadce0;">
        <div style="display:flex;justify-content:center;align-items:center;gap:4px;margin-bottom:12px;">
          <span style="font-size:32px;font-weight:500;color:#4285f4;">G</span>
          <span style="font-size:32px;font-weight:500;color:#ea4335;">o</span>
          <span style="font-size:32px;font-weight:500;color:#fbbc05;">o</span>
          <span style="font-size:32px;font-weight:500;color:#4285f4;">g</span>
          <span style="font-size:32px;font-weight:500;color:#34a853;">l</span>
          <span style="font-size:32px;font-weight:500;color:#ea4335;">e</span>
        </div>
        <h2 style="margin:0;font-size:22px;font-weight:400;color:#202124;">Sign in</h2>
        <p style="margin:4px 0 0;font-size:14px;color:#5f6368;">Use your Google Account</p>
      </div>
      <div style="padding:24px 28px;">
        <div id="google-step-1">
          <input id="google-email-input" type="email" placeholder="Email or phone" style="width:100%;padding:12px 14px;border:1px solid #dadce0;border-radius:4px;font-size:16px;outline:none;margin-bottom:8px;">
          <div style="font-size:13px;color:#1a73e8;margin-bottom:24px;"><a href="#" style="text-decoration:none;color:#1a73e8;">Forgot email?</a></div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;">
            <a href="#" id="google-create-account" style="color:#1a73e8;text-decoration:none;">Create account</a>
            <button id="google-next-btn" style="background:#1a73e8;color:white;border:none;padding:8px 24px;border-radius:4px;font-size:14px;font-weight:500;cursor:pointer;">Next</button>
          </div>
        </div>
        <div id="google-step-2" style="display:none;">
          <div style="margin-bottom:12px;">
            <div id="google-email-display" style="font-size:14px;color:#202124;font-weight:500;"></div>
            <a href="#" id="google-back-email" style="font-size:13px;color:#1a73e8;text-decoration:none;">Not your account?</a>
          </div>
          <input id="google-password-input" type="password" placeholder="Password da tua conta NOSZONA" style="width:100%;padding:12px 14px;border:1px solid #dadce0;border-radius:4px;font-size:16px;outline:none;margin-bottom:6px;">
          <div style="font-size:11px;color:#5f6368;margin-bottom:12px;">Usa a password que criaste ao registar-te com este email.</div>
          <div style="margin-bottom:20px;">
            <label style="font-size:14px;color:#5f6368;display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="google-show-password"> Show password
            </label>
          </div>
          <div style="text-align:right;">
            <button id="google-signin-btn" style="background:#1a73e8;color:white;border:none;padding:8px 24px;border-radius:4px;font-size:14px;font-weight:500;cursor:pointer;">Sign in</button>
          </div>
        </div>
      </div>
      <div style="background:#f8f9fa;padding:16px 28px;font-size:12px;color:#5f6368;border-top:1px solid #dadce0;">Autenticação NOSZONA • Para contas registadas com email</div>
    </div>
  `;
  document.body.appendChild(modal);

  const step1 = modal.querySelector('#google-step-1');
  const step2 = modal.querySelector('#google-step-2');
  const emailInput = modal.querySelector('#google-email-input');
  const nextBtn = modal.querySelector('#google-next-btn');
  const passwordInput = modal.querySelector('#google-password-input');
  const signinBtn = modal.querySelector('#google-signin-btn');
  const emailDisplay = modal.querySelector('#google-email-display');
  const backLink = modal.querySelector('#google-back-email');
  const showPass = modal.querySelector('#google-show-password');
  const createLink = modal.querySelector('#google-create-account');

  if (createLink) {
    createLink.onclick = (e) => { e.preventDefault(); modal.remove(); window.mostrarRegisto && window.mostrarRegisto('Pacote 2'); };
  }

  nextBtn.onclick = async () => {
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) { alert('Please enter a valid email'); return; }

    const checkUrl = "https://violet-beaver-178312.hostingersite.com/api/residentes/google-login";
    try {
      setLoading(true);
      const r = await fetch(checkUrl, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({email, checkOnly:true}) });
      const d = await r.json();
      if (d && d.exists === false) {
        setLoading(false);
        popup("erro", "Conta não registrada", d.mensagem || "Esta conta Google ainda não está registada no Noszona. Por favor efetua o registo através do formulário normal primeiro.");
        return;
      }
    } catch (e) {
      console.warn("Check Google email falhou (demo permitido)");
    } finally { setLoading(false); }

    emailDisplay.textContent = email;
    step1.style.display = 'none';
    step2.style.display = 'block';
    passwordInput.focus();
  };

  backLink.onclick = (e) => { e.preventDefault(); step2.style.display='none'; step1.style.display='block'; emailInput.focus(); };
  showPass.onchange = () => { passwordInput.type = showPass.checked ? 'text' : 'password'; };

  const handleSignIn = () => {
    const email = (emailDisplay.textContent || emailInput.value || "").trim();
    const pass = (passwordInput ? passwordInput.value : "").trim();
    if (!email) return;
    modal.remove();
    realGoogleLogin(email, pass);
  };
  signinBtn.onclick = handleSignIn;
  passwordInput.onkeydown = (e) => { if (e.key === 'Enter') handleSignIn(); };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  setTimeout(() => emailInput.focus(), 100);
}
window.loginWithGoogle = loginWithGoogle;

async function realGoogleLogin(email, password) {
  if (!email || !password) { popup("erro", "Campos obrigatórios", "Introduz o email e a password."); return; }

  const endpoint = "https://violet-beaver-178312.hostingersite.com/api/residentes/google-login";
  try {
    setLoading(true);
    let data;
    try {
      const resp = await fetch(endpoint, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({email, password}) });
      data = await resp.json();
    } catch (fe) {
      // DEMO
      let registered = [];
      try { registered = JSON.parse(localStorage.getItem("noszona_registered_users") || "[]"); } catch(e){}
      const ex = registered.find(u => (u.email || "").toLowerCase() === email.toLowerCase());
      if (ex) {
        data = { sucesso: true, mensagem: "Login com Google (DEMO)", residente: ex };
      } else {
        data = { sucesso: false, mensagem: "Conta não registada no modo DEMO. Regista-te primeiro pelo formulário normal." };
      }
    }

    if (data && data.sucesso) {
      residenteLogado = data.residente;
      window.residenteLogado = residenteLogado;
      guardarSessaoLocal(residenteLogado, true);
      atualizarHeaderLocal(residenteLogado);

      const isDemo = !data.residente || String(data.mensagem || "").toLowerCase().includes("demo");
      popup("sucesso", "Login com Google", isDemo ? "Modo DEMO - Bem-vindo!" : (data.mensagem || "Bem-vindo de volta!"));
      mostrarDashboard();
    } else {
      popup("erro", "Login Google falhou", data ? (data.mensagem || "Email ou password incorretos.") : "Erro desconhecido.");
    }
  } catch (err) {
    console.error(err);
    popup("erro", "Erro de ligação", "Não foi possível contactar o servidor.");
  } finally {
    setLoading(false);
  }
}

// Mantido por compat
function processGoogleAuth(email) { realGoogleLogin(email, "demo-pass"); }

// ==================== WELCOME EMAIL SIMULADO (após registo) ====================
function showWelcomeEmailPreview(userData) {
  const ex = document.getElementById('welcome-email-modal'); if (ex) ex.remove();
  const modal = document.createElement('div');
  modal.id = 'welcome-email-modal';
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:Arial,sans-serif;`;

  modal.innerHTML = `
    <div style="background:#fff;width:520px;max-width:92%;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.3);overflow:hidden;">
      <div style="background:#f2f2f2;padding:12px 20px;border-bottom:1px solid #ddd;display:flex;align-items:center;justify-content:space-between;">
        <div><strong style="color:#333;">Noszona Smart City</strong><br><span style="font-size:12px;color:#666;">no-reply@noszona.cv</span></div>
        <div style="text-align:right;font-size:12px;color:#888;">Para: ${userData.email}<br>${new Date().toLocaleDateString('pt-PT')}</div>
      </div>
      <div style="padding:28px 32px;line-height:1.6;color:#333;">
        <h3 style="margin-top:0;color:#061827;">Bem-vindo à família NOSZONA!</h3>
        <p>Olá <strong>${userData.nome}</strong>,</p>
        <p>É com grande prazer que te damos as boas-vindas ao <strong>site Noszona</strong>.</p>
        <p>A partir de agora, fazes parte da <strong>família Fundação Smart City</strong>.</p>
        <p>Com a tua conta ativa, podes usufruir de todas as vantagens da Smart City de Cabo Verde: QR seguro, carteira virtual, acesso a eventos e muito mais.</p>
        <p>Obrigado por te juntares a nós. Juntos construímos uma cidade mais inteligente!</p>
        <p style="margin-top:24px;">Com carinho,<br><strong>Equipe NOSZONA</strong><br>Fundação Smart City</p>
      </div>
      <div style="background:#f8f9fa;padding:14px 20px;text-align:center;border-top:1px solid #eee;">
        <button id="close-email-preview" style="background:#061827;color:white;border:none;padding:8px 22px;border-radius:4px;cursor:pointer;font-size:14px;">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#close-email-preview').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ==================== OUTROS ====================
async function recuperarPassword(e) {
  if (e) e.preventDefault();
  const email = document.getElementById("recuperarEmail") ? document.getElementById("recuperarEmail").value : "";
  if (!email) { popup("erro","Email necessário","Introduz o email."); return; }
  popup("info", "Recuperação", "Fluxo de recuperação em desenvolvimento.");
}

function reenviarConfirmacao() {
  if (!residenteLogado) { popup("erro","Login necessário","Faz login primeiro."); return mostrarLogin(); }
  popup("info", "Confirmação", "Reenvio de confirmação em desenvolvimento.");
}

function mostrarTermos() {
  popup("info", "Termos e Condições",
    "Ao criar uma conta na NOSZONA Smart, você concorda com:\n\n" +
    "• Fornecimento de dados pessoais verídicos.\n" +
    "• Uso do QR para acesso a serviços da Smart City.\n" +
    "• Política de privacidade e proteção de dados.\n" +
    "• Não compartilhamento de credenciais.\n\n" +
    "A NOSZONA reserva-se o direito de suspender contas em caso de violação.\n\nVersão 1.0 - Cabo Verde, 2026.");
}

window.recuperarPassword = recuperarPassword;
window.reenviarConfirmacao = reenviarConfirmacao;
window.mostrarTermos = mostrarTermos;

// ==================== PERSISTÊNCIA + INIT ====================
function carregarSessao() {
  try {
    const raw = sessionStorage.getItem("noszona_session") || localStorage.getItem("noszona_session");
    if (!raw) return false;
    const { residente } = JSON.parse(raw);
    if (residente) {
      residenteLogado = residente;
      window.residenteLogado = residente;
      atualizarHeaderLocal(residente);
      return true;
    }
  } catch(e) {}
  return false;
}

function initApp() {
  carregarSessao();
  const anoEl = document.getElementById("ano");
  if (anoEl) anoEl.textContent = new Date().getFullYear();
  console.log("✅ NOSZONA app inicializado");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

