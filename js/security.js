// =====================================================
// security.js - Hashing de password no cliente (Web Crypto API)
// Usado pelo registo para nunca enviar plain text quando possível.
// Expõe globalmente: window.hashPassword (ou hashPassword)
// Retorna { hash: hex, salt: hex }
// =====================================================

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    hash: hashHex,
    salt: saltHex
  };
}

// Expose reliably for classic scripts (used by onclick and direct calls in main.js)
// Works for file:// , global scripts and most environments
if (typeof window !== "undefined") {
  window.hashPassword = hashPassword;
}
if (typeof globalThis !== "undefined") {
  globalThis.hashPassword = hashPassword;
}
// Fallback direct assignment for bare identifier access
try {
  // In non-strict classic scripts this makes bare `hashPassword` work
  if (typeof self !== "undefined") self.hashPassword = hashPassword;
} catch (_) {}
