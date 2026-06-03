// =====================================================
// CONFIGURAÇÃO
// =====================================================
export const API_BASE = "https://violet-beaver-178312.hostingersite.com/api";
export const SESSION_KEY = "noszona_session";
export const QR_INTERVAL_MS = 30000;

// Estado global
export let residenteLogado = null;
export let tokenSessao = null;
export let qrTimerId = null;
export let qrCountdownId = null;