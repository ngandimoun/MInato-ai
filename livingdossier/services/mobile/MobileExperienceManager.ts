import { DossierData } from '../../types';

/**
 * Mobile Experience Manager for the Living Dossier system
 * Handles responsive design, touch interactions, and offline capabilities
 */
export class MobileExperienceManager {
  /**
   * Check if the current device is mobile
   * @returns Boolean indicating if the current device is mobile
   */
  static isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Check for mobile device using regex
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent);
  }
  
  /**
   * Check if the device is in portrait or landscape orientation
   * @returns Orientation ('portrait' or 'landscape')
   */
  static getDeviceOrientation(): 'portrait' | 'landscape' {
    if (typeof window === 'undefined') return 'portrait';
    
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }
  
  /**
   * Get the appropriate layout configuration for the current device
   * @returns Layout configuration
   */
  static getLayoutConfig(): {
    sidebarVisible: boolean;
    compactMode: boolean;
    touchOptimized: boolean;
    fontSize: 'small' | 'medium' | 'large';
  } {
    const isMobile = this.isMobileDevice();
    const orientation = this.getDeviceOrientation();
    
    return {
      sidebarVisible: !isMobile || orientation === 'landscape',
      compactMode: isMobile,
      touchOptimized: isMobile,
      fontSize: isMobile ? 'medium' : 'small'
    };
  }
  
  /**
   * Save dossier data to local storage for offline access
   * @param dossierId The ID of the dossier
   * @param data The dossier data to save
   */
  static saveDossierForOffline(dossierId: string, data: DossierData): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Add timestamp for cache management
      const offlineData = {
        data,
        timestamp: new Date().toISOString(),
        version: 1
      };
      
      localStorage.setItem(`offline_dossier_${dossierId}`, JSON.stringify(offlineData));
      
      // Update the list of available offline dossiers
      this.updateOfflineDossiersList(dossierId);
      
      console.log(`Dossier ${dossierId} saved for offline access`);
    } catch (error) {
      console.error('Error saving dossier for offline access:', error);
    }
  }
  
  /**
   * Load dossier data from local storage for offline access
   * @param dossierId The ID of the dossier to load
   * @returns The dossier data, or null if not found
   */
  static loadOfflineDossier(dossierId: string): DossierData | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const offlineDataString = localStorage.getItem(`offline_dossier_${dossierId}`);
      if (!offlineDataString) return null;
      
      const offlineData = JSON.parse(offlineDataString);
      return offlineData.data;
    } catch (error) {
      console.error('Error loading offline dossier:', error);
      return null;
    }
  }
  
  /**
   * Check if a dossier is available offline
   * @param dossierId The ID of the dossier to check
   * @returns Boolean indicating if the dossier is available offline
   */
  static isDossierAvailableOffline(dossierId: string): boolean {
    if (typeof window === 'undefined') return false;
    
    return localStorage.getItem(`offline_dossier_${dossierId}`) !== null;
  }
  
  /**
   * Get a list of all dossiers available offline
   * @returns Array of dossier IDs
   */
  static getOfflineDossiers(): Array<{
    id: string;
    timestamp: string;
    title?: string;
  }> {
    if (typeof window === 'undefined') return [];
    
    try {
      const offlineDossiersString = localStorage.getItem('offline_dossiers_list');
      if (!offlineDossiersString) return [];
      
      return JSON.parse(offlineDossiersString);
    } catch (error) {
      console.error('Error getting offline dossiers list:', error);
      return [];
    }
  }
  
  /**
   * Remove a dossier from offline storage
   * @param dossierId The ID of the dossier to remove
   */
  static removeOfflineDossier(dossierId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Remove the dossier data
      localStorage.removeItem(`offline_dossier_${dossierId}`);
      
      // Update the list of available offline dossiers
      const offlineDossiersString = localStorage.getItem('offline_dossiers_list');
      if (offlineDossiersString) {
        const offlineDossiers = JSON.parse(offlineDossiersString);
        const updatedList = offlineDossiers.filter((item: { id: string }) => item.id !== dossierId);
        localStorage.setItem('offline_dossiers_list', JSON.stringify(updatedList));
      }
      
      console.log(`Dossier ${dossierId} removed from offline access`);
    } catch (error) {
      console.error('Error removing offline dossier:', error);
    }
  }
  
  /**
   * Check if the device is currently offline
   * @returns Boolean indicating if the device is offline
   */
  static isOffline(): boolean {
    if (typeof navigator === 'undefined') return false;
    
    return !navigator.onLine;
  }
  
  /**
   * Register a callback for online/offline status changes
   * @param callback Function to call when online/offline status changes
   * @returns Function to unregister the callback
   */
  static registerConnectivityListener(
    callback: (isOnline: boolean) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};
    
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Return a function to unregister the listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
  
  /**
   * Get touch-optimized interaction settings
   * @returns Touch interaction settings
   */
  static getTouchInteractionSettings(): {
    minTapTargetSize: number;
    swipeThreshold: number;
    doubleTapDelay: number;
    longPressDelay: number;
  } {
    return {
      minTapTargetSize: 44, // Minimum size in pixels for tap targets (Apple's recommendation)
      swipeThreshold: 50, // Minimum distance in pixels for a swipe gesture
      doubleTapDelay: 300, // Maximum delay in ms between taps for a double-tap
      longPressDelay: 500 // Delay in ms before a touch is considered a long press
    };
  }
  
  /**
   * Update the list of available offline dossiers
   * @param dossierId The ID of the dossier to add to the list
   */
  private static updateOfflineDossiersList(dossierId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Get the current list
      const offlineDossiersString = localStorage.getItem('offline_dossiers_list');
      const offlineDossiers = offlineDossiersString ? JSON.parse(offlineDossiersString) : [];
      
      // Check if the dossier is already in the list
      const existingIndex = offlineDossiers.findIndex((item: { id: string }) => item.id === dossierId);
      
      if (existingIndex >= 0) {
        // Update the timestamp
        offlineDossiers[existingIndex].timestamp = new Date().toISOString();
      } else {
        // Add the dossier to the list
        offlineDossiers.push({
          id: dossierId,
          timestamp: new Date().toISOString()
        });
      }
      
      // Save the updated list
      localStorage.setItem('offline_dossiers_list', JSON.stringify(offlineDossiers));
    } catch (error) {
      console.error('Error updating offline dossiers list:', error);
    }
  }
} 