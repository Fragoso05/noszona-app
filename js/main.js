// =====================================================
// MAIN.JS - VERSÃO COMPLETA FUNCIONAL
// =====================================================

console.log("✅ NOSZONA carregado");

// Variáveis globais (declaradas cedo para evitar problemas de timing/TDZ em scripts clássicos)
let residenteLogado = null;
let qrTimerId = null;
let qrCountdownId = null;

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
// Sem qualquer aviso/confirmacao. Se a pessoa clicar "Sair", faz logout imediatamente.
window.logout = function() {
  // limpa timers do QR
  if (qrTimerId) { clearTimeout(qrTimerId); qrTimerId = null; }
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
          uid: "demo-" + Math.random().toString(36).slice(2, 10),
          email: (username || "demo") + "@exemplo.com",
          emailConfirmado: false
        }
      };
    }

    if (data.sucesso) {
      residenteLogado = data.residente;
      window.residenteLogado = residenteLogado;

      // persist session:
      // - always to sessionStorage (current browser session)
      // - to localStorage only if "lembrar" checked (persist across restarts)
      try {
        const sessionData = JSON.stringify({ residente: residenteLogado });
        sessionStorage.setItem("noszona_session", sessionData);
        if (lembrar) {
          localStorage.setItem("noszona_session", sessionData);
        }
      } catch(e) {}

      // switch header to logged state (post-login fix)
      const ctasDeslogado = document.getElementById("ctasDeslogado");
      const ctasLogado = document.getElementById("ctasLogado");
      if (ctasDeslogado) ctasDeslogado.style.display = "none";
      if (ctasLogado) ctasLogado.style.display = "flex";
      const greetingEl = document.getElementById("userGreeting");
      if (ctasLogado && greetingEl) {
        const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
        greetingEl.textContent = `Óla, ${primeiroNome}`;
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
    greetingEl.textContent = `Óla, ${primeiroNome}`;
  }

  esconderTudo();
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("dashboard").scrollIntoView({ behavior: "smooth" });

  renderizarDashboard();
};

function renderizarDashboard() {
  const r = residenteLogado || {};

  // Preenche os dados (inclui info extra se existir)
  let extra = "";
  if (r.email) {
    extra += `<div class="stat-box"><span>Email</span><strong>${escapeHtml(r.email)}</strong></div>`;
  }
  if (r.cartaoPedido) {
    const data = r.cartaoPedidoEm ? new Date(r.cartaoPedidoEm).toLocaleDateString("pt-PT") : "hoje";
    extra += `<div class="stat-box"><span>Cartão Físico</span><strong style="color:#0ea472">Pedido ${data}</strong></div>`;
  }

  document.getElementById("dadosConta").innerHTML = `
    <div class="stat-box"><span>Nome</span><strong>${escapeHtml(r.nome || "Utilizador")}</strong></div>
    <div class="stat-box"><span>Pacote</span><strong>${escapeHtml(r.pacote || "—")}</strong></div>
    <div class="stat-box"><span>Saldo</span><strong>${r.saldo ?? 0} CVE</strong></div>
    <div class="stat-box"><span>Swipes</span><strong>${r.swipes ?? 0}</strong></div>
    <div class="stat-box"><span>Estado</span><strong><span class="chip-active">Ativo</span></strong></div>
    ${extra}
  `;

  // controla o banner de email (demo)
  const banner = document.getElementById("bannerEmailNaoConfirmado");
  if (banner) {
    banner.style.display = (r.emailConfirmado === false) ? "block" : "none";
  }

  // Inicia o QR Code
  iniciarQRRotativo();
}

// ==================== QR CODE ====================

function iniciarQRRotativo() {
  if (qrTimerId) clearTimeout(qrTimerId);
  if (qrCountdownId) clearInterval(qrCountdownId);

  atualizarQR();
  // usa timeout recursivo para maior estabilidade nos 30s exatos (evita drift do interval)
  function scheduleNext() {
    qrTimerId = setTimeout(() => {
      atualizarQR();
      scheduleNext();
    }, 30000);
  }
  scheduleNext();

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

  // feedback visual simples (sem depender de CSS extra)
  const qrCard = container.closest('.qr-card');
  if (qrCard) {
    const origBoxShadow = qrCard.style.boxShadow || '';
    qrCard.style.transition = 'box-shadow 0.25s ease, background 0.25s ease';
    qrCard.style.boxShadow = '0 0 12px rgba(0, 195, 227, 0.6)';
    setTimeout(() => {
      if (qrCard) {
        qrCard.style.boxShadow = origBoxShadow;
      }
    }, 650);
  }
}

function escapeHtml(unsafe) {
  return String(unsafe || "").replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// ==================== STUBS para handlers que ainda não têm impl completa (evita crashes em cliques)
window.registar = async function(e) {
  if (e) e.preventDefault();

  const form = document.getElementById("formRegisto");
  if (!form) {
    popup("erro", "Erro", "Formulário de registo não encontrado.");
    return;
  }

  setLoading(true);

  try {
    // recolhe dados do form de forma segura
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : "";
    };

    const userData = {
      nome: getVal("nome"),
      dataNascimento: getVal("dataNascimento"),
      nacionalidade: getVal("nacionalidade"),
      documento: getVal("documento"),
      telefone: getVal("telefone"),
      email: getVal("email"),
      morada: getVal("morada"),
      municipio: getVal("municipio"),
      username: getVal("username"),
      // password não guardamos por segurança na simulação
      pacote: getVal("pacote") || "Pacote 2",
      // dados para demo/pós-login
      saldo: 0,
      swipes: 0,
      uid: "user-" + Date.now().toString(36),
      emailConfirmado: false,
      registadoEm: new Date().toISOString()
    };

    // validação básica (além do HTML required)
    const obrigatorios = ["nome", "dataNascimento", "nacionalidade", "documento", "telefone", "email", "morada", "municipio", "username", "pacote"];
    for (const campo of obrigatorios) {
      if (!userData[campo]) {
        popup("erro", "Campos obrigatórios", "Por favor preenche todos os campos assinalados.");
        setLoading(false);
        return;
      }
    }

    if (userData.username.length < 3) {
      popup("erro", "Username inválido", "O username deve ter pelo menos 3 caracteres.");
      setLoading(false);
      return;
    }

    // check terms and conditions
    const termos = document.getElementById("termos");
    const erroTermos = document.getElementById("erro-termos");
    if (erroTermos) {
      erroTermos.textContent = "";
      erroTermos.classList.remove("visible");
    }
    if (!termos || !termos.checked) {
      if (erroTermos) {
        erroTermos.textContent = "Obrigatório aceitar os Termos e Condições.";
        erroTermos.classList.add("visible");
      }
      popup("erro", "Termos e Condições", "É obrigatório aceitar os Termos e Condições para criar a conta.");
      setLoading(false);
      return;
    }

    // simula "guardar" no "backend" usando localStorage
    let registered = [];
    try {
      registered = JSON.parse(localStorage.getItem("noszona_registered_users") || "[]");
    } catch (e) { registered = []; }

    // evita duplicados por username
    registered = registered.filter(u => u.username !== userData.username);
    registered.push(userData);
    localStorage.setItem("noszona_registered_users", JSON.stringify(registered));

    // guarda também como sessão atual (simula login após registo)
    residenteLogado = userData;
    window.residenteLogado = userData;

    // persiste (sempre sessionStorage + local para conveniência na sim de registo)
    try {
      const sessionData = JSON.stringify({ residente: userData });
      sessionStorage.setItem("noszona_session", sessionData);
      localStorage.setItem("noszona_session", sessionData);
    } catch (e) {}

    popup("sucesso", "Registo simulado com sucesso!", "Conta criada! Os teus dados foram guardados localmente. A redirecionar para o dashboard...");

    // limpa o form
    form.reset();

    // vai direto para o dashboard (simula após "pagamento")
    setTimeout(() => {
      setLoading(false);
      mostrarDashboard();
    }, 1400);

  } catch (err) {
    console.error(err);
    popup("erro", "Erro no registo", "Ocorreu um problema ao processar o teu registo (simulação). Tenta novamente.");
    setLoading(false);
  }
};

window.recarregar = async function(e) {
  if (e) e.preventDefault();
  if (!residenteLogado) {
    popup("erro", "Login necessário", "Faz login primeiro.");
    return mostrarLogin();
  }

  setLoading(true);

  try {
    const tipo = document.getElementById("tipoRecarga") ? document.getElementById("tipoRecarga").value : "saldo";
    const valorEl = document.getElementById("valorRecarga");
    const valor = parseInt(valorEl ? valorEl.value : "0", 10) || 0;

    if (valor <= 0) {
      popup("erro", "Valor inválido", "Introduz um valor positivo.");
      setLoading(false);
      return;
    }

    if (tipo === "saldo") {
      residenteLogado.saldo = (residenteLogado.saldo || 0) + valor;
    } else {
      residenteLogado.swipes = (residenteLogado.swipes || 0) + valor;
    }

    // update window copy
    window.residenteLogado = residenteLogado;

    // persiste a atualização (para refresh com demo)
    try {
      localStorage.setItem("noszona_session", JSON.stringify({ residente: residenteLogado }));
    } catch (e) {}

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
  } catch (err) {
    console.error(err);
    popup("erro", "Erro na recarga", "Não foi possível processar a recarga simulada.");
  } finally {
    setLoading(false);
  }
};

window.solicitarCartao = function() {
  if (!residenteLogado) {
    popup("erro", "Login necessário", "Faz login primeiro.");
    return mostrarLogin();
  }

  // marca como pedido
  residenteLogado.cartaoPedido = true;
  residenteLogado.cartaoPedidoEm = new Date().toISOString();

  window.residenteLogado = residenteLogado;

  // persiste
  try {
    localStorage.setItem("noszona_session", JSON.stringify({ residente: residenteLogado }));
  } catch (e) {}

  // atualiza a UI da secção do cartão no dashboard (se visível)
  const cardBox = document.querySelector(".card-req-box");
  if (cardBox) {
    const data = new Date(residenteLogado.cartaoPedidoEm).toLocaleDateString("pt-PT");
    cardBox.innerHTML = `
      <h3>Cartão Físico RFID</h3>
      <p style="color:#0ea472">✅ Pedido enviado em ${data}. Entraremos em contacto em breve.</p>
    `;
  }

  popup("sucesso", "Pedido enviado", "O teu pedido de cartão físico RFID foi registado com sucesso (simulação). Obrigado!");
};

window.loginWithGoogle = function() {
  // LOGIN com Google: APENAS para contas já registadas.
  // Se não estiver registado, mostra aviso claro "Conta não registada" (sem criar conta nem pedir campos).
  popup("info", "Conectando com Google", "Abrindo janela de autenticação do Google (simulação)...");

  setTimeout(() => {
    const googleEmail = prompt("Simulação Google: Insere o email da tua conta Google:", "teuemail@gmail.com");
    if (!googleEmail || !googleEmail.includes("@")) {
      popup("erro", "Cancelado", "Login com Google cancelado ou email inválido.");
      return;
    }

    // Carrega usuários registados
    let registered = [];
    try {
      registered = JSON.parse(localStorage.getItem("noszona_registered_users") || "[]");
    } catch (e) { registered = []; }

    // Procura usuário existente por email
    let existing = registered.find(u => (u.email || "").toLowerCase() === googleEmail.toLowerCase());

    if (existing) {
      // Login existente - direto, sem qualquer pedido de campos adicionais
      residenteLogado = existing;
      window.residenteLogado = residenteLogado;

      try {
        const sessionData = JSON.stringify({ residente: residenteLogado });
        sessionStorage.setItem("noszona_session", sessionData);
        localStorage.setItem("noszona_session", sessionData);
      } catch(e) {}

      // Atualiza header
      const ctasDeslogado = document.getElementById("ctasDeslogado");
      const ctasLogado = document.getElementById("ctasLogado");
      if (ctasDeslogado) ctasDeslogado.style.display = "none";
      if (ctasLogado) ctasLogado.style.display = "flex";
      const greetingEl = document.getElementById("userGreeting");
      if (ctasLogado && greetingEl) {
        const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
        greetingEl.textContent = `Óla, ${primeiroNome}`;
      }

      popup("sucesso", "Login com Google", `Bem-vindo de volta, ${residenteLogado.nome || googleEmail}!`);
      mostrarDashboard();
    } else {
      // Não registado -> aviso específico, NÃO cria conta, NÃO pede preenchimento de campos
      popup("erro", "Conta não registada", "A sua conta Google não está registada no sistema NOSZONA. Por favor, crie primeiro a sua conta usando o formulário de Registo.");
    }
  }, 900);
};

window.registerWithGoogle = function() {
  // REGISTO com Google: cria conta automaticamente (sem popups de "campos obrigatórios").
  // Deriva nome/username do email + usa pacote selecionado no form (se houver).
  popup("info", "Conectando com Google", "Abrindo janela de autenticação do Google para registo (simulação)...");

  setTimeout(() => {
    const googleEmail = prompt("Simulação Google: Insere o email da tua conta Google para registo:", "teuemail@gmail.com");
    if (!googleEmail || !googleEmail.includes("@")) {
      popup("erro", "Cancelado", "Registo com Google cancelado ou email inválido.");
      return;
    }

    let registered = [];
    try {
      registered = JSON.parse(localStorage.getItem("noszona_registered_users") || "[]");
    } catch (e) { registered = []; }

    let existing = registered.find(u => (u.email || "").toLowerCase() === googleEmail.toLowerCase());

    if (existing) {
      popup("info", "Já registado", "Esta conta Google já tem registo. A iniciar sessão...");
      // auto-login
      residenteLogado = existing;
      window.residenteLogado = residenteLogado;
      try {
        const sessionData = JSON.stringify({ residente: residenteLogado });
        sessionStorage.setItem("noszona_session", sessionData);
        localStorage.setItem("noszona_session", sessionData);
      } catch(e) {}
      const ctasDeslogado = document.getElementById("ctasDeslogado");
      const ctasLogado = document.getElementById("ctasLogado");
      if (ctasDeslogado) ctasDeslogado.style.display = "none";
      if (ctasLogado) ctasLogado.style.display = "flex";
      const greetingEl = document.getElementById("userGreeting");
      if (ctasLogado && greetingEl) {
        const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
        greetingEl.textContent = `Óla, ${primeiroNome}`;
      }
      mostrarDashboard();
      return;
    }

    // Criação automática (sem prompts manuais de campos obrigatórios)
    const emailLocal = googleEmail.split("@")[0];
    let nome = emailLocal.replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    let username = emailLocal.toLowerCase().replace(/[^a-z0-9._]/g, "");
    if (!username) username = "user";

    // Garante username único
    let baseUsername = username;
    let counter = 1;
    while (registered.some(u => u.username === username)) {
      username = baseUsername + counter;
      counter++;
    }

    // Usa o pacote escolhido no form de registo (se a secção estiver visível)
    const pacoteSel = document.getElementById("pacote");
    const pacote = (pacoteSel && pacoteSel.value) || "Pacote 2";

    const newUser = {
      nome: nome,
      email: googleEmail,
      username: username,
      pacote: pacote,
      saldo: 0,
      swipes: 0,
      uid: "google-" + Date.now(),
      emailConfirmado: true,
      registadoEm: new Date().toISOString(),
      viaGoogle: true
    };

    registered.push(newUser);
    localStorage.setItem("noszona_registered_users", JSON.stringify(registered));

    // Login automático após registo Google
    residenteLogado = newUser;
    window.residenteLogado = residenteLogado;

    try {
      const sessionData = JSON.stringify({ residente: residenteLogado });
      sessionStorage.setItem("noszona_session", sessionData);
      localStorage.setItem("noszona_session", sessionData);
    } catch(e) {}

    // Atualiza header
    const ctasDeslogado = document.getElementById("ctasDeslogado");
    const ctasLogado = document.getElementById("ctasLogado");
    if (ctasDeslogado) ctasDeslogado.style.display = "none";
    if (ctasLogado) ctasLogado.style.display = "flex";
    const greetingEl = document.getElementById("userGreeting");
    if (ctasLogado && greetingEl) {
      const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
      greetingEl.textContent = `Óla, ${primeiroNome}`;
    }

    // Limpa form de registo se estiver aberto
    const formReg = document.getElementById("formRegisto");
    if (formReg) formReg.reset();

    popup("sucesso", "Registo com Google", `Conta criada com sucesso via Google! Bem-vindo, ${nome}!`);
    mostrarDashboard();
  }, 900);
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

window.mostrarTermos = function() {
  popup("info", "Termos e Condições", 
    "Ao criar uma conta na NOSZONA Smart, você concorda com:\n\n" +
    "• Fornecimento de dados pessoais verídicos.\n" +
    "• Uso do QR para acesso a serviços da Smart City.\n" +
    "• Política de privacidade e proteção de dados (LGPD equivalente).\n" +
    "• Não compartilhamento de credenciais.\n\n" +
    "A NOSZONA reserva-se o direito de suspender contas em caso de violação.\n\n" +
    "Versão 1.0 - Cabo Verde, 2026."
  );
};

// ==================== PERSISTÊNCIA SIMPLES (demo + real) ====================
function carregarSessao() {
  try {
    // prefer sessionStorage (current session), fallback to localStorage (persisted)
    const raw = sessionStorage.getItem("noszona_session") || localStorage.getItem("noszona_session");
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
        greetingEl.textContent = `Óla, ${primeiroNome}`;
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