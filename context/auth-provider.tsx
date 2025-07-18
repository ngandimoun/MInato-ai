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
import { Session, User as SupabaseUser, SupabaseClient } from "@supabase/supabase-js";
import { User } from "@/lib/types";
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

interface AuthContextType {
supabaseClient: SupabaseClient<any, "public", any>;
session: Session | null;
user: SupabaseUser | null;
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
const [user, setUser] = useState<SupabaseUser | null>(null);
const [profile, setProfile] = useState<UserProfile | null>(null);
const [state, setState] = useState<UserState | null>(null);
const [isLoading, setIsLoading] = useState(true); // Gère le chargement initial de la session Supabase
const [isFetchingProfile, setIsFetchingProfile] = useState(false); // Gère le chargement du profil/état de l'API
const createDefaultUserState = useCallback(
(
userId: string,
userEmail?: string | null,
userName?: string | null,
avatarUrl?: string | null
): UserState => {
const firstName = userName?.split(" ")[0] || DEFAULT_USER_NAME;
return {
user_id: userId,
onboarding_complete: false,
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
googlecalendarenabled: false,
googleemailenabled: false,
chainedvoice: appConfig.openai?.ttsDefaultVoice ?? "default_voice_id",
toolconfirmation: false,
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
setIsFetchingProfile(false);
return;
}
if (profile && state && !force) {
logger.debug(
`[AuthProvider] Profile/state already loaded and not forcing refresh for user ${user.id.substring(0, 8)}.`
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
    const response = await fetch("/api/user/profile"); 

    if (!response.ok) {
      let errorDetail = `HTTP error ${response.status}`;
      let errorBodyText = "Could not read error response body.";
      try {
          errorBodyText = await response.text();
          const errorData = JSON.parse(errorBodyText);
          errorDetail = errorData.error || JSON.stringify(errorData);
      } catch (e) {
          errorDetail = errorBodyText.substring(0,200) || `HTTP ${response.status}`;
      }
      logger.error(
        `[AuthProvider] API error (${
          response.status
        }) fetching profile/state for user ${user.id.substring(0, 8)}:`,
        errorDetail
      );

      if (response.status === 401) {
        logger.warn(
          `[AuthProvider] Unauthorized (401) fetching profile. Session might be stale. Signing out.`
        );
        await supabaseClient.auth.signOut(); 
        return;
      }
      if (response.status === 404) {
        logger.warn(
          `[AuthProvider] Profile/state not found (404) for user ${user.id.substring(
            0,
            8
          )}. This might be a new user.`
        );
        setProfile({ id: user.id, email: user.email }); 
        setState(
          createDefaultUserState(
            user.id,
            user.email,
            user.user_metadata?.full_name
          )
        );
      } else {
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
      error.message,
      // Log the error object itself for more details if it's not a simple string message
      error 
    );
    toast({
      title: "Error Loading Profile",
      // Display a more generic message to the user for "TypeError: Failed to fetch"
      description: error.message === "Failed to fetch" ? "Could not connect to the server. Please check your internet connection." : error.message,
      variant: "destructive",
    });
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
[user, session, supabaseClient, createDefaultUserState, profile, state]

);
useEffect(() => {
let isMounted = true;
let authListener: { subscription: { unsubscribe: () => void } } | null = null;

const initializeAuth = async () => {
  try {
    setIsLoading(true);
    const { data: { session: initialSession } } = await supabaseClient.auth.getSession();
    
    if (!isMounted) return;
    
    logger.debug(
      "[AuthProvider Mount] Initial Supabase session state:",
      initialSession
        ? `User: ${initialSession.user.id.substring(0, 8)}`
        : "No session"
    );
    
    setSession(initialSession);
    setUser(initialSession?.user ?? null);
    setIsLoading(false);
  } catch (error) {
    logger.error("[AuthProvider Mount] Error getting initial session:", error);
    if (isMounted) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
    }
  }
};

// Initialize auth state
initializeAuth();

// Set up auth state listener
const { data: listener } = supabaseClient.auth.onAuthStateChange(
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
    setIsLoading(false);

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
      if (_event === "SIGNED_IN" || previousUserId !== newSession.user.id) {
        setProfile(null);
        setState(null);
      }
    }
  }
);

authListener = listener;

return () => {
  isMounted = false;
  if (authListener?.subscription?.unsubscribe) {
    authListener.subscription.unsubscribe();
  }
};

}, [supabaseClient]); // Removed user?.id to prevent unnecessary re-subscriptions
useEffect(() => {
if (!isLoading && user && (!profile || !state)) {
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
setIsFetchingProfile(true);
try {
logger.info(
`[AuthProvider updateProfileState] Sending updates for user ${user.id.substring(0, 8)}...`,
Object.keys(updates)
);
const response = await fetch("/api/user/profile", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(updates),
});
if (!response.ok) {
let errorDetail = `Failed to update user data (${response.status})`;
try {
const errorData = await response.json();
errorDetail = errorData.error || JSON.stringify(errorData);
} catch (e) {
// If JSON parse fails, use status text or a generic message
errorDetail = response.statusText || `HTTP error ${response.status}`;
}
throw new Error(errorDetail);
}
const updatedData = await response.json();
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
[session, user, createDefaultUserState, state, profile]
);
const value = useMemo(
() => ({
supabaseClient,
session,
user,
profile,
state,
isLoading: isLoading || (user != null && isFetchingProfile),
isFetchingProfile,
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