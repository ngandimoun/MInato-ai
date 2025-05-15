// FILE: context/auth-provider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  UserProfile,
  UserState,
  OpenAITtsVoice,
  OpenAIRealtimeVoice,
  // UserWorkflowPreferences, // Non utilisé directement ici, mais le type UserState le contient
} from "@/lib/types";
import { toast } from "@/components/ui/use-toast";
import { logger } from "@/memory-framework/config";
import { appConfig } from "@/lib/config";
import { DEFAULT_USER_NAME, DEFAULT_PERSONA_ID } from "@/lib/constants";
import { any } from "zod";

interface AuthContextType {
  supabaseClient: SupabaseClient<any, "public", any>;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  state: UserState | null;
  isLoading: boolean; // Indique le chargement initial de la session/profil
  isFetchingProfile: boolean; // Indique si le profil/état est en cours de récupération
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUserProfileAndState: (force?: boolean) => Promise<void>;
  updateProfileState: (
    updates: Partial<UserProfile & UserState>
  ) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabaseClient = getBrowserSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [state, setState] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Gère le chargement initial de la session Supabase
  const [isFetchingProfile, setIsFetchingProfile] = useState(false); // Gère le chargement du profil/état de l'API

  const createDefaultUserState = useCallback(
    (
      userId: string,
      userEmail?: string | null, // Rendre optionnel et nullable
      userName?: string | null, // Rendre optionnel et nullable
      avatarUrl?: string | null // Rendre optionnel et nullable
    ): UserState => {
      const firstName = userName?.split(" ")[0] || DEFAULT_USER_NAME;
      return {
        user_id: userId,
        onboarding_complete: false, // Default to false, API or user actions will set to true
        active_persona_id: DEFAULT_PERSONA_ID,
        preferred_locale: appConfig.defaultLocale || "en-US",
        last_interaction_at: new Date().toISOString(),
        user_first_name: firstName,
        latitude: null,
        longitude: null,
        timezone: null,
        country_code: null,
        require_tool_confirmation: false,
        notifications_enabled: true,
        googleCalendarEnabled: false,
        googleEmailEnabled: false,
        chainedVoice: appConfig.openai?.ttsDefaultVoice ?? "default_voice_id",
        realtimeVoice: appConfig.openai.realtimeDefaultVoice,
        toolConfirmation: false,
        workflow_preferences: null,
      };
    },
    []
  );

  const fetchUserProfileAndState = useCallback(
    async (force: boolean = false) => {
      if (!user || !session) {
        logger.debug(
          "[AuthProvider] No user/session to fetch profile/state. Clearing local state."
        );
        setProfile(null);
        setState(null);
        setIsFetchingProfile(false); // Assurer que le chargement du profil est terminé
        return;
      }
      // Si `profile` et `state` sont déjà chargés et qu'on ne force pas, on ne fait rien.
      if (profile && state && !force) {
        logger.debug(
          `[AuthProvider] Profile/state already loaded and not forcing refresh for user ${user.id.substring(
            0,
            8
          )}.`
        );
        setIsFetchingProfile(false);
        return;
      }

      logger.info(
        `[AuthProvider] Fetching profile/state for user: ${user.id.substring(
          0,
          8
        )} (Force: ${force})`
      );
      setIsFetchingProfile(true);

      try {
        const response = await fetch("/api/user/profile"); // Endpoint qui retourne { profile, state }

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: `HTTP error ${response.status}` }));
          logger.error(
            `[AuthProvider] API error (${
              response.status
            }) fetching profile/state for user ${user.id.substring(0, 8)}:`,
            errorData.error
          );

          if (response.status === 401) {
            logger.warn(
              `[AuthProvider] Unauthorized (401) fetching profile. Session might be stale. Signing out.`
            );
            await supabaseClient.auth.signOut(); // Déconnexion si 401
            return;
          }
          // Si 404, l'API n'a pas trouvé de profil, ce qui peut être normal pour un nouvel utilisateur
          // La logique de création de profil/état par défaut est gérée par l'API POST /api/user/profile
          // Ici, on met juste les états locaux à null ou un état par défaut minimal.
          if (response.status === 404) {
            logger.warn(
              `[AuthProvider] Profile/state not found (404) for user ${user.id.substring(
                0,
                8
              )}. This might be a new user.`
            );
            setProfile({ id: user.id, email: user.email }); // Profil minimal
            setState(
              createDefaultUserState(
                user.id,
                user.email,
                user.user_metadata?.full_name
              )
            );
          } else {
            // Pour les autres erreurs, on pourrait utiliser un état d'erreur plus spécifique
            // ou juste les valeurs par défaut.
            setProfile(profile || { id: user.id, email: user.email });
            setState(
              state ||
                createDefaultUserState(
                  user.id,
                  user.email,
                  user.user_metadata?.full_name
                )
            );
          }
          // throw new Error(errorData.error || `Failed to fetch profile/state (${response.status})`);
        } else {
          const data = await response.json();
          const fetchedProfile: UserProfile | null = data.profile;
          const fetchedState: UserState | null = data.state;

          setProfile(
            fetchedProfile || {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || DEFAULT_USER_NAME,
            }
          );

          const defaultStateForMerge = createDefaultUserState(
            user.id,
            user.email,
            fetchedProfile?.full_name
          );
          const effectiveState = fetchedState
            ? {
                ...defaultStateForMerge,
                ...fetchedState,
                onboarding_complete:
                  typeof fetchedState.onboarding_complete === "boolean"
                    ? fetchedState.onboarding_complete
                    : defaultStateForMerge.onboarding_complete,
              }
            : defaultStateForMerge;

          setState(effectiveState);
          logger.info(
            `[AuthProvider] Successfully fetched profile/state for user ${user.id.substring(
              0,
              8
            )}. Onboarding: ${effectiveState.onboarding_complete}`
          );
        }
      } catch (error: any) {
        logger.error(
          "[AuthProvider] Exception fetching profile/state data:",
          error.message
        );
        toast({
          title: "Error Loading Profile",
          description: error.message,
          variant: "destructive",
        });
        // S'assurer que profile et state ont des valeurs par défaut même en cas d'erreur
        setProfile(profile || { id: user.id, email: user.email });
        setState(
          state ||
            createDefaultUserState(
              user.id,
              user.email,
              user.user_metadata?.full_name
            )
        );
      } finally {
        setIsFetchingProfile(false);
      }
    },
    [user, session, supabaseClient, createDefaultUserState, profile, state] // Ajout de profile et state pour la condition de non-rechargement
  );

  // Gère l'état d'authentification initial et les changements
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true); // Commence par charger la session Supabase

    supabaseClient.auth
      .getSession()
      .then((response: { data: { session: Session | null } }) => {
        const { session: initialSession } = response.data;
        if (!isMounted) return;
        logger.debug(
          "[AuthProvider Mount] Initial Supabase session state:",
          initialSession
            ? `User: ${initialSession.user.id.substring(0, 8)}`
            : "No session"
        );
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setIsLoading(false); // Fin du chargement de la session Supabase
        // Le fetch du profil/état sera déclenché par l'effet suivant si user est défini
      });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (_event: any, newSession: any) => {
        if (!isMounted) return;
        logger.info(
          `[AuthProvider onAuthStateChange] Event: ${_event}`,
          newSession?.user
            ? `User: ${newSession.user.id.substring(0, 8)}`
            : "No session"
        );

        const previousUserId = user?.id;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false); // L'état de la session Supabase est maintenant connu

        if (_event === "SIGNED_OUT") {
          setProfile(null);
          setState(null);
        } else if (
          newSession &&
          (_event === "SIGNED_IN" ||
            _event === "USER_UPDATED" ||
            _event === "TOKEN_REFRESHED" ||
            previousUserId !== newSession.user.id)
        ) {
          // Si l'utilisateur change ou si c'est une nouvelle connexion/mise à jour, on force un re-fetch.
          // La condition !profile || !state n'est pas nécessaire ici si on veut toujours re-fetch au SIGNED_IN.
          // Ou on peut la garder pour optimiser si le profil est déjà là et qu'on ne veut pas re-fetch sur TOKEN_REFRESHED.
          // Pour la robustesse, re-fetcher sur SIGNED_IN est une bonne idée.
          if (_event === "SIGNED_IN" || previousUserId !== newSession.user.id) {
            setProfile(null); // Clear old profile on user change
            setState(null); // Clear old state on user change
            // Le fetch sera déclenché par l'effet ci-dessous
          }
        }
      }
    );
    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabaseClient, user?.id]); // user?.id pour réagir au changement d'utilisateur

  // Gère le fetch du profil/état après que l'utilisateur soit connu (et après le chargement de la session Supabase)
  useEffect(() => {
    if (!isLoading && user && (!profile || !state)) {
      // Condition modifiée : fetch si user existe et profil/état pas encore là
      fetchUserProfileAndState();
    }
  }, [isLoading, user, profile, state, fetchUserProfileAndState]);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // La redirection est gérée par Supabase, onAuthStateChange mettra à jour l'état.
    } catch (error: any) {
      logger.error("Error signing in with Google:", error);
      toast({
        title: "Login Error",
        description: error.message || "Could not sign in with Google.",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      logger.info(
        "[AuthProvider signOut] User signed out successfully via Supabase."
      );
      // onAuthStateChange gérera la mise à jour de l'état local (session, user, profile, state -> null)
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error: any) {
      logger.error("Error signing out:", error);
      toast({
        title: "Sign Out Error",
        description: error.message || "Could not sign out.",
        variant: "destructive",
      });
    }
  };

  const updateProfileState = useCallback(
    async (updates: Partial<UserProfile & UserState>): Promise<boolean> => {
      if (!session || !user) {
        toast({
          title: "Update Error",
          description: "Not authenticated.",
          variant: "destructive",
        });
        return false;
      }
      setIsFetchingProfile(true); // Indiquer un chargement pendant la mise àjour
      try {
        logger.info(
          `[AuthProvider updateProfileState] Sending updates for user ${user.id.substring(
            0,
            8
          )}...`,
          Object.keys(updates)
        );
        const response = await fetch("/api/user/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown update error" }));
          throw new Error(
            errorData.error || `Failed to update user data (${response.status})`
          );
        }
        const updatedData = await response.json();
        // Mettre à jour l'état local avec les données retournées par l'API
        if (updatedData.profile) setProfile(updatedData.profile);
        if (updatedData.state) {
          const defaultStateIfNeeded =
            state ||
            createDefaultUserState(user.id, user.email, profile?.full_name);
          setState({
            ...defaultStateIfNeeded,
            ...updatedData.state,
            onboarding_complete:
              typeof updatedData.state.onboarding_complete === "boolean"
                ? updatedData.state.onboarding_complete
                : defaultStateIfNeeded.onboarding_complete,
          } as UserState);
        }
        logger.info(
          `[AuthProvider updateProfileState] Update API call successful. Local data refreshed.`
        );
        toast({
          title: "Settings Updated",
          description: "Your changes have been saved.",
        });
        return true;
      } catch (error: any) {
        logger.error(
          "[AuthProvider updateProfileState] Error updating profile/state:",
          error
        );
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      } finally {
        setIsFetchingProfile(false);
      }
    },
    [session, user, createDefaultUserState, state, profile] // state et profile ajoutés car utilisés pour le merge
  );

  const value = useMemo(
    () => ({
      supabaseClient,
      session,
      user,
      profile,
      state,
      isLoading: isLoading || (user != null && isFetchingProfile), // isLoading est vrai si session Supabase charge OU si profil/état charge
      isFetchingProfile, // Exposer cet état si nécessaire
      signInWithGoogle,
      signOut,
      fetchUserProfileAndState,
      updateProfileState,
    }),
    [
      supabaseClient,
      session,
      user,
      profile,
      state,
      isLoading,
      isFetchingProfile,
      fetchUserProfileAndState,
      updateProfileState,
      signInWithGoogle,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
