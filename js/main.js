// =====================================================
// MAIN.JS - NOSZONA corrigido
// Correção principal: o registo agora envia password para o Node-RED
// e não usa fallback localStorage quando o MySQL/Node-RED falha.
// =====================================================

console.log("✅ NOSZONA carregado - main.js corrigido");

const API_BASE = "https://violet-beaver-178312.hostingersite.com/api";

let residenteLogado = null;
let qrTimerId = null;
let qrCountdownId = null;

// ==================== UTILITÁRIOS ====================
function safeGet(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

function escapeHtml(unsafe) {
    return String(unsafe || "").replace(/[&<>\"']/g, function (m) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#039;"
        }[m];
    });
}

window.setLoading = function(v) {
    document.body.classList.toggle("loading", !!v);
};

window.popup = function(tipo, titulo, texto) {
    const icones = {
        sucesso: "✅",
        erro: "⚠️",
        info: "ℹ️"
    };

    const icone = icones[tipo] || "ℹ️";
    const el = document.createElement("div");
    el.className = "popup-overlay";
    el.innerHTML = `
        <div class="popup-card">
            <div class="popup-icon">${icone}</div>
            <h2>${escapeHtml(titulo)}</h2>
            <p>${escapeHtml(texto)}</p>
            <button class="popup-btn">OK</button>
        </div>
    `;

    const btn = el.querySelector(".popup-btn");
    if (btn) btn.onclick = () => el.remove();
    el.onclick = (e) => {
        if (e.target === el) el.remove();
    };
    document.body.appendChild(el);
};

// ==================== NAVEGAÇÃO ====================
window.esconderTudo = function() {
    ["registo", "login", "recuperar", "dashboard"].forEach(id => {
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

// ==================== REGISTO CORRIGIDO ====================
window.registar = async function(e) {
    if (e) e.preventDefault();

    const form = document.getElementById("formRegisto");
    if (!form) {
        popup("erro", "Erro", "Formulário de registo não encontrado.");
        return;
    }

    setLoading(true);

    try {
        const userData = {
            nome: safeGet("nome"),
            dataNascimento: safeGet("dataNascimento"),
            nacionalidade: safeGet("nacionalidade"),
            documento: safeGet("documento"),
            telefone: safeGet("telefone"),
            email: safeGet("email"),
            morada: safeGet("morada"),
            municipio: safeGet("municipio"),
            username: safeGet("username"),
            password: safeGet("password"),
            pacote: safeGet("pacote") || "Pacote 2"
        };

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
                popup("erro", "Campos obrigatórios", "Por favor preenche todos os campos obrigatórios.");
                setLoading(false);
                return;
            }
        }

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

        const response = await fetch(`${API_BASE}/residentes/registar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        let data;
        try {
            data = await response.json();
        } catch (jsonErr) {
            console.error("Resposta inválida do Node-RED:", jsonErr);
            popup("erro", "Erro no servidor", "O Node-RED respondeu, mas não devolveu JSON válido.");
            setLoading(false);
            return;
        }

        console.log("Resposta do registo:", data);

        if (!response.ok || !data.sucesso) {
            popup(
                "erro",
                "Registo falhou",
                data.mensagem || "O Node-RED não confirmou o registo. Verifica o debug do Node-RED."
            );
            setLoading(false);
            return;
        }

        const returnedResidente = data.residente || userData;

        residenteLogado = returnedResidente;
        window.residenteLogado = returnedResidente;

        try {
            const sessionData = JSON.stringify({ residente: returnedResidente });
            sessionStorage.setItem("noszona_session", sessionData);
            localStorage.setItem("noszona_session", sessionData);
        } catch (err) {
            console.warn("Não foi possível guardar sessão:", err);
        }

        form.reset();

        popup(
            "sucesso",
            "Registo efetuado com sucesso!",
            "Conta criada com sucesso. Verifica se recebeste o email de boas-vindas em " + returnedResidente.email
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
};

// ==================== LOGIN NORMAL ====================
window.login = async function(e) {
    if (e) e.preventDefault();

    const usernameEl = document.getElementById("loginUsername");
    const passwordEl = document.getElementById("loginPassword");
    const lembrarEl = document.getElementById("lembrar");

    const username = usernameEl ? usernameEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value : "";
    const lembrar = lembrarEl ? lembrarEl.checked : false;

    if (!username || !password) {
        popup("erro", "Campos obrigatórios", "Preenche username e password.");
        return;
    }

    try {
        setLoading(true);

        const response = await fetch(`${API_BASE}/residentes/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.sucesso) {
            residenteLogado = data.residente;
            window.residenteLogado = residenteLogado;

            try {
                const sessionData = JSON.stringify({ residente: residenteLogado });
                sessionStorage.setItem("noszona_session", sessionData);
                if (lembrar) localStorage.setItem("noszona_session", sessionData);
            } catch (err) {}

            atualizarHeaderLogado();
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

// ==================== GOOGLE LOGIN ====================
window.loginWithGoogle = function() {
    const existing = document.getElementById("google-login-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "google-login-modal";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:Arial,sans-serif;";
    modal.innerHTML = `
        <div style="background:#fff;width:420px;max-width:92%;border-radius:8px;box-shadow:0 15px 40px rgba(0,0,0,.25);overflow:hidden;">
            <div style="padding:28px 30px 18px;text-align:center;border-bottom:1px solid #eee;">
                <div style="font-size:28px;letter-spacing:7px;color:#4285f4;margin-bottom:10px;">Google</div>
                <h2 style="margin:0 0 5px;font-size:22px;font-weight:400;">Sign in</h2>
                <p style="margin:0;color:#555;">Use your Google Account</p>
            </div>
            <div id="google-step-1" style="padding:24px 30px;">
                <input id="google-email-input" type="email" placeholder="Email" style="width:100%;padding:14px;border:1px solid #ddd;border-radius:5px;font-size:16px;box-sizing:border-box;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;">
                    <a href="#" id="google-create-account" style="color:#1a73e8;text-decoration:none;">Create account</a>
                    <button id="google-next-btn" style="background:#1a73e8;color:#fff;border:0;border-radius:4px;padding:10px 24px;cursor:pointer;">Next</button>
                </div>
            </div>
            <div id="google-step-2" style="padding:24px 30px;display:none;">
                <div style="margin-bottom:12px;">
                    <a href="#" id="google-back-email" style="color:#1a73e8;text-decoration:none;">Not your account?</a>
                    <div id="google-email-display" style="margin-top:6px;color:#333;"></div>
                </div>
                <input id="google-password-input" type="password" placeholder="Password" style="width:100%;padding:14px;border:1px solid #ddd;border-radius:5px;font-size:16px;box-sizing:border-box;">
                <label style="display:flex;gap:8px;align-items:center;margin-top:12px;color:#555;">
                    <input id="google-show-password" type="checkbox"> Show password
                </label>
                <div style="text-align:right;margin-top:22px;">
                    <button id="google-signin-btn" style="background:#1a73e8;color:#fff;border:0;border-radius:4px;padding:10px 24px;cursor:pointer;">Sign in</button>
                </div>
            </div>
            <div style="background:#f8f9fa;padding:16px 30px;color:#666;font-size:13px;">Autenticação NOSZONA • Para contas registadas com email Google</div>
        </div>
    `;

    document.body.appendChild(modal);

    const step1 = modal.querySelector("#google-step-1");
    const step2 = modal.querySelector("#google-step-2");
    const emailInput = modal.querySelector("#google-email-input");
    const nextBtn = modal.querySelector("#google-next-btn");
    const passwordInput = modal.querySelector("#google-password-input");
    const signinBtn = modal.querySelector("#google-signin-btn");
    const emailDisplay = modal.querySelector("#google-email-display");
    const backLink = modal.querySelector("#google-back-email");
    const showPassCheckbox = modal.querySelector("#google-show-password");
    const createAccountLink = modal.querySelector("#google-create-account");

    if (createAccountLink) {
        createAccountLink.onclick = (ev) => {
            ev.preventDefault();
            modal.remove();
            mostrarRegisto("Pacote 2");
        };
    }

    nextBtn.onclick = async () => {
        const email = emailInput.value.trim();
        if (!email || !email.includes("@")) {
            alert("Please enter a valid email");
            return;
        }

        try {
            setLoading(true);
            const resp = await fetch(`${API_BASE}/residentes/google-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, checkOnly: true })
            });
            const checkData = await resp.json();

            if (checkData && checkData.exists === false) {
                popup("erro", "Conta não registada", checkData.mensagem || "Esta conta Google ainda não está registada no NOSZONA. Faz o registo normal primeiro.");
                return;
            }
        } catch (err) {
            console.warn("Check Google email falhou:", err);
        } finally {
            setLoading(false);
        }

        emailDisplay.textContent = email;
        step1.style.display = "none";
        step2.style.display = "block";
        passwordInput.focus();
    };

    backLink.onclick = (ev) => {
        ev.preventDefault();
        step2.style.display = "none";
        step1.style.display = "block";
        emailInput.focus();
    };

    showPassCheckbox.onchange = () => {
        passwordInput.type = showPassCheckbox.checked ? "text" : "password";
    };

    const handleSignIn = () => {
        const email = (emailDisplay.textContent || emailInput.value || "").trim();
        const pass = passwordInput.value.trim();
        modal.remove();
        realGoogleLogin(email, pass);
    };

    signinBtn.onclick = handleSignIn;
    passwordInput.onkeydown = (ev) => {
        if (ev.key === "Enter") handleSignIn();
    };
    modal.onclick = (ev) => {
        if (ev.target === modal) modal.remove();
    };

    setTimeout(() => emailInput.focus(), 100);
};

async function realGoogleLogin(email, password) {
    if (!email || !password) {
        popup("erro", "Campos obrigatórios", "Introduz o email Google e a password da conta.");
        return;
    }

    try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/residentes/google-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (data && data.sucesso) {
            residenteLogado = data.residente;
            window.residenteLogado = residenteLogado;

            try {
                const sessionData = JSON.stringify({ residente: residenteLogado });
                sessionStorage.setItem("noszona_session", sessionData);
                localStorage.setItem("noszona_session", sessionData);
            } catch (err) {}

            atualizarHeaderLogado();
            popup("sucesso", "Login com Google", data.mensagem || "Bem-vindo de volta!");
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

function processGoogleAuth(googleEmail) {
    realGoogleLogin(googleEmail, "demo-ignore-pass");
}

// ==================== DASHBOARD ====================
window.mostrarDashboard = function() {
    if (!residenteLogado) {
        popup("erro", "Login necessário", "Faz login primeiro.");
        return mostrarLogin();
    }

    atualizarHeaderLogado();
    esconderTudo();

    const dashboard = document.getElementById("dashboard");
    if (dashboard) {
        dashboard.style.display = "block";
        dashboard.scrollIntoView({ behavior: "smooth" });
    }

    renderizarDashboard();
};

function renderizarDashboard() {
    const r = residenteLogado || {};
    const dadosConta = document.getElementById("dadosConta");

    if (dadosConta) {
        let extra = "";
        if (r.email) {
            extra += `<div><strong>Email</strong><span>${escapeHtml(r.email)}</span></div>`;
        }
        if (r.cartaoPedido) {
            const data = r.cartaoPedidoEm ? new Date(r.cartaoPedidoEm).toLocaleDateString("pt-PT") : "hoje";
            extra += `<div><strong>Cartão Físico</strong><span>Pedido em ${data}</span></div>`;
        }

        dadosConta.innerHTML = `
            <div><strong>Nome</strong><span>${escapeHtml(r.nome || "Utilizador")}</span></div>
            <div><strong>Pacote</strong><span>${escapeHtml(r.pacote || "—")}</span></div>
            <div><strong>Saldo</strong><span>${r.saldo ?? 0} CVE</span></div>
            <div><strong>Swipes</strong><span>${r.swipes ?? 0}</span></div>
            <div><strong>Estado</strong><span>${escapeHtml(r.estado || "Ativo")}</span></div>
            ${extra}
        `;
    }

    const banner = document.getElementById("bannerEmailNaoConfirmado");
    if (banner) banner.style.display = (r.emailConfirmado === false) ? "block" : "none";

    iniciarQRRotativo();
}

function iniciarQRRotativo() {
    if (qrTimerId) clearTimeout(qrTimerId);
    if (qrCountdownId) clearInterval(qrCountdownId);

    atualizarQR();

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
        uid: residenteLogado?.uid || residenteLogado?.id || "demo123",
        ts: Math.floor(Date.now() / 1000)
    };

    if (typeof QRCode !== "undefined") {
        new QRCode(container, {
            text: JSON.stringify(payload),
            width: 180,
            height: 180,
            correctLevel: QRCode.CorrectLevel.M
        });
    } else {
        container.textContent = JSON.stringify(payload);
    }

    const bar = document.getElementById("qrProgressBar");
    if (bar) bar.style.width = "100%";
}

function atualizarHeaderLogado() {
    const ctasDeslogado = document.getElementById("ctasDeslogado");
    const ctasLogado = document.getElementById("ctasLogado");

    if (ctasDeslogado) ctasDeslogado.style.display = "none";
    if (ctasLogado) ctasLogado.style.display = "flex";

    const greetingEl = document.getElementById("userGreeting");
    if (ctasLogado && greetingEl && residenteLogado) {
        const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
        greetingEl.textContent = `Olá, ${primeiroNome}`;
    }
}

// ==================== OUTRAS FUNÇÕES ====================
window.logout = function() {
    if (!confirm("Queres mesmo terminar a sessão?")) return;

    if (qrTimerId) clearTimeout(qrTimerId);
    if (qrCountdownId) clearInterval(qrCountdownId);

    qrTimerId = null;
    qrCountdownId = null;
    residenteLogado = null;
    window.residenteLogado = null;

    try {
        localStorage.removeItem("noszona_session");
        sessionStorage.removeItem("noszona_session");
    } catch (err) {}

    esconderTudo();

    const ctasDeslogado = document.getElementById("ctasDeslogado");
    const ctasLogado = document.getElementById("ctasLogado");
    if (ctasDeslogado) ctasDeslogado.style.display = "flex";
    if (ctasLogado) ctasLogado.style.display = "none";

    popup("sucesso", "Sessão terminada", "Voltaste a estar deslogado.");
    window.scrollTo({ top: 0, behavior: "smooth" });
};

window.recarregar = async function(e) {
    if (e) e.preventDefault();
    if (!residenteLogado) {
        popup("erro", "Login necessário", "Faz login primeiro.");
        return mostrarLogin();
    }

    const tipoEl = document.getElementById("tipoRecarga");
    const valorEl = document.getElementById("valorRecarga");
    const tipo = tipoEl ? tipoEl.value : "saldo";
    const valor = Number(valorEl ? valorEl.value : "0");

    if (!valor || valor <= 0) {
        popup("erro", "Valor inválido", "Introduz um valor positivo.");
        return;
    }

    const endpointSisp = `${API_BASE}/pagamento/iniciar`;
    let janelaPagamento = null;

    try {
        setLoading(true);
        janelaPagamento = window.open("", "_blank");
        if (janelaPagamento) {
            janelaPagamento.document.open();
            janelaPagamento.document.write("<h2>A preparar pagamento...</h2><p>Aguarda enquanto abrimos o portal seguro Vinti4.</p>");
            janelaPagamento.document.close();
        }

        const resp = await fetch(endpointSisp, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                residenteId: residenteLogado.id || residenteLogado.uid || "",
                pacote: residenteLogado.pacote || "Recarga",
                tipo,
                valor,
                email: residenteLogado.email || "",
                cidade: residenteLogado.municipio || "Praia",
                morada: residenteLogado.morada || "Cabo Verde",
                codigoPostal: "7600"
            })
        });

        const data = await resp.json();

        if (!data.sucesso) {
            if (janelaPagamento && !janelaPagamento.closed) janelaPagamento.close();
            popup("erro", "Erro na recarga", data.detalhe || data.mensagem || "A SISP devolveu um erro.");
            return;
        }

        if (data.htmlPagamento) {
            if (!janelaPagamento || janelaPagamento.closed) janelaPagamento = window.open("", "_blank");
            if (!janelaPagamento) {
                popup("erro", "Popup bloqueado", "Permite popups para continuar.");
                return;
            }
            janelaPagamento.document.open();
            janelaPagamento.document.write(data.htmlPagamento);
            janelaPagamento.document.close();
            popup("sucesso", "Pagamento aberto", "Abrimos o portal seguro Vinti4 numa nova janela.");
            return;
        }

        if (data.paymentUrl) {
            if (janelaPagamento && !janelaPagamento.closed) janelaPagamento.location.href = data.paymentUrl;
            else window.location.href = data.paymentUrl;
            popup("info", "A redirecionar...", "Vais para o portal seguro Vinti4.");
            return;
        }

        if (janelaPagamento && !janelaPagamento.closed) janelaPagamento.close();
        popup("sucesso", "Pedido enviado!", data.mensagem || "Pedido de pagamento enviado para Vinti4.");

    } catch (err) {
        console.error("Erro na recarga SISP:", err);
        if (janelaPagamento && !janelaPagamento.closed) janelaPagamento.close();
        popup("erro", "Erro de ligação", "Não foi possível comunicar com o servidor de pagamento.");
    } finally {
        setLoading(false);
    }
};

window.solicitarCartao = function() {
    if (!residenteLogado) {
        popup("erro", "Login necessário", "Faz login primeiro.");
        return mostrarLogin();
    }

    residenteLogado.cartaoPedido = true;
    residenteLogado.cartaoPedidoEm = new Date().toISOString();
    window.residenteLogado = residenteLogado;

    try {
        localStorage.setItem("noszona_session", JSON.stringify({ residente: residenteLogado }));
    } catch (err) {}

    const cardBox = document.querySelector(".card-req-box");
    if (cardBox) {
        const data = new Date(residenteLogado.cartaoPedidoEm).toLocaleDateString("pt-PT");
        cardBox.innerHTML = `<h3>Cartão Físico RFID</h3><p>✅ Pedido enviado em ${data}. Entraremos em contacto em breve.</p>`;
    }

    popup("sucesso", "Pedido enviado", "O teu pedido de cartão físico RFID foi registado com sucesso.");
};

window.recuperarPassword = async function(e) {
    if (e) e.preventDefault();
    const email = safeGet("recuperarEmail");
    if (!email) {
        popup("erro", "Email necessário", "Introduz o email.");
        return;
    }

    try {
        setLoading(true);
        const resp = await fetch(`${API_BASE}/residentes/recuperar-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const data = await resp.json();
        popup(data.sucesso ? "sucesso" : "erro", "Recuperação", data.mensagem || "Pedido processado.");
    } catch (err) {
        console.error(err);
        popup("erro", "Erro de ligação", "Não foi possível comunicar com o servidor.");
    } finally {
        setLoading(false);
    }
};

window.reenviarConfirmacao = async function() {
    if (!residenteLogado) {
        popup("erro", "Login necessário", "Faz login primeiro.");
        return mostrarLogin();
    }
    popup("info", "Confirmação", "Reenvio de confirmação em desenvolvimento.");
};

window.mostrarTermos = function() {
    popup(
        "info",
        "Termos e Condições",
        "Ao criar uma conta na NOSZONA Smart, você concorda com:\n\n" +
        "• Fornecimento de dados pessoais verídicos.\n" +
        "• Uso do QR para acesso a serviços da Smart City.\n" +
        "• Política de privacidade e proteção de dados.\n" +
        "• Não compartilhamento de credenciais.\n\n" +
        "A NOSZONA reserva-se o direito de suspender contas em caso de violação.\n\n" +
        "Versão 1.0 - Cabo Verde, 2026."
    );
};

// ==================== SESSÃO ====================
function carregarSessao() {
    try {
        const raw = sessionStorage.getItem("noszona_session") || localStorage.getItem("noszona_session");
        if (!raw) return false;

        const parsed = JSON.parse(raw);
        if (parsed && parsed.residente) {
            residenteLogado = parsed.residente;
            window.residenteLogado = residenteLogado;
            atualizarHeaderLogado();
            return true;
        }
    } catch (err) {}
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
