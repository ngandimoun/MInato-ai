// FICHIER : hooks/useAuth.ts
'use client';

import {
    useState,
    useEffect,
    useCallback,
    createContext,
    useContext,
    ReactNode,
    useMemo
} from 'react';
// Hooks et types Clerk
import { useUser, useClerk, useSession as useClerkSession } from "@clerk/nextjs";
import { SessionResource, UserResource } from '@clerk/types';
// Vos types applicatifs
import { UserProfile, UserState, OpenAITtsVoice, OpenAIRealtimeVoice } from '@/lib/types';
// Autres imports
import { toast } from 'sonner';
import { appConfig } from '@/lib/config';
import { logger } from '@/memory-framework/config'; // Logger partagé

// --- Interface pour la Valeur du Contexte ---
interface AuthContextType {
    session: SessionResource | null | undefined; // Session Clerk
    user: UserResource | null | undefined;       // Utilisateur Clerk
    profile: UserProfile | null;     // Profil depuis votre DB (peut être null temporairement)
    state: UserState | null;         // État depuis votre DB (devrait exister après onboarding)
    isLoading: boolean;              // État de chargement global (Clerk + Fetch)
    isOnboardingComplete: boolean;   // Dérivé de l'état DB ou Clerk metadata
    // signOut: () => Promise<void>; // Optionnel: Exposer la déconnexion Clerk
    fetchUserProfileAndState: (sessionToken?: string | null) => Promise<void>; // Pour refresh manuel
    updateProfileState: (updates: Partial<UserProfile & UserState>) => Promise<boolean>; // Pour mettre à jour
}

// --- Création du Contexte ---
const AppAuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Composant AuthProvider ---
interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    // Hooks Clerk
    const { isLoaded: isClerkLoaded, user } = useUser();
    const { session } = useClerkSession();
    const { signOut: clerkSignOut } = useClerk();

    // États locaux pour les données du backend
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [state, setState] = useState<UserState | null>(null);
    const [isLoading, setIsLoading] = useState(true); // True tant que Clerk ou le 1er fetch n'est pas terminé
    const [hasFetchedData, setHasFetchedData] = useState(false); // Flag pour le premier fetch

     // Fonction pour initialiser un état utilisateur minimal par défaut
     const initializeMinimalState = useCallback((userId: string): UserState => ({
        user_id: userId,
        onboarding_complete: false, // Défaut important
        active_persona_id: 'default',
        preferred_locale: appConfig.defaultLocale || 'en-US',
        last_interaction_at: null,
        user_first_name: null,
        latitude: null,
        longitude: null,
        timezone: null,
        country_code: null,
        notifications_enabled: true,
        googleCalendarEnabled: false,
        googleEmailEnabled: false,
        chainedVoice: appConfig.openai.ttsVoiceDefault as OpenAITtsVoice,
        realtimeVoice: appConfig.openai.realtimeDefaultVoice as OpenAIRealtimeVoice,
        toolConfirmation: false,
    }), []); // Aucune dépendance externe nécessaire

    // Fonction pour récupérer profil/état depuis l'API backend
    const fetchUserProfileAndState = useCallback(async (sessionTokenFromParam?: string | null) => {
        // Tenter de récupérer le token et l'ID utilisateur
        let token: string | null | undefined = sessionTokenFromParam;
        if (!token) {
            try {
                token = await session?.getToken();
            } catch (tokenError) {
                logger.error("[useAuth fetchUserProfileAndState] Error getting session token:", tokenError);
                token = null; // Assurer que le token est null en cas d'erreur
            }
        }
        const currentUserId = user?.id;

        // Si pas d'ID ou de token, nettoyer et arrêter
        if (!currentUserId || !token) {
            logger.warn("[useAuth fetchUserProfileAndState] No user ID or token, clearing profile/state.");
            setProfile(null);
            setState(null);
            setHasFetchedData(true);
            setIsLoading(false);
            return;
        }

        // Indiquer le chargement seulement si ce n'est pas déjà en cours (pour éviter clignotements)
        // setIsLoading(true); // Peut être activé si nécessaire

        try {
            logger.info(`[useAuth fetchUserProfileAndState] Fetching profile/state for user: ${currentUserId.substring(0, 8)}...`);
            const response = await fetch('/api/user/profile', {
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                 if (response.status === 404) {
                     // Cas normal juste après l'onboarding ou si le webhook est lent/a échoué
                     logger.warn(`[useAuth fetchUserProfileAndState] User data not found (404) for user ${currentUserId.substring(0, 8)}. Profile sync likely pending.`);
                     // Ne pas écraser les données locales si elles existent déjà !
                     // Initialiser seulement si les états locaux sont VRAIMENT null.
                     if (profile === null) {
                         setProfile({ id: currentUserId, email: user?.primaryEmailAddress?.emailAddress });
                         logger.debug("[useAuth fetchUserProfileAndState] Local profile initialized minimally due to 404 and no existing local profile.");
                     }
                     if (state === null) {
                         setState(initializeMinimalState(currentUserId));
                         logger.debug("[useAuth fetchUserProfileAndState] Local state initialized minimally due to 404 and no existing local state.");
                     }
                 } else {
                    // Gérer les autres erreurs HTTP
                    const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                    throw new Error(errorData.error || `Failed to fetch user data (${response.status})`);
                 }
            } else {
                 // Traitement de la réponse 200 OK
                 const data = await response.json();
                 const fetchedProfile = data.profile; // Peut être null
                 const fetchedState = data.state;     // Devrait exister après onboarding

                 // Mise à jour du Profil
                 if (fetchedProfile) {
                     // Optionnel: comparer pour éviter re-render si pas de changement
                     // if (JSON.stringify(fetchedProfile) !== JSON.stringify(profile)) {
                          setProfile(fetchedProfile);
                          logger.debug("[useAuth fetchUserProfileAndState] Local profile updated from API response.");
                     // }
                 } else {
                      // Profil null reçu, mais réponse OK (cas post-onboarding avant webhook)
                      logger.warn(`[useAuth fetchUserProfileAndState] Profile null in 200 response for user ${currentUserId.substring(0,8)}. Keeping local profile if exists.`);
                      // Si on n'a pas de profil local non plus, on initialise minimalement
                      if (profile === null) {
                           setProfile({ id: currentUserId, email: user?.primaryEmailAddress?.emailAddress });
                           logger.debug("[useAuth fetchUserProfileAndState] Local profile initialized minimally (API returned null profile).");
                      }
                 }

                 // Mise à jour de l'État
                 if (fetchedState) {
                    // Optionnel: comparer pour éviter re-render si pas de changement
                    // if (JSON.stringify(fetchedState) !== JSON.stringify(state)) {
                         // Assurer la fusion avec les valeurs par défaut pour tous les champs
                         const mergedState: UserState = {
                             user_id: currentUserId,
                             onboarding_complete: fetchedState.onboarding_complete ?? false,
                             active_persona_id: fetchedState.active_persona_id || 'default',
                             preferred_locale: fetchedState.preferred_locale || appConfig.defaultLocale || 'en-US',
                             last_interaction_at: fetchedState.last_interaction_at || null,
                             user_first_name: fetchedState.user_first_name || profile?.first_name || user?.firstName || null, // Prendre depuis state, puis profil, puis clerk
                             latitude: fetchedState.latitude ?? null,
                             longitude: fetchedState.longitude ?? null,
                             timezone: fetchedState.timezone || null,
                             country_code: fetchedState.country_code || null,
                             require_tool_confirmation: fetchedState.require_tool_confirmation ?? false,
                             notifications_enabled: fetchedState.notifications_enabled ?? true,
                             googleCalendarEnabled: fetchedState.googleCalendarEnabled ?? false,
                             googleEmailEnabled: fetchedState.googleEmailEnabled ?? false,
                             chainedVoice: (fetchedState.chainedVoice || appConfig.openai.ttsVoiceDefault) as OpenAITtsVoice,
                             realtimeVoice: (fetchedState.realtimeVoice || appConfig.openai.realtimeDefaultVoice) as OpenAIRealtimeVoice,
                             toolConfirmation: fetchedState.toolConfirmation ?? false,
                         };
                         setState(mergedState);
                         logger.debug("[useAuth fetchUserProfileAndState] Local state updated/merged from API response.");
                    // }
                 } else {
                      // État null reçu (ce qui est inattendu si l'onboarding a MAJ user_states)
                      logger.error(`[useAuth fetchUserProfileAndState] State is null in 200 response for user ${currentUserId.substring(0,8)}! Check API/DB.`);
                      // Initialiser si l'état local est aussi null
                      if (state === null) {
                           setState(initializeMinimalState(currentUserId));
                           logger.debug("[useAuth fetchUserProfileAndState] Local state initialized minimally (API returned null state).");
                      }
                 }
            }
            // Marquer comme fetché après succès ou gestion 404
            setHasFetchedData(true);

        } catch (error: any) {
            console.error("[useAuth fetchUserProfileAndState] Catch Block - Error fetching data:", error);
            toast.error(`Error loading user data: ${error.message}`);
            // Marquer comme fetché même en cas d'erreur pour éviter boucle infinie potentielle
            setHasFetchedData(true);
        } finally {
             // Toujours arrêter le chargement après une tentative de fetch
             setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, user, profile, state, initializeMinimalState]); // Dépendances: session Clerk, user Clerk, et états locaux profile/state

    // --- Effet pour déclencher le fetch initial et gérer la déconnexion ---
    useEffect(() => {
        // Attendre que Clerk soit prêt
        if (!isClerkLoaded) {
            setIsLoading(true);
            return;
        }

        // Cas: Clerk chargé, utilisateur déconnecté
        if (isClerkLoaded && !user) {
            if (profile !== null || state !== null) { // Nettoyer seulement si nécessaire
                 logger.info("[useAuth Effect] User signed out, clearing local profile/state.");
                 setProfile(null);
                 setState(null);
            }
            setIsLoading(false);
            setHasFetchedData(false); // Prêt pour le prochain login
            return;
        }

        // Cas: Clerk chargé, utilisateur connecté, premier fetch nécessaire
        if (isClerkLoaded && user && !hasFetchedData) {
             logger.info(`[useAuth Effect] User ${user.id.substring(0,8)} signed in, initiating first data fetch.`);
             setIsLoading(true); // Assurer l'état de chargement
             fetchUserProfileAndState(); // Déclencher le fetch
        }
        // Cas: Clerk chargé, utilisateur connecté, données déjà récupérées (ou tentative effectuée)
        else if (isClerkLoaded && user && hasFetchedData) {
            // Si on est déjà passé par ici, on s'assure juste que isLoading est false
             if (isLoading) setIsLoading(false);
        }

    // Dépendances clés: état de chargement Clerk, objet utilisateur Clerk, flag hasFetchedData
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isClerkLoaded, user, hasFetchedData, fetchUserProfileAndState]);

    // --- Fonction de Déconnexion (utilise Clerk) ---
    const handleSignOut = useCallback(async () => {
        setIsLoading(true); // Indiquer le chargement pendant la déconnexion
        try {
            await clerkSignOut(() => {
                 // Ce callback s'exécute APRÈS la déconnexion Clerk réussie
                 // Nettoyage explicite des états locaux
                 setProfile(null);
                 setState(null);
                 setHasFetchedData(false); // Réinitialiser pour la prochaine session
                 setIsLoading(false); // Arrêter le chargement
                 toast.success("Signed out successfully.");
                 logger.info("[useAuth] User signed out via clerkSignOut callback.");
                 // La redirection est gérée par Clerk (ex: <UserButton afterSignOutUrl="/" />)
            });
        } catch (error: any) {
            console.error("Error signing out with Clerk:", error);
            toast.error(`Sign-out failed: ${error.message}`);
            setIsLoading(false); // Arrêter le chargement en cas d'erreur
        }
    }, [clerkSignOut]);

    // --- Fonction pour mettre à jour Profil/État via l'API Backend ---
    const updateProfileState = useCallback(async (updates: Partial<UserProfile & UserState>): Promise<boolean> => {
        if (!session || !user) {
            toast.error("Not authenticated to update settings.");
            return false;
        }
        setIsLoading(true);
        let success = false;
        try {
            const token = await session.getToken();
            if (!token) {
                throw new Error("Authentication token unavailable for update.");
            }
            logger.info(`[useAuth updateProfileState] Sending updates for user ${user.id.substring(0,8)}...`, Object.keys(updates));
            const response = await fetch('/api/user/profile', {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token}`
                 },
                 body: JSON.stringify(updates)
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: "Unknown update error" }));
                 throw new Error(errorData.error || `Failed to update user data (${response.status})`);
            }
            logger.info(`[useAuth updateProfileState] Update API call successful. Refreshing local data...`);
            // Rafraîchir les données locales pour refléter immédiatement les changements
            await fetchUserProfileAndState(token);
            toast.success("Settings updated successfully!");
            success = true;
        } catch (error: any) {
            console.error("[useAuth updateProfileState] Error updating profile/state:", error);
            toast.error(`Update failed: ${error.message}`);
            success = false;
        } finally {
             setIsLoading(false);
        }
        return success;
    }, [session, user, fetchUserProfileAndState]); // Dépendances correctes

    // --- État Dérivé ---
    // Utiliser l'état local `state` OU les métadonnées Clerk comme fallback
    const isOnboardingComplete = state?.onboarding_complete ?? (user?.publicMetadata?.onboardingComplete as boolean) ?? false;

    // --- Valeur du Contexte ---
    const value: AuthContextType = useMemo(() => ({
        session: session,       // Session Clerk
        user: user,             // Utilisateur Clerk
        profile,                // Votre profil DB
        state,                  // Votre état DB
        isLoading,
        isOnboardingComplete,
        // signOut: handleSignOut, // Exposer si besoin de déconnexion programmatique
        fetchUserProfileAndState,
        updateProfileState
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [session, user, profile, state, isLoading, isOnboardingComplete, /*handleSignOut,*/ fetchUserProfileAndState, updateProfileState]);

    // --- Rendu du Provider ---
    return (
        <AppAuthContext.Provider value={value}>
            {children}
        </AppAuthContext.Provider>
    );
};

// --- Hook Personnalisé pour utiliser le contexte ---
export const useAuth = (): AuthContextType => {
    const context = useContext(AppAuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};