// FILE: lib/utils/encryption.ts
// (Content from finalcodebase.txt - verified)
import crypto from 'crypto';
import { appConfig } from '../config';
import { logger } from '../../memory-framework/config';

// --- Configuration ---
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Ensure the encryption key from config is used and validated
const baseEncryptionKey = appConfig.encryptionKey;
if (!baseEncryptionKey || Buffer.from(baseEncryptionKey, 'utf-8').length !== KEY_LENGTH) {
    const errorMsg = `CRITICAL SECURITY: Invalid ENCRYPTION_KEY detected in encryption.ts. Must be ${KEY_LENGTH} bytes long.`;
    logger.error(errorMsg);
    if (process.env.NODE_ENV === 'production') {
        throw new Error(errorMsg);
    } else {
        logger.error("Application will likely fail encryption/decryption operations.");
    }
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * @param text The plaintext string to encrypt.
 * @param key The 32-byte encryption key (uses appConfig.encryptionKey by default).
 * @returns A string containing the hex-encoded iv, authTag, and ciphertext, separated by ':', or null on error.
 */
export function encryptData(text: string, key: string | Buffer = baseEncryptionKey): string | null {
    if (!text) {
        logger.warn("[Encrypt] Input text is empty.");
        return null;
    }
    if (!key) { // Check the key specifically passed or the default
        logger.error("[Encrypt] Encryption key is not configured properly. Cannot encrypt.");
        return null;
    }

    try {
        const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');
        if (keyBuffer.length !== KEY_LENGTH) {
            throw new Error(`Invalid key length. Expected ${KEY_LENGTH} bytes, received ${keyBuffer.length}.`);
        }

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        const combined = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        return combined;

    } catch (error: any) {
        logger.error("[Encrypt] Encryption failed:", error.message);
        return null;
    }
}

/**
 * Decrypts data encrypted with encryptData (AES-256-GCM).
 * @param encryptedData The combined string (hex(iv):hex(authTag):hex(ciphertext)).
 * @param key The 32-byte encryption key (uses appConfig.encryptionKey by default).
 * @returns The original plaintext string, or null if decryption fails.
 */
export function decryptData(encryptedData: string, key: string | Buffer = baseEncryptionKey): string | null {
    if (!encryptedData || typeof encryptedData !== 'string') {
         logger.warn("[Decrypt] Invalid or empty encrypted data provided.");
        return null;
    }
     if (!key) {
        logger.error("[Decrypt] Encryption key is not configured properly. Cannot decrypt.");
        return null;
    }

    try {
        const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');
        if (keyBuffer.length !== KEY_LENGTH) {
            throw new Error(`Invalid key length. Expected ${KEY_LENGTH} bytes, received ${keyBuffer.length}.`);
        }

        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error("Invalid encrypted data format. Expected 'iv:authTag:ciphertext'.");
        }
        const [ivHex, authTagHex, ciphertextHex] = parts;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encryptedText = Buffer.from(ciphertextHex, 'hex');

        if (iv.length !== IV_LENGTH) throw new Error(`Invalid IV length recovered. Expected ${IV_LENGTH}, got ${iv.length}.`);
        if (authTag.length !== AUTH_TAG_LENGTH) throw new Error(`Invalid AuthTag length recovered. Expected ${AUTH_TAG_LENGTH}, got ${authTag.length}.`);

        const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;

    } catch (error: any) {
        logger.error("[Decrypt] Decryption failed. Likely wrong key or tampered data:", error.message);
        return null;
    }
}