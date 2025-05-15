// components/auth/PushSubscriptionManager.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Utilise ton hook d'authentification
import { logger } from '@/memory-framework/config'; // Utilise le logger partagé
import { toast } from 'sonner';
import { Button } from '@/components/ui/button'; // Optionnel pour un bouton manuel

// Helper function (copiée depuis sw.js, idéalement mise dans un fichier utils partagé)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64); // Utilise window.atob côté client
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const PushSubscriptionManager = () => {
    const { user, session } = useAuth(); // Obtient l'utilisateur et la session
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true); // Indique le chargement initial de l'abonnement
    const [permission, setPermission] = useState<NotificationPermission>( typeof window !== 'undefined' ? Notification.permission : 'default');
    const [isProcessing, setIsProcessing] = useState(false); // Pour les actions manuelles

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    // Fonction pour envoyer l'abonnement au backend
    const sendSubscriptionToBackend = useCallback(async (subscription: PushSubscription | null) => {
        if (!subscription) return; // Ne rien envoyer si null

        const token = session?.access_token;
        if (!token) {
            console.error("Cannot send subscription: User not authenticated.");
            return; // Ne pas essayer si pas authentifié
        }

        try {
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(subscription),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to save subscription (${response.status})`);
            }
            logger.info("Push subscription saved successfully on backend.");
            setIsSubscribed(true);
        } catch (error: any) {
            logger.error("Error sending subscription to backend:", error);
            toast.error(`Failed to save notification settings: ${error.message}`);
            // Optionnel : tenter de désabonner côté client si le backend échoue ?
            // subscription.unsubscribe().catch(e => console.error("Failed to unsubscribe after backend error:", e));
            // setIsSubscribed(false);
        }
    }, [session]); // Dépend de la session

    // Fonction pour s'abonner
    const subscribeUser = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.error("Push Notifications not supported by this browser.");
            return;
        }
        if (!vapidPublicKey) {
            toast.error("Notification configuration error (missing key).");
            console.error("VAPID public key is not defined.");
            return;
        }

        setIsProcessing(true);
        try {
            const swRegistration = await navigator.serviceWorker.ready;
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
            logger.info("User subscribed to push notifications:", subscription.endpoint);
            await sendSubscriptionToBackend(subscription); // Envoyer au backend
        } catch (error: any) {
            logger.error("Failed to subscribe user:", error);
            toast.error(`Failed to enable notifications: ${error.message}`);
            setPermission(Notification.permission); // Re-vérifier la permission en cas d'erreur
        } finally {
            setIsProcessing(false);
        }
    }, [vapidPublicKey, sendSubscriptionToBackend]);

    // Fonction pour se désabonner
    const unsubscribeUser = useCallback(async () => {
         if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

         setIsProcessing(true);
         try {
             const swRegistration = await navigator.serviceWorker.ready;
             const subscription = await swRegistration.pushManager.getSubscription();
             if (subscription) {
                 const endpoint = subscription.endpoint;
                 const success = await subscription.unsubscribe();
                 if (success) {
                     logger.info("User unsubscribed successfully.");
                     setIsSubscribed(false);
                     // Informer le backend de la désinscription
                      const token = session?.access_token;
                      if (token) {
                          await fetch(`/api/notifications/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token}` }
                          });
                      } else {
                           logger.warn("Could not notify backend of unsubscription: not authenticated.");
                      }

                 } else {
                      throw new Error("Unsubscription failed client-side.");
                 }
             } else {
                  logger.info("No active subscription found to unsubscribe.");
                  setIsSubscribed(false); // Mettre à jour l'état local
             }
         } catch(error: any) {
              logger.error("Failed to unsubscribe user:", error);
              toast.error(`Failed to disable notifications: ${error.message}`);
         } finally {
              setIsProcessing(false);
         }
    }, [session]); // Dépend de la session pour l'appel DELETE

    // Effet pour enregistrer le Service Worker et vérifier l'abonnement initial
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !user) {
            setIsSubscriptionLoading(false); // Pas d'utilisateur ou pas de support SW
            return;
        }

        navigator.serviceWorker.register('/sw.js')
            .then(swRegistration => {
                logger.info('Service Worker registered successfully:', swRegistration.scope);
                setIsSubscriptionLoading(true); // Start loading subscription status
                return swRegistration.pushManager.getSubscription();
            })
            .then(subscription => {
                setIsSubscribed(!!subscription); // Mettre à jour l'état si un abonnement existe
                setPermission(Notification.permission); // Mettre à jour l'état de la permission
                logger.info(`Initial check: User ${subscription ? 'IS' : 'is NOT'} subscribed. Permission: ${Notification.permission}`);
            })
            .catch(error => {
                logger.error('Service Worker registration failed:', error);
                toast.error("Could not initialize notification features.");
            })
            .finally(() => {
                setIsSubscriptionLoading(false); // Finish loading subscription status
            });
    }, [user]); // Ré-exécuter si l'utilisateur change

    // Gérer la demande de permission
    const handlePermissionRequest = async () => {
        if (permission === 'granted') {
             // Si déjà accordé, tenter de s'abonner (au cas où l'abonnement aurait été perdu)
             if (!isSubscribed) await subscribeUser();
             return;
        }
        if (permission === 'denied') {
             toast.error("Notification permission was denied. Please enable it in your browser settings.");
             return;
        }
         // Demander la permission si 'default'
        const newPermission = await Notification.requestPermission();
        setPermission(newPermission); // Mettre à jour l'état local
        if (newPermission === 'granted') {
            logger.info("Notification permission granted.");
            await subscribeUser(); // S'abonner automatiquement après accord
        } else {
            logger.warn("Notification permission denied.");
            toast.warning("Notifications permission denied.");
        }
    };

    // --- Rendu Optionnel (pour un bouton dans Settings par exemple) ---
    // Normalement, l'abonnement se ferait après permission sans bouton manuel,
    // mais un bouton peut servir à retenter ou à gérer la désinscription.
    // Si tu veux juste l'enregistrement automatique en arrière-plan, tu n'as pas besoin de retourner de JSX.
    // Ce composant peut juste être inclus dans le layout pour exécuter les effets.

    // Exemple de bouton à mettre dans SettingsPanel si besoin:
    /*
    if (!vapidPublicKey) return <p>Notifications non configurées.</p>; // Ne rien afficher si VAPID non configuré

    if (isLoading || isSubscriptionLoading || isProcessing) {
        return <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</Button>;
    }

    if (permission === 'denied') {
         return <Button variant="destructive" disabled>Notifications Blocked</Button>;
    }

    if (!isSubscribed && permission !== 'granted') {
         return <Button onClick={handlePermissionRequest}>Enable Notifications</Button>;
    }

    if (isSubscribed) {
        return <Button variant="outline" onClick={unsubscribeUser}>Disable Notifications</Button>;
    }

    // Cas où permission = 'granted' mais isSubscribed = false (rare, peut arriver si l'abonnement expire)
     if (permission === 'granted' && !isSubscribed) {
         return <Button onClick={subscribeUser}>Re-enable Notifications</Button>;
     }

     return null; // Ou un état par défaut
     */

    // Si le composant gère juste la logique en arrière-plan, retourne null
    return null;
};

export default PushSubscriptionManager;