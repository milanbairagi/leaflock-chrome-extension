/**
 * Derives a cryptographic key from a password and salt using PBKDF2
 * @param password - The password string
 * @param salt - A Uint8Array representing the salt
 * @return A Promise that resolves to a CryptoKey derived from the password and salt
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();

  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: 600_000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Hashes a password using PBKDF2 with the email as salt
 * @param password - The password string
 * @param email - The email string to use as salt
 * @return A Promise that resolves to a base64 encoded hash of the password
 */
export async function authHash(password: string, email: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = enc.encode(email.toLowerCase());

  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const authBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: 600_000,
      hash: 'SHA-256'
    },
    baseKey,
    256
  );

  return buftoBase64(authBits);
}

export function generateIV(): string {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM standard IV length is 12 bytes
  return buftoBase64(iv);
}

/**
 * Encrypts data using AES-GCM
 * @param plaintext - The plaintext string to encrypt
 * @param key - The CryptoKey to use for encryption
 * @return An object containing the base64 encoded initialization vector and ciphertext
 */
export async function encryptData(plaintext: string, key: CryptoKey, ivString: string | null = null): Promise<{ iv: string; ciphertext: string }> {
  const enc = new TextEncoder();
  let iv;
  if (ivString) {
    iv = base64toBuf(ivString);
  } else {
    iv = base64toBuf(generateIV());
  }

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    enc.encode(plaintext)
  );

  return {
    iv: buftoBase64(iv),
    ciphertext: buftoBase64(ciphertext)
  };
}


/**
 * Decrypts data using AES-GCM
 * @param ciphertext - Base64 encoded ciphertext
 * @param iv - Base64 encoded initialization vector
 * @param key - CryptoKey used for decryption
 * @return Decrypted plaintext string
 */
export async function decryptData(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder();

  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64toBuf(iv)
    },
    key,
    base64toBuf(ciphertext)
  );

  return dec.decode(plaintext);
}

export const generateRandomSalt = (length: number = 16): Uint8Array => crypto.getRandomValues(new Uint8Array(length));

const buftoBase64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));

const base64toBuf = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
