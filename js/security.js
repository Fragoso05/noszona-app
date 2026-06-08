// =====================================================
// security.js - Hashing de password no cliente (PBKDF2)
// =====================================================

/**
 * Hashea a password do utilizador no browser usando PBKDF2
 * @param {string} password - Password em texto normal
 * @returns {Promise<{hash: string, salt: string}>}
 */
async function hashPassword(password)  {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Gera um salt aleatório de 16 bytes
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Importa a password como material para derivação
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        data,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );

    // Deriva os bits usando PBKDF2 (100.000 iterações)
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        256 // 32 bytes = 256 bits
    );

    // Converte para hexadecimal
    const hashArray = Array.from(new Uint8Array(derivedBits));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
        hash: hashHex,
        salt: saltHex
    };
}