// =====================================================
// GESTÃO DE SESSÃO (state machine anti-travado + header)
// Fonte única da verdade para estado de login. Sempre atualiza header.
// Suporte completo a token. Limpa timers via hook se fornecido.
// =====================================================

import { SESSION_KEY } from './config.js';
import { popup } from './utils.js';

// Estado interno (use os getters)
let residenteLogado = null;
let tokenSessao = null;
let clearTimersHook = null; // injetado pelo main para limpar QR etc.

export function setClearTimersHook(fn) {
  clearTimersHook = fn;
}

export function getResidenteLogado() {
  return residenteLogado;
}

export function getToken() {
  return tokenSessao;
}

export function guardarSessao(residente, token, lembrar) {
  residenteLogado = residente;
  tokenSessao = token || null;

  const store = lembrar ? localStorage : sessionStorage;
  store.setItem(SESSION_KEY, JSON.stringify({ residente, token: tokenSessao }));
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

  if (typeof clearTimersHook === 'function') {
    try { clearTimersHook(); } catch (_) {}
  }

  atualizarHeader();
}

export function logout() {
  // Sem qualquer aviso/confirmacao. Se a pessoa clicar "Sair", faz logout imediatamente.
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

  const greetingEl = document.getElementById("userGreeting");
  if (logado && greetingEl) {
    const primeiroNome = (residenteLogado.nome || "").split(" ")[0];
    greetingEl.textContent = `Olá, ${primeiroNome}`;
  }
}

// Expor para compatibilidade com handlers inline no HTML
window.logout = logout;
window.carregarSessao = carregarSessao;
window.getResidenteLogado = getResidenteLogado;