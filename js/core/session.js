// =====================================================
// GESTÃO DE SESSÃO
// =====================================================

import { SESSION_KEY } from './config.js';
import { popup } from './utils.js';

// Estado global (será importado onde necessário)
let residenteLogado = null;
let tokenSessao = null;

export function guardarSessao(residente, token, lembrar) {
  residenteLogado = residente;
  tokenSessao = token || null;

  const store = lembrar ? localStorage : sessionStorage;
  store.setItem(SESSION_KEY, JSON.stringify({ residente, token }));
  atualizarHeader();
}

export function carregarSessao() {
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

export function limparSessao() {
  residenteLogado = null;
  tokenSessao = null;
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  atualizarHeader();
}

export function logout() {
  if (!confirm("Queres mesmo terminar a sessão?")) return;
  limparSessao();
  popup("sucesso", "Sessão terminada", "Voltaste a estar deslogado.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function atualizarHeader() {
  const logado = !!residenteLogado;
  const ctasDeslogado = document.getElementById("ctasDeslogado");
  const ctasLogado = document.getElementById("ctasLogado");

  if (ctasDeslogado) ctasDeslogado.style.display = logado ? "none" : "flex";
  if (ctasLogado) ctasLogado.style.display = logado ? "flex" : "none";

  if (logado && document.getElementById("userGreeting")) {
    const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
    document.getElementById("userGreeting").textContent = `Olá, ${primeiroNome}`;
  }
}

// Expor funções globais para onclick
window.logout = logout;