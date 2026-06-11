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

window.logout = function() {
  if (!confirm("Queres mesmo terminar a sessão?")) return;

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

      // Prefer the central session module for persistence (helps consistency with carregarSessao from session.js)
      if (typeof window.guardarSessao === 'function') {
        window.guardarSessao(residenteLogado, data.token || null, lembrar);
      } else {
        // fallback to direct persist
        try {
          const sessionData = JSON.stringify({ residente: residenteLogado });
          sessionStorage.setItem("noszona_session", sessionData);
          if (lembrar) {
            localStorage.setItem("noszona_session", sessionData);
          }
        } catch(e) {}
      }

      // switch header to logged state (post-login fix) - prefer central if available
      if (typeof window.atualizarHeader === 'function') {
        window.atualizarHeader();
      } else {
        const ctasDeslogado = document.getElementById("ctasDeslogado");
        const ctasLogado = document.getElementById("ctasLogado");
        if (ctasDeslogado) ctasDeslogado.style.display = "none";
        if (ctasLogado) ctasLogado.style.display = "flex";
        const greetingEl = document.getElementById("userGreeting");
        if (ctasLogado && greetingEl) {
          const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
          greetingEl.textContent = `Olá, ${primeiroNome}`;
        }
      }

      const isDemo = !data.residente || data.residente.uid?.startsWith("demo-");
      popup("sucesso", "Login efetuado com sucesso!", isDemo ? "Modo DEMO (API offline) - Bem-vindo de volta!" : "Bem-vindo de volta!");
      esconderTudo(); // garante que o formulário de login some
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
  const user = (typeof window.getResidenteLogado === 'function' ? window.getResidenteLogado() : null) || residenteLogado;
  if (!user) {
    popup("erro", "Login necessário", "Faz login primeiro.");
    return mostrarLogin();
  }

  // ensure header is in logged state (prefer central session module)
  if (typeof window.atualizarHeader === 'function') {
    window.atualizarHeader();
  } else {
    const ctasDeslogado = document.getElementById("ctasDeslogado");
    const ctasLogado = document.getElementById("ctasLogado");
    if (ctasDeslogado) ctasDeslogado.style.display = "none";
    if (ctasLogado) ctasLogado.style.display = "flex";
    const greetingEl = document.getElementById("userGreeting");
    if (ctasLogado && greetingEl && user) {
      const primeiroNome = (user.nome || "").split(" ")[0];
      greetingEl.textContent = `Olá, ${primeiroNome}`;
    }
  }

  esconderTudo();
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("dashboard").scrollIntoView({ behavior: "smooth" });

  renderizarDashboard();
};

function renderizarDashboard() {
  const user = (typeof window.getResidenteLogado === 'function' ? window.getResidenteLogado() : null) || residenteLogado;
  const r = user || {};

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

  const currentQRUser = (typeof window.getResidenteLogado === 'function' ? window.getResidenteLogado() : null) || residenteLogado;
  const payload = {
    uid: currentQRUser?.uid || "demo123",
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

<<<<<<< Updated upstream
    const form = document.getElementById("formRegisto");
    if (!form) {
        popup("erro", "Erro", "Formulário de registo não encontrado.");
=======
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
      password: getVal("password"),
      pacote: getVal("pacote") || "Pacote 2",
      // dados para demo/pós-login
      saldo: 0,
      swipes: 0,
      uid: "user-" + Date.now().toString(36),
      emailConfirmado: false,
      registadoEm: new Date().toISOString()
    };

    // validação básica (além do HTML required)
    const obrigatorios = [
      "nome",
      "dataNascimento",
      "nacionalidade",
      "documento",
      "telefone",
      "email",
      "morada",
      "municipio",
      "username",
      "password",
      "pacote"
    ];

    for (const campo of obrigatorios) {
      if (!userData[campo]) {
        popup("erro", "Campos obrigatórios", "Por favor preenche todos os campos assinalados.");
        setLoading(false);
>>>>>>> Stashed changes
        return;
    }

<<<<<<< Updated upstream
    setLoading(true);

    try {
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : "";
        };

        // === 1. Recolher dados ===
        const userData = {
            nome: getVal("nome"),
            dataNascimento: getVal("dataNascimento"),
            nacionalidade: getVal("nacionalidade"),
            documento: getVal("documento"),
            telefone: getVal("telefone"),
            email: getVal("email").toLowerCase(),
            morada: getVal("morada"),
            municipio: getVal("municipio"),
            username: getVal("username"),
            password: getVal("password"),
            pacote: getVal("pacote") || "Pacote 2"
        };

        // === 2. Validações ===
        const obrigatorios = ["nome", "dataNascimento", "nacionalidade", "documento", 
                              "telefone", "email", "morada", "municipio", "username", "password"];
=======
    if (userData.username.length < 3) {
      popup("erro", "Username inválido", "O username deve ter pelo menos 3 caracteres.");
      setLoading(false);
      return;
    }

    if (userData.password.length < 3) {
      popup("erro", "Password inválida", "A password deve ter pelo menos 3 caracteres.");
      setLoading(false);
      return;
    }

    if (!userData.email.includes("@")) {
      popup("erro", "Email inválido", "Introduz um email válido.");
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

    // Registo real no backend Node-RED
    const regEndpoint = "https://violet-beaver-178312.hostingersite.com/api/residentes/registar";

    const regResp = await fetch(regEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });

    let regData;

    try {
      regData = await regResp.json();
    } catch (jsonErr) {
      console.error("Resposta inválida do Node-RED:", jsonErr);
      popup("erro", "Erro no servidor", "O Node-RED respondeu, mas não devolveu JSON válido.");
      setLoading(false);
      return;
    }

    console.log("Resposta do registo Node-RED:", regData);

    if (!regResp.ok || !regData || !regData.sucesso) {
      popup(
        "erro",
        "Registo falhou",
        regData?.mensagem || "O Node-RED não confirmou o registo. Verifica o debug do Node-RED."
      );
      setLoading(false);
      return;
    }

    const returnedResidente = regData.residente || userData;

    // guarda para o Google demo fallback
    try {
      let registered = [];
      try {
        registered = JSON.parse(localStorage.getItem("noszona_registered_users") || "[]");
      } catch (e) {
        registered = [];
      }

      registered = registered.filter(u => u.username !== userData.username);
      registered.push(returnedResidente);
      localStorage.setItem("noszona_registered_users", JSON.stringify(registered));
    } catch (e) {}
>>>>>>> Stashed changes

        for (const campo of obrigatorios) {
            if (!userData[campo]) {
                popup("erro", "Campos obrigatórios", `Por favor preenche o campo: ${campo}`);
                setLoading(false);
                return;
            }
        }

        if (userData.username.length < 3) {
            popup("erro", "Username inválido", "O username deve ter pelo menos 3 caracteres.");
            setLoading(false);
            return;
        }

        if (userData.password.length < 6) {
            popup("erro", "Password inválida", "A password deve ter pelo menos 6 caracteres.");
            setLoading(false);
            return;
        }

<<<<<<< Updated upstream
        if (!userData.email.includes("@") || !userData.email.includes(".")) {
            popup("erro", "Email inválido", "Introduz um email válido.");
            setLoading(false);
            return;
        }

        // Termos e Condições
        const termos = document.getElementById("termos");
        if (!termos || !termos.checked) {
            popup("erro", "Termos e Condições", "É obrigatório aceitar os Termos e Condições.");
            setLoading(false);
            return;
        }

        // Envia a password em texto simples (plain) para o Node-RED,
        // exatamente como o endpoint de login espera.
        // O backend (Node-RED) é responsável por fazer o hash/armazenamento seguro.
        const dataToSend = {
            ...userData
            // password fica em plain (userData.password)
        };

        // === 4. ENVIAR PARA O NODE-RED ===
        const response = await fetch("https://violet-beaver-178312.hostingersite.com/api/residentes/registar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToSend)
        });

        const data = await response.json();
        console.log("Resposta do registo:", data);

        if (!response.ok || !data.sucesso) {
            popup("erro", "Registo falhou", data.mensagem || "Erro ao criar a conta no servidor.");
            setLoading(false);
            return;
        }

        // === 5. SUCESSO ===
        popup("sucesso", "Conta criada!", 
            data.mensagem || "Registo efetuado com sucesso. Verifica o teu email.");

        form.reset();
        setLoading(false);

        // Redirecionar para pagamento ou login
        if (data.paymentUrl) {
            setTimeout(() => {
                window.location.href = data.paymentUrl;
            }, 1500);
        } else {
            setTimeout(() => {
                mostrarLogin();
            }, 1800);
        }

    } catch (err) {
        console.error("Erro no registo:", err);
        popup("erro", "Erro de ligação", "Não foi possível comunicar com o servidor.");
        setLoading(false);
    }
=======
    popup(
      "sucesso",
      "Registo efetuado com sucesso!",
      "Conta criada! Um email de boas-vindas foi enviado para " + returnedResidente.email
    );

    setLoading(false);
    mostrarDashboard();

  } catch (err) {
    console.error("Erro no registo:", err);
    popup(
      "erro",
      "Erro de ligação",
      "Não foi possível comunicar com o Node-RED. O registo não foi gravado no MySQL."
    );
    setLoading(false);
  }
>>>>>>> Stashed changes
};

window.recarregar = function(e) {
    if (e) e.preventDefault();

    if (!residenteLogado) {
        popup("erro", "Login necessário", "Faz login primeiro.");
        return mostrarLogin();
    }

    const tipo = document.getElementById("tipoRecarga") ? document.getElementById("tipoRecarga").value : "saldo";
    const valorEl = document.getElementById("valorRecarga");
    const valor = Number(valorEl ? valorEl.value : "0");

    if (!valor || valor <= 0) {
        popup("erro", "Valor inválido", "Introduz um valor positivo.");
        return;
    }

    const endpointSisp = "https://violet-beaver-178312.hostingersite.com/api/pagamento/iniciar";

    const dadosPagamento = {
        residenteId: residenteLogado.id || residenteLogado.uid || "",
        pacote: residenteLogado.pacote || "Recarga",
        tipo: tipo,
        valor: valor,
        email: "noszonasmart@gmail.com",
        cidade: residenteLogado.municipio || "Praia",
        municipio: residenteLogado.municipio || "Praia",
        morada: residenteLogado.morada || "Cabo Verde",
        codigoPostal: "7600"
    };

    console.log("A abrir pagamento SISP por formulário POST...");
    console.log(dadosPagamento);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = endpointSisp;
    form.target = "_blank";
    form.style.display = "none";

    Object.keys(dadosPagamento).forEach(function(key) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = dadosPagamento[key];
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    popup(
        "sucesso",
        "Pagamento aberto",
        "Abrimos o portal seguro Vinti4 numa nova janela."
    );
};
window.solicitarCartao = function() {
  const loggedUser = (typeof window.getResidenteLogado === 'function' ? window.getResidenteLogado() : null) || residenteLogado;
  if (!loggedUser) {
    popup("erro", "Login necessário", "Faz login primeiro.");
    return mostrarLogin();
  }

  // marca como pedido (usa o usuário atual)
  loggedUser.cartaoPedido = true;
  loggedUser.cartaoPedidoEm = new Date().toISOString();

  // sync de volta para a variável local se necessário
  residenteLogado = loggedUser;
  window.residenteLogado = loggedUser;

  // persiste via central se possível, senão fallback
  if (typeof window.guardarSessao === 'function') {
    window.guardarSessao(loggedUser, null, false);
  } else {
    try {
      localStorage.setItem("noszona_session", JSON.stringify({ residente: loggedUser }));
    } catch (e) {}
  }

  // atualiza a UI da secção do cartão no dashboard (se visível)
  const cardBox = document.querySelector(".card-req-box");
  if (cardBox) {
    const data = new Date(loggedUser.cartaoPedidoEm).toLocaleDateString("pt-PT");
    cardBox.innerHTML = `
      <h3>Cartão Físico RFID</h3>
      <p style="color:#0ea472">✅ Pedido enviado em ${data}. Entraremos em contacto em breve.</p>
    `;
  }

  popup("sucesso", "Pedido enviado", "O teu pedido de cartão físico RFID foi registado com sucesso (simulação). Obrigado!");
};

window.loginWithGoogle = function() {
  // Cria um popup estilo Google. Agora faz login REAL chamando o endpoint /api/residentes/google-login (email + password da conta registada)
  const existing = document.getElementById('google-login-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'google-login-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
    z-index: 99999; font-family: 'Roboto', Arial, sans-serif;
  `;

  modal.innerHTML = `
    <div style="background: #fff; width: 420px; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); overflow: hidden;">
      <!-- Header Google -->
      <div style="padding: 28px 28px 16px; text-align: center; border-bottom: 1px solid #dadce0;">
        <div style="display: flex; justify-content: center; align-items: center; gap: 4px; margin-bottom: 12px;">
          <span style="font-size: 32px; font-weight: 500; color: #4285f4;">G</span>
          <span style="font-size: 32px; font-weight: 500; color: #ea4335;">o</span>
          <span style="font-size: 32px; font-weight: 500; color: #fbbc05;">o</span>
          <span style="font-size: 32px; font-weight: 500; color: #4285f4;">g</span>
          <span style="font-size: 32px; font-weight: 500; color: #34a853;">l</span>
          <span style="font-size: 32px; font-weight: 500; color: #ea4335;">e</span>
        </div>
        <h2 style="margin: 0; font-size: 22px; font-weight: 400; color: #202124;">Sign in</h2>
        <p style="margin: 4px 0 0; font-size: 14px; color: #5f6368;">Use your Google Account</p>
      </div>

      <div style="padding: 24px 28px;">
        <!-- Step 1: Email -->
        <div id="google-step-1">
          <input id="google-email-input" type="email" placeholder="Email or phone" 
                 style="width: 100%; padding: 12px 14px; border: 1px solid #dadce0; border-radius: 4px; font-size: 16px; outline: none; margin-bottom: 8px;">
          <div style="font-size: 13px; color: #1a73e8; margin-bottom: 24px;">
            <a href="#" style="text-decoration: none; color: #1a73e8;">Forgot email?</a>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
            <a href="#" id="google-create-account" style="color: #1a73e8; text-decoration: none;">Create account</a>
            <button id="google-next-btn" style="background: #1a73e8; color: white; border: none; padding: 8px 24px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer;">Next</button>
          </div>
        </div>

        <!-- Step 2: Password -->
        <div id="google-step-2" style="display: none;">
          <div style="margin-bottom: 12px;">
            <div id="google-email-display" style="font-size: 14px; color: #202124; font-weight: 500;"></div>
            <a href="#" id="google-back-email" style="font-size: 13px; color: #1a73e8; text-decoration: none;">Not your account?</a>
          </div>
          <input id="google-password-input" type="password" placeholder="Password da tua conta NOSZONA" 
                 style="width: 100%; padding: 12px 14px; border: 1px solid #dadce0; border-radius: 4px; font-size: 16px; outline: none; margin-bottom: 6px;">
          <div style="font-size: 11px; color: #5f6368; margin-bottom: 12px;">
            Usa a password que criaste ao registar-te com este email.
          </div>
          <div style="margin-bottom: 20px;">
            <label style="font-size: 14px; color: #5f6368; display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="google-show-password"> Show password
            </label>
          </div>
          <div style="text-align: right;">
            <button id="google-signin-btn" style="background: #1a73e8; color: white; border: none; padding: 8px 24px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer;">Sign in</button>
          </div>
        </div>
      </div>

      <div style="background: #f8f9fa; padding: 16px 28px; font-size: 12px; color: #5f6368; border-top: 1px solid #dadce0;">
        Autenticação NOSZONA • Para contas registadas com email Google
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Elements
  const step1 = modal.querySelector('#google-step-1');
  const step2 = modal.querySelector('#google-step-2');
  const emailInput = modal.querySelector('#google-email-input');
  const nextBtn = modal.querySelector('#google-next-btn');
  const passwordInput = modal.querySelector('#google-password-input');
  const signinBtn = modal.querySelector('#google-signin-btn');
  const emailDisplay = modal.querySelector('#google-email-display');
  const backLink = modal.querySelector('#google-back-email');
  const showPassCheckbox = modal.querySelector('#google-show-password');
  const createAccountLink = modal.querySelector('#google-create-account');

  // "Create account" dentro do popup Google -> fecha e abre o registo MANUAL do site (único caminho para criar conta)
  if (createAccountLink) {
    createAccountLink.onclick = (e) => {
      e.preventDefault();
      modal.remove();
      // Abre o formulário normal de registo (que exige termos + todos os campos)
      // NUNCA usa o fluxo Google para criar conta
      if (typeof window.mostrarRegisto === "function") {
        window.mostrarRegisto("Pacote 2");
      }
    };
  }

  // Step 1 → Step 2 (agora verifica primeiro se o email já foi registado)
  nextBtn.onclick = async () => {
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email');
      return;
    }

    // Chama o backend para verificar se o email já existe (antes de pedir a password)
    const checkEndpoint = "https://violet-beaver-178312.hostingersite.com/api/residentes/google-login";
    try {
      setLoading(true);
      const resp = await fetch(checkEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, checkOnly: true })
      });
      const checkData = await resp.json();

      if (checkData && checkData.exists === false) {
        setLoading(false);
        popup("erro", "Conta não registada", checkData.mensagem || "Esta conta Google ainda não está registada no NOSZONA. Por favor efectua o registo através do formulário normal primeiro.");
        return;
      }

      // Existe → prossegue para o passo da password
      emailDisplay.textContent = email;
      step1.style.display = 'none';
      step2.style.display = 'block';
      passwordInput.focus();
    } catch (e) {
      // Em caso de erro de rede, permite prosseguir (o submit final vai falhar ou usar demo)
      console.warn("Check email falhou, permitindo prosseguir para demo/fallback", e);
      emailDisplay.textContent = email;
      step1.style.display = 'none';
      step2.style.display = 'block';
      passwordInput.focus();
    } finally {
      setLoading(false);
    }
  };

  // Back to email
  backLink.onclick = (e) => {
    e.preventDefault();
    step2.style.display = 'none';
    step1.style.display = 'block';
    emailInput.focus();
  };

  // Show/hide password
  showPassCheckbox.onchange = () => {
    passwordInput.type = showPassCheckbox.checked ? 'text' : 'password';
  };

  // Final Sign in (agora REAL - chama o endpoint /google-login com email + password)
  const handleSignIn = () => {
    const email = (emailDisplay.textContent || emailInput.value || "").trim();
    const pass = (passwordInput ? passwordInput.value : "").trim();
    if (!email) return;

    modal.remove(); // close Google popup

    // Chama a função real que faz fetch para o backend (com fallback demo)
    realGoogleLogin(email, pass);
  };

  signinBtn.onclick = handleSignIn;

  // Allow Enter key
  passwordInput.onkeydown = (e) => {
    if (e.key === 'Enter') handleSignIn();
  };

  // Close on outside click (optional)
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // Auto focus email
  setTimeout(() => emailInput.focus(), 100);
};

// =====================================================
// LOGIN GOOGLE REAL - Chama o endpoint do backend
// Agora faz verificação real de email + password no Node-RED / MySQL
// Se a conta foi registada (com password), permite o login usando essa password.
// Fallback para demo/localStorage quando a API não responde.
// =====================================================
async function realGoogleLogin(email, password) {
  if (!email || !password) {
    popup("erro", "Campos obrigatórios", "Introduz o email Google e a password da conta.");
    return;
  }

  const endpoint = "https://violet-beaver-178312.hostingersite.com/api/residentes/google-login";

  try {
    setLoading(true);

    let data;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      data = await response.json();
    } catch (fetchErr) {
      // Fallback DEMO (quando backend offline ou file://)
      console.warn("API Google login indisponível. Usando modo DEMO com localStorage.");
      let registered = [];
      try {
        registered = JSON.parse(localStorage.getItem("noszona_registered_users") || "[]");
      } catch(e) { registered = []; }

      const existing = registered.find(u => (u.email || "").toLowerCase() === email.toLowerCase());
      if (existing) {
        // Em demo, aceitamos qualquer password se o email estiver registado (para facilitar testes locais)
        data = {
          sucesso: true,
          mensagem: "Login com Google (DEMO)",
          residente: existing
        };
      } else {
        data = {
          sucesso: false,
          mensagem: "Conta não registada no modo DEMO. Regista-te primeiro pelo formulário normal."
        };
      }
    }

    if (data && data.sucesso) {
      residenteLogado = data.residente;
      window.residenteLogado = residenteLogado;

      // Persistir sessão (usamos ambas para conveniência no fluxo Google)
      try {
        const sessionData = JSON.stringify({ residente: residenteLogado });
        sessionStorage.setItem("noszona_session", sessionData);
        localStorage.setItem("noszona_session", sessionData);
      } catch(e) {}

      // Atualiza header (igual ao login normal)
      const ctasDeslogado = document.getElementById("ctasDeslogado");
      const ctasLogado = document.getElementById("ctasLogado");
      if (ctasDeslogado) ctasDeslogado.style.display = "none";
      if (ctasLogado) ctasLogado.style.display = "flex";
      const greetingEl = document.getElementById("userGreeting");
      if (ctasLogado && greetingEl) {
        const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
        greetingEl.textContent = `Olá, ${primeiroNome}`;
      }

      const isDemo = !data.residente || String(data.mensagem || "").toLowerCase().includes("demo");
      popup("sucesso", "Login com Google", isDemo ? "Modo DEMO - Bem-vindo!" : (data.mensagem || "Bem-vindo de volta!"));
      mostrarDashboard();
    } else {
      popup("erro", "Login Google falhou", data ? (data.mensagem || "Email ou password incorretos.") : "Erro desconhecido.");
    }
  } catch (err) {
    console.error(err);
    popup("erro", "Erro de ligação", "Não foi possível contactar o servidor de login Google.");
  } finally {
    setLoading(false);
  }
}

// Mantido para compatibilidade com código antigo / testes
function processGoogleAuth(googleEmail) {
  // Versão simplificada que agora delega para o real (sem password - só para fallback em testes)
  realGoogleLogin(googleEmail, "demo-ignore-pass");
}

// Simula o envio de email de boas-vindas após registro
function showWelcomeEmailPreview(userData) {
  const existing = document.getElementById('welcome-email-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'welcome-email-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
    z-index: 99999; font-family: Arial, sans-serif;
  `;

  const emailHTML = `
    <div style="background: #fff; width: 520px; max-width: 92%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); overflow: hidden;">
      <!-- Email header -->
      <div style="background: #f2f2f2; padding: 12px 20px; border-bottom: 1px solid #ddd; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <strong style="color: #333;">Noszona Smart City</strong><br>
          <span style="font-size: 12px; color: #666;">no-reply@noszona.cv</span>
        </div>
        <div style="text-align: right; font-size: 12px; color: #888;">
          Para: ${userData.email}<br>
          ${new Date().toLocaleDateString('pt-PT')}
        </div>
      </div>

      <div style="padding: 28px 32px; line-height: 1.6; color: #333;">
        <h3 style="margin-top: 0; color: #061827;">Bem-vindo à família NOSZONA!</h3>
        
        <p>Olá <strong>${userData.nome}</strong>,</p>
        
        <p>É com grande prazer que te damos as boas-vindas ao <strong>site Noszona</strong>.</p>
        
        <p>A partir de agora, fazes parte da <strong>família Fundação Smart City</strong>.</p>
        
        <p>Com a tua conta ativa, podes usufruir de todas as vantagens da Smart City de Cabo Verde: QR seguro, carteira virtual, acesso a eventos e muito mais.</p>
        
        <p>Obrigado por te juntares a nós. Juntos construímos uma cidade mais inteligente!</p>
        
        <p style="margin-top: 24px;">Com carinho,<br>
        <strong>Equipe NOSZONA</strong><br>
        Fundação Smart City</p>
      </div>

      <div style="background: #f8f9fa; padding: 14px 20px; text-align: center; border-top: 1px solid #eee;">
        <button id="close-email-preview" style="background: #061827; color: white; border: none; padding: 8px 22px; border-radius: 4px; cursor: pointer; font-size: 14px;">
          Fechar
        </button>
      </div>
    </div>
  `;

  modal.innerHTML = emailHTML;
  document.body.appendChild(modal);

  modal.querySelector('#close-email-preview').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

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