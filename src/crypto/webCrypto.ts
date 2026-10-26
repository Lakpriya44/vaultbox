/**
 * VaultBox Cryptographic Engine
 *
 * Implemented strictly using the W3C Web Cryptography API (`window.crypto.subtle`).
 *
 * Security Architecture & Viva Talking Points:
 * 1. Zero-Knowledge Principle: The server only ever stores ciphertext and wrapped keys.
 *    Plaintext and cryptographic keys never leave the client's memory.
 * 2. Master Key Derivation (PBKDF2):
 *    - Standard: NIST SP 800-132 recommendation.
 *    - Hash Function: SHA-256.
 *    - Iteration count: 310,000 iterations (OWASP password storage & derivation benchmark).
 *    - Salt: 16 bytes (128 bits) of cryptographically secure random entropy.
 * 3. File Encryption (AES-GCM):
 *    - Key size: 256-bit symmetric key (`AES-GCM`).
 *    - IV (Initialization Vector): 12 bytes (96 bits) uniquely generated for every single encryption.
 *    - Authentication Tag: 128-bit integrity tag included with ciphertext. Decryption fails
 *      instantly if any bit has been altered or tampered with.
 * 4. Key Wrapping:
 *    - Master Wrapping: File keys are wrapped using AES-GCM with the Master Key.
 *    - Asymmetric Sharing: RSA-OAEP (2048-bit modulus, SHA-256 digest) allows end-to-end
 *      secure key exchange between users without exposing raw keys.
 */

// ============================================================================
// Utility Encodings: ArrayBuffer <-> Base64 / Hex
// ============================================================================

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function generateRandomBytes(length: number): Uint8Array {
  const buffer = new ArrayBuffer(length);
  const bytes = new Uint8Array(buffer);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

export function generateRandomSalt(): string {
  // 16 bytes = 128 bits of salt for PBKDF2
  const saltBytes = generateRandomBytes(16);
  return bufferToBase64(saltBytes);
}

// ============================================================================
// 1. PBKDF2 Master Key Derivation
// ============================================================================

/**
 * Derives a 256-bit AES-GCM Master Key from the user's passphrase and unique salt.
 * 
 * Step 1: Import raw UTF-8 password string as a PBKDF2 base key.
 * Step 2: Run PBKDF2 with SHA-256 and 310,000 iterations.
 * Step 3: Derive an AES-GCM 256-bit key used for wrapping/encrypting client data.
 */
export async function deriveMasterKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = base64ToBuffer(saltBase64);

  // Import raw password into CryptoKey for derivation
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  // Derive AES-GCM 256-bit Master Key
  const masterKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 310000, // OWASP 2023+ recommendation for SHA-256
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // Master key is non-extractable from memory for enhanced security
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );

  return masterKey;
}

// ============================================================================
// 2. RSA-OAEP Key Pair Generation & Encapsulation
// ============================================================================

export interface GeneratedKeyPair {
  publicKeySpkiBase64: string;
  encryptedPrivateKeyBase64: string;
  privateKeyIvBase64: string;
}

/**
 * Generates an RSA-OAEP key pair (2048-bit, SHA-256 hash).
 * - Public key is exported in SPKI format (Base64) for server storage.
 * - Private key is exported in PKCS8 format and encrypted with the user's Master Key.
 */
export async function generateAndWrapRsaKeyPair(masterKey: CryptoKey): Promise<{
  keyPair: CryptoKeyPair;
  exported: GeneratedKeyPair;
}> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: 'SHA-256',
    },
    true, // extractable so we can export & encrypt private key
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );

  // 1. Export Public Key to SPKI format (Base64)
  const spkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeySpkiBase64 = bufferToBase64(spkiBuffer);

  // 2. Export Private Key to PKCS8 format
  const pkcs8Buffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  // 3. Encrypt the Private Key bytes with the Master Key using AES-GCM
  const iv = generateRandomBytes(12);
  const encryptedPrivateKeyBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    masterKey,
    pkcs8Buffer
  );

  return {
    keyPair,
    exported: {
      publicKeySpkiBase64,
      encryptedPrivateKeyBase64: bufferToBase64(encryptedPrivateKeyBuffer),
      privateKeyIvBase64: bufferToBase64(iv),
    },
  };
}

/**
 * Decrypts and imports user's RSA private key using their derived Master Key.
 */
export async function unwrapPrivateKey(
  encryptedPrivateKeyBase64: string,
  ivBase64: string,
  masterKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedBuffer = base64ToBuffer(encryptedPrivateKeyBase64);
  const ivBuffer = base64ToBuffer(ivBase64);

  try {
    const decryptedPkcs8 = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      masterKey,
      encryptedBuffer
    );

    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      decryptedPkcs8,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false, // non-extractable once in memory
      ['decrypt', 'unwrapKey']
    );

    return privateKey;
  } catch (err) {
    throw new Error('Failed to decrypt RSA private key. The master password may be invalid or data corrupted.');
  }
}

/**
 * Imports an RSA public key from SPKI Base64 format (e.g. for sharing with another user).
 */
export async function importRsaPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const spkiBuffer = base64ToBuffer(spkiBase64);
  return await window.crypto.subtle.importKey(
    'spki',
    spkiBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt', 'wrapKey']
  );
}

// ============================================================================
// 3. AES-GCM Symmetric File Encryption & Wrapping
// ============================================================================

export interface EncryptedFileResult {
  ciphertextBuffer: ArrayBuffer;
  ivBase64: string;
  wrappedKeyBase64: string;
  wrappedKeyIvBase64: string;
}

/**
 * Generates an ephemeral 256-bit AES-GCM key specifically for this file.
 */
export async function generateFileKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable so it can be wrapped
    ['encrypt', 'decrypt']
  );
}

/**
 * Wraps (encrypts) the ephemeral file key with the user's Master Key using AES-GCM.
 */
export async function wrapFileKeyWithMasterKey(
  fileKey: CryptoKey,
  masterKey: CryptoKey
): Promise<{ wrappedKeyBase64: string; wrappedKeyIvBase64: string }> {
  const wrapIv = generateRandomBytes(12);

  const wrappedBuffer = await window.crypto.subtle.wrapKey(
    'raw',
    fileKey,
    masterKey,
    {
      name: 'AES-GCM',
      iv: wrapIv as BufferSource,
    }
  );

  return {
    wrappedKeyBase64: bufferToBase64(wrappedBuffer),
    wrappedKeyIvBase64: bufferToBase64(wrapIv),
  };
}

/**
 * Unwraps (decrypts) the ephemeral file key using the user's Master Key.
 */
export async function unwrapFileKeyWithMasterKey(
  wrappedKeyBase64: string,
  wrappedKeyIvBase64: string,
  masterKey: CryptoKey
): Promise<CryptoKey> {
  const wrappedBuffer = base64ToBuffer(wrappedKeyBase64);
  const wrapIvBuffer = base64ToBuffer(wrappedKeyIvBase64);

  try {
    return await window.crypto.subtle.unwrapKey(
      'raw',
      wrappedBuffer,
      masterKey,
      {
        name: 'AES-GCM',
        iv: wrapIvBuffer as BufferSource,
      },
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (err) {
    throw new Error('Cryptographic integrity error: Failed to unwrap file key. Authentication tag mismatch or corrupted ciphertext.');
  }
}

/**
 * Encrypts an ArrayBuffer of file data in browser memory using AES-GCM.
 */
export async function encryptFilePayload(
  plaintextBuffer: ArrayBuffer,
  fileKey: CryptoKey
): Promise<{ ciphertext: ArrayBuffer; ivBase64: string }> {
  // Generate unique 12-byte IV for this file
  const iv = generateRandomBytes(12);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: 128, // 128-bit authentication tag
    },
    fileKey,
    plaintextBuffer
  );

  return {
    ciphertext,
    ivBase64: bufferToBase64(iv),
  };
}

/**
 * Decrypts an ArrayBuffer of ciphertext in browser memory using AES-GCM.
 * Validates the 128-bit auth tag; throws if tampered.
 */
export async function decryptFilePayload(
  ciphertextBuffer: ArrayBuffer,
  fileKey: CryptoKey,
  ivBase64: string
): Promise<ArrayBuffer> {
  const iv = base64ToBuffer(ivBase64);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128,
      },
      fileKey,
      ciphertextBuffer
    );
    return decryptedBuffer;
  } catch (err) {
    throw new Error(
      'DECRYPTION FAILED: AES-GCM authentication tag verification failed! The ciphertext has been modified or the key is invalid.'
    );
  }
}

// ============================================================================
// 4. Asymmetric Sharing (RSA-OAEP Wrap / Unwrap)
// ============================================================================

/**
 * Wraps an AES-GCM file key with a recipient's RSA-OAEP public key.
 * Used when sharing a file so only the recipient's private key can unwrap it.
 */
export async function wrapFileKeyWithRsa(
  fileKey: CryptoKey,
  recipientRsaPublicKey: CryptoKey
): Promise<string> {
  const wrappedBuffer = await window.crypto.subtle.wrapKey(
    'raw',
    fileKey,
    recipientRsaPublicKey,
    {
      name: 'RSA-OAEP',
    }
  );
  return bufferToBase64(wrappedBuffer);
}

/**
 * Unwraps an AES-GCM file key using the recipient's RSA-OAEP private key.
 */
export async function unwrapFileKeyWithRsa(
  wrappedKeyBase64: string,
  userRsaPrivateKey: CryptoKey
): Promise<CryptoKey> {
  const wrappedBuffer = base64ToBuffer(wrappedKeyBase64);

  try {
    return await window.crypto.subtle.unwrapKey(
      'raw',
      wrappedBuffer,
      userRsaPrivateKey,
      {
        name: 'RSA-OAEP',
      },
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (err) {
    throw new Error('Failed to unwrap shared file key using RSA-OAEP private key.');
  }
}

// ============================================================================
// 5. Password Entropy & Security Analysis
// ============================================================================

export interface PasswordStrength {
  score: number; // 0 to 4
  entropyBits: number;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let poolSize = 0;
  if (hasLowercase) poolSize += 26;
  if (hasUppercase) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSpecial) poolSize += 32;

  const entropyBits = poolSize > 0 && password.length > 0 ? Math.round(password.length * Math.log2(poolSize)) : 0;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if ((hasUppercase && hasLowercase) && (hasNumber || hasSpecial)) score++;
  if (entropyBits >= 60) score++;

  if (score > 4) score = 4;

  const labels: PasswordStrength['label'][] = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

  return {
    score,
    entropyBits,
    label: labels[score],
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
  };
}
