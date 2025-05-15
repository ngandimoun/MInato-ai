// FILE: lib/utils/security.ts
import { logger } from "@/memory-framework/config"; // Use shared logger
// Basic sanitizer - consider using a more robust library like DOMPurify if dealing with HTML
// This is a VERY basic example and might not cover all XSS vectors.
export class Security {
  /**
   * Basic text sanitization primarily focused on removing <script> tags.
   * WARNING: This is NOT a comprehensive XSS prevention method.
   * ALWAYS use context-specific encoding/escaping (e.g., React dangerouslySetInnerHTML precautions,
   * proper SQL parameterization, HTML entity encoding) when handling or displaying user input.
   * Consider using a dedicated library like DOMPurify if processing potentially malicious HTML.
   * @param text The input string, potentially null or undefined.
   * @returns A sanitized string with script tags removed, or an empty string if input is null/undefined.
   */
  static sanitizeText(text: string | null | undefined): string {
    if (text === null || text === undefined) {
      return "";
    }
    let sanitized = String(text);

    // Remove <script>...</script> tags (case-insensitive, handles attributes, minimal nesting)
    // This regex is basic and can be bypassed. DO NOT rely on it as sole defense.
    sanitized = sanitized.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );

    // Optionally remove other potentially dangerous attributes or tags:
    // Example: Remove on... event handlers (like onerror, onload)
    // sanitized = sanitized.replace(/ on\w+\s*=\s*("([^"]*)"|'([^']*)'|[^>\s]+)/gi, '');
    // Example: Remove <iframe> tags
    // sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    // Consider replacing with HTML entity encoding for safer display if the context allows HTML:
    // sanitized = sanitized.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """).replace(/'/g, "'");
    // However, for plain text display (which is usually safer), the script removal might suffice.

    return sanitized;
  }

  /**
   * Checks if a string looks like a Data URI.
   * Useful for preliminary checks, but server-side validation is crucial.
   * @param input String to check.
   * @returns True if the string starts with 'data:', false otherwise.
   */
  static looksLikeDataURI(input: string | null | undefined): boolean {
    if (!input) return false;
    // Simple prefix check, allows for common types
    return String(input).trim().startsWith("data:");
  }

  // Future: Add encryption/decryption helpers using Node's crypto if needed
  // These should use the configured appConfig.encryptionKey
  // Note: Les fonctions de chiffrement sont déjà dans lib/utils/encryption.ts et utilisées dans lib/config.ts.
  // Si vous voulez les exposer ici, il faudrait importer `encryptData` et `decryptData` depuis `../utils/encryption`
  // et potentiellement `appConfig` depuis `../config` pour la clé, mais cela pourrait créer des dépendances circulaires
  // ou une duplication de logique. Il est généralement préférable de garder la logique de chiffrement dans son propre module.
  //
  // import { encryptData, decryptData } from './encryption'; // Example import
  // import { appConfig } from '../config'; // Example import
  //
  // static encrypt(text: string): string | null {
  //    return encryptData(text, appConfig.encryptionKey);
  // }
  // static decrypt(encryptedText: string): string | null {
  //    return decryptData(encryptedText, appConfig.encryptionKey);
  // }
}
