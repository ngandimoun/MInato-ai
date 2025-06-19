import { UserInfo, DossierData } from '../../types';

/**
 * Security Manager for the Living Dossier system
 * Provides end-to-end encryption, compliance features, and audit logging
 */
export class SecurityManager {
  private static instance: SecurityManager;
  private encryptionKey?: CryptoKey;
  private complianceSettings: ComplianceSettings;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.complianceSettings = {
      enabledRegulations: [],
      dataRetentionPeriod: 365, // days
      auditLoggingEnabled: true,
      sensitiveDataTypes: ['PII', 'PHI', 'PCI'],
      dataResidency: 'global'
    };
  }
  
  /**
   * Get the singleton instance
   * @returns The SecurityManager instance
   */
  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }
  
  /**
   * Initialize the security manager with encryption key
   * @param encryptionKey Optional encryption key
   */
  public async initialize(encryptionKey?: string): Promise<void> {
    if (encryptionKey) {
      // Convert the provided key to a CryptoKey
      const encoder = new TextEncoder();
      const keyData = encoder.encode(encryptionKey);
      this.encryptionKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } else if (typeof window !== 'undefined') {
      // Generate a new encryption key
      this.encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }
  }
  
  /**
   * Configure compliance settings
   * @param settings Compliance settings
   */
  public configureCompliance(settings: Partial<ComplianceSettings>): void {
    this.complianceSettings = {
      ...this.complianceSettings,
      ...settings
    };
    
    // Log the configuration change
    this.logAuditEvent({
      action: 'compliance_settings_updated',
      details: { settings },
      severity: 'info'
    });
  }
  
  /**
   * Encrypt sensitive data
   * @param data Data to encrypt
   * @param context Encryption context
   * @returns Encrypted data
   */
  public async encryptData(
    data: any,
    context: { purpose: string; userId: string }
  ): Promise<EncryptedData> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    try {
      // Generate a random IV
      const ivArray = new Uint8Array(12);
      crypto.getRandomValues(ivArray);
      
      // Convert data to string
      const dataString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataString);
      
      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: ivArray },
        this.encryptionKey,
        dataBuffer
      );
      
      // Convert to base64
      const encryptedBase64 = this.arrayBufferToBase64(encryptedBuffer);
      const ivBase64 = this.arrayBufferToBase64(ivArray.buffer);
      
      // Log the encryption event
      this.logAuditEvent({
        action: 'data_encrypted',
        details: {
          purpose: context.purpose,
          userId: context.userId,
          dataType: typeof data
        },
        severity: 'info'
      });
      
      return {
        encryptedData: encryptedBase64,
        iv: ivBase64,
        algorithm: 'AES-GCM',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logAuditEvent({
        action: 'encryption_failed',
        details: { error: (error as Error).message },
        severity: 'error'
      });
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Decrypt encrypted data
   * @param encryptedData Encrypted data
   * @param context Decryption context
   * @returns Decrypted data
   */
  public async decryptData(
    encryptedData: EncryptedData,
    context: { purpose: string; userId: string }
  ): Promise<any> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    try {
      // Convert from base64
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData.encryptedData);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      
      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encryptedBuffer
      );
      
      // Convert to string and parse
      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(decryptedBuffer);
      const decryptedData = JSON.parse(decryptedString);
      
      // Log the decryption event
      this.logAuditEvent({
        action: 'data_decrypted',
        details: {
          purpose: context.purpose,
          userId: context.userId,
          dataType: typeof decryptedData
        },
        severity: 'info'
      });
      
      return decryptedData;
    } catch (error) {
      this.logAuditEvent({
        action: 'decryption_failed',
        details: { error: (error as Error).message },
        severity: 'error'
      });
      throw new Error(`Decryption failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Check if a dossier complies with configured regulations
   * @param dossier The dossier to check
   * @returns Compliance check result
   */
  public checkCompliance(dossier: DossierData): ComplianceCheckResult {
    const issues: ComplianceIssue[] = [];
    
    // Check for GDPR compliance
    if (this.complianceSettings.enabledRegulations.includes('GDPR')) {
      // Check for PII data without proper consent
      if (this.containsSensitiveData(dossier, 'PII') && !dossier.metadata.customFields?.gdprConsent) {
        issues.push({
          regulation: 'GDPR',
          severity: 'high',
          description: 'Contains PII data without explicit GDPR consent',
          remediation: 'Add GDPR consent information or remove PII data'
        });
      }
    }
    
    // Check for HIPAA compliance
    if (this.complianceSettings.enabledRegulations.includes('HIPAA')) {
      // Check for PHI data
      if (this.containsSensitiveData(dossier, 'PHI')) {
        issues.push({
          regulation: 'HIPAA',
          severity: 'high',
          description: 'Contains PHI data which requires special handling under HIPAA',
          remediation: 'Ensure all PHI data is properly de-identified or has appropriate authorization'
        });
      }
    }
    
    // Check for data residency compliance
    if (
      this.complianceSettings.dataResidency !== 'global' &&
      dossier.metadata.customFields?.dataLocation &&
      dossier.metadata.customFields.dataLocation !== this.complianceSettings.dataResidency
    ) {
      issues.push({
        regulation: 'Data Residency',
        severity: 'medium',
        description: `Data is stored in ${dossier.metadata.customFields.dataLocation} but policy requires ${this.complianceSettings.dataResidency}`,
        remediation: 'Move data to compliant region or update data residency policy'
      });
    }
    
    // Log compliance check
    this.logAuditEvent({
      action: 'compliance_check',
      details: {
        dossierId: dossier.id,
        issuesFound: issues.length,
        regulations: this.complianceSettings.enabledRegulations
      },
      severity: issues.length > 0 ? 'warning' : 'info'
    });
    
    return {
      compliant: issues.length === 0,
      issues,
      checkedRegulations: this.complianceSettings.enabledRegulations
    };
  }
  
  /**
   * Log an audit event
   * @param event The audit event to log
   */
  public logAuditEvent(event: AuditEvent): void {
    if (!this.complianceSettings.auditLoggingEnabled) {
      return;
    }
    
    const auditLog: AuditLog = {
      ...event,
      timestamp: new Date().toISOString(),
      id: this.generateUniqueId()
    };
    
    // In a real implementation, this would send the audit log to a secure storage system
    console.log('AUDIT LOG:', auditLog);
    
    // Store in local storage for demo purposes
    if (typeof window !== 'undefined') {
      const existingLogs = localStorage.getItem('audit_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(auditLog);
      
      // Keep only the last 1000 logs
      if (logs.length > 1000) {
        logs.shift();
      }
      
      localStorage.setItem('audit_logs', JSON.stringify(logs));
    }
  }
  
  /**
   * Get audit logs
   * @param filters Optional filters for the logs
   * @returns Array of audit logs
   */
  public getAuditLogs(filters?: {
    startDate?: string;
    endDate?: string;
    action?: string;
    severity?: AuditSeverity;
  }): AuditLog[] {
    if (typeof window === 'undefined') {
      return [];
    }
    
    const existingLogs = localStorage.getItem('audit_logs');
    if (!existingLogs) {
      return [];
    }
    
    let logs: AuditLog[] = JSON.parse(existingLogs);
    
    // Apply filters
    if (filters) {
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
      
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      
      if (filters.severity) {
        logs = logs.filter(log => log.severity === filters.severity);
      }
    }
    
    return logs;
  }
  
  /**
   * Sanitize data according to compliance requirements
   * @param data The data to sanitize
   * @param regulations The regulations to comply with
   * @returns Sanitized data
   */
  public sanitizeData(data: any, regulations: string[] = this.complianceSettings.enabledRegulations): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    // Create a deep copy of the data
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    // Apply sanitization rules based on regulations
    if (regulations.includes('GDPR') || regulations.includes('CCPA')) {
      this.sanitizePII(sanitized);
    }
    
    if (regulations.includes('HIPAA')) {
      this.sanitizePHI(sanitized);
    }
    
    if (regulations.includes('PCI-DSS')) {
      this.sanitizePCI(sanitized);
    }
    
    // Log the sanitization event
    this.logAuditEvent({
      action: 'data_sanitized',
      details: {
        regulations,
        dataType: typeof data
      },
      severity: 'info'
    });
    
    return sanitized;
  }
  
  /**
   * Check if a user has permission to access a dossier
   * @param user The user
   * @param dossier The dossier
   * @param action The action to perform
   * @returns Boolean indicating if the user has permission
   */
  public checkPermission(
    user: UserInfo,
    dossier: DossierData,
    action: 'view' | 'edit' | 'share' | 'delete' | 'export'
  ): boolean {
    // Owner has all permissions
    if (dossier.createdBy.id === user.id) {
      return true;
    }
    
    // Check share settings
    const shareSettings = dossier.metadata.shareSettings;
    if (!shareSettings) {
      return false;
    }
    
    // Public dossiers can be viewed by anyone
    if (shareSettings.visibility === 'public' && action === 'view') {
      return true;
    }
    
    // Check if user is in the sharedWith list
    const isCollaborator = shareSettings.sharedWith?.some(u => u.id === user.id);
    if (!isCollaborator) {
      return false;
    }
    
    // Check specific permissions
    switch (action) {
      case 'view':
        return true;
      case 'edit':
        return shareSettings.allowEdits;
      case 'share':
        return false; // Only owner can share
      case 'delete':
        return false; // Only owner can delete
      case 'export':
        return true; // Collaborators can export
      default:
        return false;
    }
  }
  
  /**
   * Generate a unique ID
   * @returns Unique ID
   */
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  /**
   * Convert ArrayBuffer to Base64 string
   * @param buffer ArrayBuffer to convert
   * @returns Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  /**
   * Convert Base64 string to ArrayBuffer
   * @param base64 Base64 string to convert
   * @returns ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  /**
   * Check if a dossier contains sensitive data
   * @param dossier The dossier to check
   * @param dataType The type of sensitive data to check for
   * @returns Boolean indicating if the dossier contains sensitive data
   */
  private containsSensitiveData(dossier: DossierData, dataType: string): boolean {
    // This is a simplified implementation
    // In a real system, this would use more sophisticated detection methods
    
    const dossierString = JSON.stringify(dossier);
    
    switch (dataType) {
      case 'PII':
        // Check for common PII patterns
        return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(dossierString) || // Email
               /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(dossierString); // SSN-like
      case 'PHI':
        // Check for health-related terms
        return /\b(health|medical|patient|diagnosis|treatment)\b/i.test(dossierString);
      case 'PCI':
        // Check for credit card patterns
        return /\b(?:\d[ -]*?){13,16}\b/.test(dossierString);
      default:
        return false;
    }
  }
  
  /**
   * Sanitize PII data
   * @param data Data to sanitize
   */
  private sanitizePII(data: any): void {
    if (typeof data !== 'object' || data === null) {
      return;
    }
    
    const piiFields = ['email', 'phone', 'address', 'ssn', 'dob', 'birthdate', 'birthDay'];
    
    if (Array.isArray(data)) {
      data.forEach(item => this.sanitizePII(item));
    } else {
      for (const key in data) {
        if (piiFields.includes(key.toLowerCase())) {
          data[key] = '[REDACTED]';
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          this.sanitizePII(data[key]);
        } else if (typeof data[key] === 'string') {
          // Check for email pattern
          if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(data[key])) {
            data[key] = '[REDACTED EMAIL]';
          }
          
          // Check for phone pattern
          if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(data[key])) {
            data[key] = '[REDACTED PHONE]';
          }
        }
      }
    }
  }
  
  /**
   * Sanitize PHI data
   * @param data Data to sanitize
   */
  private sanitizePHI(data: any): void {
    if (typeof data !== 'object' || data === null) {
      return;
    }
    
    const phiFields = [
      'diagnosis', 'treatment', 'medication', 'medical', 'health', 'patient', 
      'doctor', 'hospital', 'clinic', 'insurance'
    ];
    
    if (Array.isArray(data)) {
      data.forEach(item => this.sanitizePHI(item));
    } else {
      for (const key in data) {
        if (phiFields.includes(key.toLowerCase())) {
          data[key] = '[REDACTED PHI]';
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          this.sanitizePHI(data[key]);
        }
      }
    }
  }
  
  /**
   * Sanitize PCI data
   * @param data Data to sanitize
   */
  private sanitizePCI(data: any): void {
    if (typeof data !== 'object' || data === null) {
      return;
    }
    
    const pciFields = ['creditCard', 'cardNumber', 'ccNumber', 'cvv', 'cvc', 'expiry', 'cardExpiry'];
    
    if (Array.isArray(data)) {
      data.forEach(item => this.sanitizePCI(item));
    } else {
      for (const key in data) {
        if (pciFields.includes(key.toLowerCase())) {
          data[key] = '[REDACTED PCI]';
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          this.sanitizePCI(data[key]);
        } else if (typeof data[key] === 'string') {
          // Check for credit card pattern
          if (/\b(?:\d[ -]*?){13,16}\b/.test(data[key])) {
            data[key] = '[REDACTED CARD]';
          }
        }
      }
    }
  }
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encryptedData: string;
  iv: string;
  algorithm: string;
  timestamp: string;
}

/**
 * Compliance settings
 */
export interface ComplianceSettings {
  enabledRegulations: string[];
  dataRetentionPeriod: number;
  auditLoggingEnabled: boolean;
  sensitiveDataTypes: string[];
  dataResidency: string;
}

/**
 * Compliance check result
 */
export interface ComplianceCheckResult {
  compliant: boolean;
  issues: ComplianceIssue[];
  checkedRegulations: string[];
}

/**
 * Compliance issue
 */
export interface ComplianceIssue {
  regulation: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  remediation: string;
}

/**
 * Audit event severity
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Audit event
 */
export interface AuditEvent {
  action: string;
  details: any;
  severity: AuditSeverity;
  userId?: string;
  dossierId?: string;
}

/**
 * Audit log
 */
export interface AuditLog extends AuditEvent {
  id: string;
  timestamp: string;
} 