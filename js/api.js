// =====================================================
// CAMADA DE API - Todas as chamadas fetch
// =====================================================

import { API_BASE } from './core/config.js';
import { setLoading } from './core/utils.js';

export async function loginAPI(username, password) {
  const response = await fetch(`${API_BASE}/residentes/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return response.json();
}

export async function registarAPI(dados) {
  const response = await fetch(`${API_BASE}/residentes/registar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  return response.json();
}

export async function recarregarAPI(dados, token) {
  const response = await fetch(`${API_BASE}/residentes/recarregar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": "Bearer " + token } : {})
    },
    body: JSON.stringify(dados)
  });
  return response.json();
}

export async function solicitarCartaoAPI(id, token) {
  const response = await fetch(`${API_BASE}/residentes/solicitar-cartao`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": "Bearer " + token } : {})
    },
    body: JSON.stringify({ id })
  });
  return response.json();
}

export async function recuperarPasswordAPI(email) {
  const response = await fetch(`${API_BASE}/residentes/recuperar-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.toLowerCase() })
  });
  return response.json();
}