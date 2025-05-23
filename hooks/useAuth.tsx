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
const [isLoading, setIsLoading] = useState(true);
const [isFetchingProfile, setIsFetchingProfile] = useState(false);
const [initialLoadDone, setInitialLoadDone] = useState(false);
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
realtimevoice: null, // Explicitly null or appConfig.openai?.realtimeDefaultVoice
toolconfirmation: false,
workflow_preferences: null,
};
},
[]
);
const fetchUserProfileAndState = useCallback(
async (forceRefresh = false) => {
const currentSessionUser = session?.user; // Capture session.user at the start
if (!forceRefresh && profile && state) {
logger.debug(
`[AuthContext] Data already loaded for user ${currentSessionUser?.id?.substring(0,8)}, skipping refresh unless forced.`
);
setIsFetchingProfile(false);
return;
}
// Use the specific loading flag for this operation
setIsFetchingProfile(true);
let timeoutId: NodeJS.Timeout | null = null;
const timeoutPromise = new Promise((_, reject) => {
timeoutId = setTimeout(
() => reject(new Error("User data load timed out (15s).")),
15000
);
});
try {
await Promise.race([
(async () => {
// Re-fetch session or use existing user from state if still valid
const {
data: { session: freshestSession },
error: sessionError,
} = await supabaseClient.auth.getSession();
let currentUserToFetchFor = freshestSession?.user || user; // Prefer freshest, fallback to hook's user state
if (sessionError) {
logger.error(
`[AuthContext] Error getting session during profile fetch: ${sessionError.message}`
);
// Potentially clear user if session is truly gone
if (!freshestSession) setUser(null);
}
if (!currentUserToFetchFor && !user) { // If no user at all (hook's user also null)
logger.warn("[AuthContext] No user to fetch profile for. Clearing profile/state.");
setProfile(null);
setState(null);
return;
}
// If hook's user is null, but freshestSession.user exists, update hook's user
if (!user && freshestSession?.user) {
setUser(freshestSession.user);
currentUserToFetchFor = freshestSession.user;
}
// If still no user after all checks, abort.
if (!currentUserToFetchFor) {
logger.warn("[AuthContext] Still no user after session checks. Aborting profile fetch.");
setProfile(null);
setState(null);
return;
}
logger.info(
`[AuthContext] Fetching profile and state via API for user: ${currentUserToFetchFor.id.substring(0, 8)}`
);
const response = await fetch("/api/user/profile");
if (!response.ok) {
let errorDetail = `HTTP error ${response.status}`;
let errorBodyText = "Could not read error response body.";
try {
errorBodyText = await response.text();
const errorData = JSON.parse(errorBodyText);
errorDetail = errorData.error || JSON.stringify(errorData);
} catch (e) {
errorDetail =
errorBodyText.substring(0, 200) || `HTTP ${response.status}`;
}
logger.error(
`[AuthContext] API error (${response.status}) fetching profile/state for user ${currentUserToFetchFor.id.substring(0, 8)}: ${errorDetail}`
);
if (response.status === 401) {
logger.warn(
`[AuthContext] Unauthorized (401) fetching profile. Session might be stale. User: ${currentUserToFetchFor.id.substring(0, 8)}. Initiating sign-out.`
);
await supabaseClient.auth.signOut(); // This will trigger onAuthStateChange
return; // Don't proceed with setting local state
}
// For 404 or other errors, set default/empty state
setProfile({
id: currentUserToFetchFor.id,
email: currentUserToFetchFor.email,
});
setState(
createDefaultUserState(
currentUserToFetchFor.id,
currentUserToFetchFor.email,
currentUserToFetchFor.user_metadata?.full_name
)
);
if (response.status !== 404) { // Don't toast for 404 (new user)
toast({
title: "Failed to load profile data",
description: errorDetail,
variant: "destructive",
});
}
} else {
const data = await response.json();
const fetchedProfile: UserProfile | null = data.profile;
const fetchedState: UserState | null = data.state;
setProfile(
fetchedProfile || {
id: currentUserToFetchFor.id,
email: currentUserToFetchFor.email,
full_name:
currentUserToFetchFor.user_metadata?.full_name ||
DEFAULT_USER_NAME,
}
);
const defaultStateForMerge = createDefaultUserState(
currentUserToFetchFor.id,
currentUserToFetchFor.email,
fetchedProfile?.full_name ||
currentUserToFetchFor.user_metadata?.full_name
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
`[AuthContext] Successfully fetched profile/state for user ${currentUserToFetchFor.id.substring(0, 8)}. Onboarding: ${effectiveState.onboarding_complete}`
);
}
})(),
timeoutPromise,
]);
} catch (e) {
logger.error(
`[AuthContext] Failed to fetch user profile/state (Promise.race outcome): ${e instanceof Error ? e.message : String(e)}`
);
toast({
title: "Failed to load account data",
description: e instanceof Error ? e.message : String(e),
variant: "destructive",
});
// Ensure state is cleared or set to defaults on major fetch error if user context is lost
if (user) { // Only if user was previously set, maintain basic profile shell
setProfile(profile || { id: user.id, email: user.email });
setState(state || createDefaultUserState(user.id, user.email, user.user_metadata?.full_name));
} else {
setProfile(null);
setState(null);
}
} finally {
if (timeoutId) clearTimeout(timeoutId);
setIsFetchingProfile(false); // MODIFIED
setInitialLoadDone(true);
}
},
[supabaseClient, profile, state, user, createDefaultUserState] // Added user and createDefaultUserState for completeness of internal logic
);
useEffect(() => {
let isMounted = true;
setIsLoading(true);
supabaseClient.auth
.getSession()
.then((response: { data: { session: Session | null } }) => {
const { session: initialSession } = response.data;
if (!isMounted) return;
logger.debug(
`[AuthProvider Mount] Initial Supabase session state: ${initialSession ? `User: ${initialSession.user.id.substring(0, 8)}` : "No session"}`
);
setSession(initialSession);
setUser(initialSession?.user ?? null);
setIsLoading(false);
})
.catch((error: any) => {
if (!isMounted) return;
logger.error(
`[AuthProvider Mount] Error getting initial session: ${error}`
);
setSession(null);
setUser(null);
setIsLoading(false);
});
const { data: authListener } = supabaseClient.auth.onAuthStateChange(
async (_event: any, newSession: Session | null) => {
if (!isMounted) return;
logger.info(
`[AuthProvider onAuthStateChange] Event: ${_event}, ${newSession?.user ? `User: ${newSession.user.id.substring(0, 8)}` : "No session"}`
);
const previousUserId = user?.id;
setSession(newSession);
setUser(newSession?.user ?? null);
setIsLoading(false); // Session status is now known
if (_event === "SIGNED_OUT") {
setProfile(null);
setState(null);
setInitialLoadDone(false); // Reset for next sign-in
} else if (
newSession &&
newSession.user &&
(_event === "SIGNED_IN" ||
_event === "USER_UPDATED" ||
_event === "TOKEN_REFRESHED" ||
previousUserId !== newSession.user.id)
) {
if (
_event === "SIGNED_IN" ||
previousUserId !== newSession.user.id
) {
// Clear old profile/state only if user truly changes or it's a fresh sign-in
setProfile(null);
setState(null);
setInitialLoadDone(false); // Force profile reload
}
// Trigger profile fetch. If initialLoadDone is false, the other useEffect will pick it up.
// Or, if it's a token refresh for an existing user, force a profile refresh.
if (_event === "TOKEN_REFRESHED" || (_event === "USER_UPDATED" && initialLoadDone)) {
await fetchUserProfileAndState(true); // Force refresh on token refresh if already loaded
} else if (!initialLoadDone) {
// Handled by the initialLoadDone useEffect
}
}
}
);
return () => {
isMounted = false;
authListener?.subscription?.unsubscribe();
};
}, [supabaseClient]); // Removed user?.id, fetchUserProfileAndState to avoid re-subscribing
useEffect(() => {
if (!isLoading && user && !initialLoadDone) {
// This is the primary trigger for the very first profile load after session is confirmed
fetchUserProfileAndState(false); // Don't force if profile/state might already exist from a quick previous load
}
}, [isLoading, user, initialLoadDone, fetchUserProfileAndState]);
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
`[AuthProvider signOut] User signed out successfully via Supabase.`
);
toast({
title: "Signed Out",
description: "You have been successfully signed out.",
});
// onAuthStateChange will handle clearing user, profile, state
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
const currentSession = session; // Capture current session
const currentUser = user; // Capture current user
if (!currentSession || !currentUser) {
toast({
title: "Update Error",
description: "Not authenticated.",
variant: "destructive",
});
return false;
}
setIsFetchingProfile(true); // Use the specific flag
try {
logger.info(
`[AuthProvider updateProfileState] Sending updates for user ${currentUser.id.substring(0, 8)}... ${Object.keys(updates).join(", ")}`
);
const response = await fetch("/api/user/profile", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(updates),
});
if (!response.ok) {
let errorDetail = `HTTP error ${response.status}`;
try {
const errorData = await response.json();
errorDetail = errorData.error || JSON.stringify(errorData);
} catch (e) {
errorDetail =
response.statusText || `HTTP error ${response.status}`;
}
throw new Error(errorDetail);
}
const updatedData = await response.json();
// Optimistically update local state, but prefer data from API response
setProfile(prevProfile => updatedData.profile ? { ...prevProfile, ...updatedData.profile } : prevProfile);
setState(prevState => {
if (updatedData.state) {
const defaultStateIfNeeded = prevState || createDefaultUserState(currentUser.id, currentUser.email, profile?.full_name);
return {
...defaultStateIfNeeded,
...updatedData.state,
onboarding_complete: typeof updatedData.state.onboarding_complete === "boolean"
? updatedData.state.onboarding_complete
: defaultStateIfNeeded.onboarding_complete,
} as UserState;
}
return prevState;
});
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
`[AuthProvider updateProfileState] Error updating profile/state: ${error}`
);
toast({
title: "Update Failed",
description: error.message,
variant: "destructive",
});
return false;
} finally {
setIsFetchingProfile(false); // Use the specific flag
}
},
[session, user, profile, state, createDefaultUserState] // Added missing dependencies
);
const value = useMemo(
() => ({
supabaseClient,
session,
user,
profile,
state,
isLoading: isLoading, // This is now mostly for initial Supabase session resolution
isFetchingProfile: isFetchingProfile, // Specific to profile/state API calls
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
signInWithGoogle, // signInWithGoogle doesn't change, but included for completeness
signOut, // signOut doesn't change
fetchUserProfileAndState,
updateProfileState,
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