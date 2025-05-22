import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { SupabaseClient, User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getBrowserSupabaseClient } from '@/lib/supabase/client'; // Corrected import
import { UserProfile, UserState } from '@/lib/types'; // Assuming these types exist
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/memory-framework/config'; // Assuming logger

interface AuthContextType {
  supabase: SupabaseClient;
  user: User | null;
  profile: UserProfile | null;
  state: UserState | null;
  isLoading: boolean;
  fetchUserProfileAndState: (forceRefresh?: boolean) => Promise<void>;
  updateProfileState: (updates: Partial<UserProfile & UserState>) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = (props: { children: React.ReactNode }) => {
  const supabase = getBrowserSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [state, setState] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const fetchUserProfileAndState = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && profile && state) {
      logger.debug('[AuthContext] Data already loaded, skipping refresh unless forced.');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("User data load timed out (15s).")), 15000);
    });

    try {
      await Promise.race([
        (async () => {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          let currentUser = session?.user || null;

          if (sessionError) {
            logger.error('[AuthContext] Error getting session:', sessionError.message);
            throw sessionError;
          }
          
          // If no session user, try getUser again to be sure
          if (!currentUser) {
            const { data: { user: userDirect }, error: userDirectError } = await supabase.auth.getUser();
            if (userDirectError) {
               logger.warn('[AuthContext] Error calling getUser directly:', userDirectError.message);
            }
            currentUser = userDirect;
          }

          setUser(currentUser);

          if (currentUser) {
            // Placeholder: Replace with your actual API calls to fetch profile and state
            // These would typically be GET requests to your backend API routes
            // e.g., const profileRes = await fetch('/api/user/profile');
            // const stateRes = await fetch('/api/user/state'); // or similar
            logger.info(`[AuthContext] Fetching profile and state for user: ${currentUser.id.substring(0,8)}`);
            
            // SIMULATED FETCH - REPLACE WITH ACTUAL API CALLS
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
            const fetchedProfile: UserProfile = { id: currentUser.id, full_name: currentUser.email || 'User', /* other fields */ first_name: '' };
            const fetchedState: UserState = { user_id: currentUser.id, active_persona_id: 'default', /* other fields */ preferred_locale: 'en-US', chainedvoice: 'nova', googlecalendarenabled: false, googleemailenabled: false };
            
            setProfile(fetchedProfile);
            setState(fetchedState);
            logger.info('[AuthContext] Profile and state fetched.');

          } else {
            setProfile(null);
            setState(null);
            logger.info('[AuthContext] No user session found. Profile and state cleared.');
          }
        })(),
        timeoutPromise
      ]);
    } catch (e) {
      logger.error('[AuthContext] Failed to fetch user profile/state:', e);
      toast({ title: "Failed to load account data", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      setUser(null); // Clear user on major fetch error
      setProfile(null);
      setState(null);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(false);
      setInitialLoadDone(true);
    }
  }, [supabase]);

  const updateProfileState = useCallback(async (updates: Partial<UserProfile & UserState>): Promise<boolean> => {
    setIsLoading(true);
    logger.info('[AuthContext] Attempting to update profile/state:', updates);
    // Placeholder: Replace with your actual API call to update profile and state
    // e.g., const response = await fetch('/api/user/profile', { method: 'POST', body: JSON.stringify(updates) });
    // if (!response.ok) { /* handle error */ return false; }
    // const updatedData = await response.json();
    // setProfile(updatedData.profile);
    // setState(updatedData.state);
    
    // SIMULATED UPDATE - REPLACE
    await new Promise(resolve => setTimeout(resolve, 300));
    let success = true;
    try {
        setProfile(prev => ({ ...prev, ...updates } as UserProfile)); // Optimistic update
        setState(prev => ({ ...prev, ...updates } as UserState));
    } catch (e) {
        success = false;
        logger.error('[AuthContext] Optimistic update failed client-side (should not happen with proper types):', e);
    }
    
    setIsLoading(false);
    if (success) toast({title: "Settings updated (simulated)"});
    else toast({title: "Failed to update settings (simulated)", variant: "destructive"});
    await fetchUserProfileAndState(true); // Re-fetch to confirm
    return success;
  }, [supabase, fetchUserProfileAndState]);


  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
      setState(null);
      logger.info('[AuthContext] User signed out.');
    } catch (error) {
      logger.error('[AuthContext] Error signing out:', error);
      toast({ title: "Sign out failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!initialLoadDone) {
       fetchUserProfileAndState();
    }
  }, [initialLoadDone, fetchUserProfileAndState]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        logger.info(`[AuthContext] Auth state changed: ${event}`);
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await fetchUserProfileAndState(true);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setState(null);
        }
        if (!isLoading && !session?.user) { // Ensure loading is false if no user after change
            setIsLoading(false);
        }
      }
    );
    return () => {
      authListener?.unsubscribe();
    };
  }, [supabase, fetchUserProfileAndState, isLoading]);

  const value = {
    supabase,
    user,
    profile,
    state,
    isLoading,
    fetchUserProfileAndState,
    updateProfileState,
    signOut,
  };

  return <AuthContext.Provider value={value} {...props} />;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
