// =====================================================
// CAMADA DE API - Todas as chamadas fetch (confiável, anti-travado)
// Centraliza toda comunicação com o backend. Sempre async, com tratamento
// de erros e tokens. Nenhuma chamada fetch deve existir fora deste ficheiro.
// =====================================================

import { API_BASE } from './core/config.js';

/**
 * Fetch genérico com token automático (se fornecido), JSON handling e erros consistentes.
 * Nunca bloqueia a UI (sempre await no caller com loading).
 */
async function apiFetch(endpoint, { method = 'GET', body, token, headers = {} } = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const options = {
    method,
    headers: finalHeaders,
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  let data;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = { sucesso: response.ok, mensagem: text };
  }

  if (!response.ok && !data.sucesso) {
    const err = new Error(data.mensagem || `Erro ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ==================== ENDPOINTS ====================

export async function loginAPI(username, password) {
  return apiFetch('/residentes/login', {
    method: 'POST',
    body: { username, password },
  });
}

export async function registarAPI(dados) {
  return apiFetch('/residentes/registar', {
    method: 'POST',
    body: dados,
  });
}

export async function recarregarAPI(dados, token) {
  return apiFetch('/residentes/recarregar', {
    method: 'POST',
    body: dados,
    token,
  });
}

export async function solicitarCartaoAPI(id, token) {
  return apiFetch('/residentes/solicitar-cartao', {
    method: 'POST',
    body: { id },
    token,
  });
}

export async function recuperarPasswordAPI(email) {
  return apiFetch('/residentes/recuperar-password', {
    method: 'POST',
    body: { email: email.toLowerCase() },
  });
}

export async function reenviarConfirmacaoAPI(email, token) {
  return apiFetch('/residentes/reenviar-confirmacao', {
    method: 'POST',
    body: { email },
    token,
  });
}

export async function googleLoginAPI(email, password) {
  return apiFetch('/residentes/google-login', {
    method: 'POST',
    body: { email, password },
  });
}

// Helper para obter token do session se quiser usar em chamadas manuais
export function withToken(token) {
  return { token };
}