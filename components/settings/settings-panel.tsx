//components/settings/settings-panel.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
X, User, Shield, Moon, Palette, Volume2, Calendar, Mail, Laptop, Sun, FileArchive,
FileText, Trash2, ExternalLink, Zap, Check, Info, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PersonaEditorDialog } from "./persona-editor-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from "@/components/ui/card";
import { useTheme } from "./theme-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";
import {
Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/auth-provider";
import { logger } from "@/memory-framework/config";
import { UserPersona as PersonaTypeFromLib, OpenAITtsVoice, UserWorkflowPreferences } from "@/lib/types";
import { appConfig } from "@/lib/config";
import { DEFAULT_USER_NAME, DEFAULT_PERSONA_ID } from "@/lib/constants";
export interface DocumentFile {
id: string;
name: string;
file: File;
type: string;
size: number;
uploadedAt: Date;
}
interface SettingsPanelProps {
onClose: () => void;
uploadedDocuments?: DocumentFile[];
onDeleteDocument?: (id: string) => void;
}
interface UIPersona extends Omit<PersonaTypeFromLib, 'user_id' | 'created_at' | 'updated_at'> {
isCustom: boolean;
voice_id: OpenAITtsVoice | null;
id: string;
name: string;
description?: string;
system_prompt: string;
}
interface ColorPaletteOption {
name: string;
value: string;
primary: string;
secondary: string;
description: string;
}

type GoogleConnectionScope = 'calendar' | 'email' | 'both' | 'disconnect_all' | null;
const formatFileSize = (bytes: number, decimals = 2): string => {
if (bytes === 0) return "0 Bytes";
const k = 1024;
const dm = decimals < 0 ? 0 : decimals;
const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
const i = Math.floor(Math.log(bytes) / Math.log(k));
return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
const ALL_TTS_VOICES_WITH_DESC: { id: OpenAITtsVoice; name: string; description: string }[] = [
{ id: "alloy", name: "Naruto", description: "Energetic and determined." },
{ id: "echo", name: "Sasuke", description: "Cool, composed, and precise." },
{ id: "fable", name: "Hinata", description: "Gentle storyteller with soft expression." },
{ id: "onyx", name: "Madara", description: "Deep and authoritative tone." },
{ id: "nova", name: "Sakura", description: "Bright and friendly personality." },
{ id: "shimmer", name: "Mikasa", description: "Calm and soothing presence." },
{ id: "ash", name: "Kakashi", description: "Relaxed and contemplative." },
{ id: "ballad", name: "Itachi", description: "Smooth and melodic delivery." },
{ id: "coral", name: "Tsunade", description: "Confident and approachable." },
{ id: "sage", name: "Jiraiya", description: "Wise mentor with experience." },
{ id: "verse", name: "Minato", description: "Clear and focused articulation." },
];
export function SettingsPanel({
onClose,
uploadedDocuments = [],
onDeleteDocument = () => {},
}: SettingsPanelProps) {
const { theme, colorPalette, setTheme, setColorPalette } = useTheme();
const { user, profile, state, fetchUserProfileAndState, updateProfileState, isLoading: isAuthLoading, isFetchingProfile: isAuthFetchingProfile } = useAuth();
const [activeTab, setActiveTab] = useState("general");
const [username, setUsername] = useState("");
const [language, setLanguage] = useState("en-US");
const [selectedPersonaId, setSelectedPersonaId] = useState(DEFAULT_PERSONA_ID);
const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
const [editingPersona, setEditingPersona] = useState<UIPersona | undefined>(undefined);
const defaultMinatoVoice = (appConfig.openai.ttsDefaultVoice as OpenAITtsVoice) || "nova";
const [selectedMinatoVoice, setSelectedMinatoVoice] = useState<OpenAITtsVoice>(defaultMinatoVoice);
const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
const [googleGmailConnected, setGoogleGmailConnected] = useState(false);
const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
const [isSavingName, setIsSavingName] = useState(false);
const [isSavingLanguage, setIsSavingLanguage] = useState(false);
const [isSavingPersona, setIsSavingPersona] = useState(false);
const [isSavingVoice, setIsSavingVoice] = useState(false);
const [isConnectingGoogle, setIsConnectingGoogle] = useState<GoogleConnectionScope>(null);
// This state is for data specific to SettingsPanel (like personas)
const [isFetchingPanelData, setIsFetchingPanelData] = useState(false);
const [personas, setPersonas] = useState<UIPersona[]>([]);
const [initialLoadDone, setInitialLoadDone] = useState(false);
const [isPlayingSample, setIsPlayingSample] = useState(false);
const audioRef = useRef<HTMLAudioElement | null>(null);

// Preferences state
const [preferences, setPreferences] = useState<UserWorkflowPreferences>({});
const [isSavingPreferences, setIsSavingPreferences] = useState(false);
const [newsSources, setNewsSources] = useState<string[]>([]);
const [newsPreferredCategories, setNewsPreferredCategories] = useState<string[]>([]);
const [interestCategories, setInterestCategories] = useState<string[]>([]);
const [redditPreferredSubreddits, setRedditPreferredSubreddits] = useState<string[]>([]);
const [youtubePreferredChannels, setYoutubePreferredChannels] = useState<string[]>([]);
const [youtubePreferredCategories, setYoutubePreferredCategories] = useState<string[]>([]);
const [youtubeVideoLengthPreference, setYoutubeVideoLengthPreference] = useState<string>("any");
const [hackernewsPreferredTopics, setHackernewsPreferredTopics] = useState<string[]>([]);
const [recipePreferredCuisines, setRecipePreferredCuisines] = useState<string[]>([]);
const [recipeSkillLevel, setRecipeSkillLevel] = useState<string>("any");
const [recipeMaxCookingTime, setRecipeMaxCookingTime] = useState<number>(60);
const [sportsPreferredLeagues, setSportsPreferredLeagues] = useState<string[]>([]);

// WebSearch Shopping Preferences
const [webSearchShoppingPreferredRetailers, setWebSearchShoppingPreferredRetailers] = useState<string[]>([]);
const [webSearchShoppingPriceMin, setWebSearchShoppingPriceMin] = useState<number | undefined>(undefined);
const [webSearchShoppingPriceMax, setWebSearchShoppingPriceMax] = useState<number | undefined>(undefined);
const [webSearchShoppingPreferredBrands, setWebSearchShoppingPreferredBrands] = useState<string[]>([]);
const [webSearchShoppingShippingPreference, setWebSearchShoppingShippingPreference] = useState<string>("any");
const [webSearchShoppingReviewThreshold, setWebSearchShoppingReviewThreshold] = useState<number>(3);

// WebSearch TikTok Preferences
const [webSearchTikTokPreferredCreators, setWebSearchTikTokPreferredCreators] = useState<string[]>([]);
const [webSearchTikTokPreferredHashtags, setWebSearchTikTokPreferredHashtags] = useState<string[]>([]);
const [webSearchTikTokContentTypes, setWebSearchTikTokContentTypes] = useState<string[]>([]);
const [webSearchTikTokVideoLengthPreference, setWebSearchTikTokVideoLengthPreference] = useState<string>("any");

// Event Finder Preferences
const [eventFinderPreferredVenues, setEventFinderPreferredVenues] = useState<string[]>([]);
const [eventFinderEventTypes, setEventFinderEventTypes] = useState<string[]>([]);
const [eventFinderPriceMin, setEventFinderPriceMin] = useState<number | undefined>(undefined);
const [eventFinderPriceMax, setEventFinderPriceMax] = useState<number | undefined>(undefined);
const [eventFinderDistanceRadius, setEventFinderDistanceRadius] = useState<number>(25);
const [eventFinderPreferredDaysOfWeek, setEventFinderPreferredDaysOfWeek] = useState<string[]>([]);
const [eventFinderTimePreference, setEventFinderTimePreference] = useState<string>("any");

const [dailyBriefingEnabled, setDailyBriefingEnabled] = useState(false);
const [dailyBriefingTime, setDailyBriefingTime] = useState("08:00");
const [dailyBriefingOptions, setDailyBriefingOptions] = useState({
  includeNews: true,
  includeWeather: true,
  includeCalendar: true,
  includeReminders: true
});

const fetchPersonasFromBackend = useCallback(async () => {
if (!user?.id) return; // Use user.id from dep array
setIsFetchingPanelData(true);
try {
const res = await fetch("/api/personas");
if (!res.ok) {
toast({ title: "Failed to fetch personas", variant: "destructive" });
setIsFetchingPanelData(false);
return;
}
const data = await res.json();
const allPersonas: UIPersona[] = [
...(data.predefined || []).map((p: any) => ({
id: p.id, name: p.name, description: p.description,
system_prompt: p.system_prompt, voice_id: p.voice_id, isCustom: false,
})),
...(data.user || []).map((p: any) => ({
id: p.id, name: p.name, description: p.description,
system_prompt: p.system_prompt, voice_id: p.voice_id, isCustom: true,
})),
];
setPersonas(allPersonas);
} catch (e) {
toast({ title: "Failed to fetch personas", variant: "destructive" });
} finally {
setIsFetchingPanelData(false);
}
}, [user?.id]);
const fetchAllSettingsPanelData = useCallback(async () => {
if (!user?.id) {
setIsFetchingPanelData(false); // Ensure this is reset if no user
return;
}
setIsFetchingPanelData(true);
let timeoutId: NodeJS.Timeout | null = null;
const timeoutPromise = new Promise((_, reject) => {
timeoutId = setTimeout(() => reject(new Error("Settings load timed out. Please try again.")), 15000);
});
try {
  await Promise.race([
    (async () => {
      // fetchUserProfileAndState from useAuth is now responsible for its own loading state (isAuthFetchingProfile)
      // We still await it to ensure profile/state are fresh before personas.
      await fetchUserProfileAndState(true); // Force refresh profile/state from API
      await fetchPersonasFromBackend();     // Fetch personas
    })(),
    timeoutPromise
  ]);
} catch (e) {
  toast({ title: "Failed to load settings", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
} finally {
  if (timeoutId) clearTimeout(timeoutId);
  setIsFetchingPanelData(false);
}

}, [user?.id, fetchUserProfileAndState, fetchPersonasFromBackend]);
useEffect(() => {
if (user?.id && !initialLoadDone) {
fetchAllSettingsPanelData().finally(() => setInitialLoadDone(true));
} else if (!user?.id) {
setInitialLoadDone(false);
setPersonas([]);
}
}, [user?.id, fetchAllSettingsPanelData]);
useEffect(() => {
if (state && state.user_first_name) {
  setUsername(state.user_first_name);
} else if (profile) {
  setUsername(profile.full_name || user?.user_metadata?.full_name || DEFAULT_USER_NAME);
} else if (user) {
  setUsername(user.user_metadata?.full_name || DEFAULT_USER_NAME);
} else {
  setUsername(DEFAULT_USER_NAME); // Fallback if no user/profile
}

if (state) {
  setLanguage(state.preferred_locale || appConfig.defaultLocale || "en-US");
  setSelectedPersonaId(state.active_persona_id || DEFAULT_PERSONA_ID);
  
  // Load voice from state with logging
  const savedVoice = state.chainedvoice as OpenAITtsVoice;
  const voiceToLoad = savedVoice || defaultMinatoVoice;
  logger.info(`[Settings] Loading voice from state: ${savedVoice || 'none'}, using: ${voiceToLoad}`);
  setSelectedMinatoVoice(voiceToLoad);
  
  setGoogleCalendarConnected(!!state.googlecalendarenabled);
  setGoogleGmailConnected(!!state.googleemailenabled);
  
  // Set preferences from state
  if (state.workflow_preferences) {
    setPreferences(state.workflow_preferences);
    
    // News preferences
    setNewsSources(state.workflow_preferences.newsSources || []);
    setNewsPreferredCategories(state.workflow_preferences.newsPreferredCategories?.map(String) || []);
    
    // Reddit preferences
    setRedditPreferredSubreddits(state.workflow_preferences.redditPreferredSubreddits || []);
    
    // YouTube preferences
    setYoutubePreferredChannels(state.workflow_preferences.youtubePreferredChannels || []);
    setYoutubePreferredCategories(state.workflow_preferences.youtubePreferredCategories || []);
    setYoutubeVideoLengthPreference(state.workflow_preferences.youtubeVideoLengthPreference || "any");
    
    // HackerNews preferences
    setHackernewsPreferredTopics(state.workflow_preferences.hackernewsPreferredTopics || []);
    
    // Recipe preferences
    setRecipePreferredCuisines(state.workflow_preferences.recipePreferredCuisines || []);
    setRecipeSkillLevel(state.workflow_preferences.recipeSkillLevel || "any");
    setRecipeMaxCookingTime(state.workflow_preferences.recipeMaxCookingTime || 60);
    
    // Sports preferences
    setSportsPreferredLeagues(state.workflow_preferences.sportsPreferredLeagues || []);
    
    // WebSearch Shopping Preferences
    const shoppingPrefs = state.workflow_preferences.webSearchShoppingPreferences;
    if (shoppingPrefs) {
      setWebSearchShoppingPreferredRetailers(shoppingPrefs.preferredRetailers || []);
      setWebSearchShoppingPriceMin(shoppingPrefs.priceRange?.min);
      setWebSearchShoppingPriceMax(shoppingPrefs.priceRange?.max);
      setWebSearchShoppingPreferredBrands(shoppingPrefs.preferredBrands || []);
      setWebSearchShoppingShippingPreference(shoppingPrefs.shippingPreference || "any");
      setWebSearchShoppingReviewThreshold(shoppingPrefs.reviewThreshold || 3);
    }
    
    // WebSearch TikTok Preferences
    const tiktokPrefs = state.workflow_preferences.webSearchTikTokPreferences;
    if (tiktokPrefs) {
      setWebSearchTikTokPreferredCreators(tiktokPrefs.preferredCreators || []);
      setWebSearchTikTokPreferredHashtags(tiktokPrefs.preferredHashtags || []);
      setWebSearchTikTokContentTypes(tiktokPrefs.contentTypes || []);
      setWebSearchTikTokVideoLengthPreference(tiktokPrefs.videoLengthPreference || "any");
    }
    
    // Event Finder Preferences
    const eventPrefs = state.workflow_preferences.eventFinderPreferences;
    if (eventPrefs) {
      setEventFinderPreferredVenues(eventPrefs.preferredVenues || []);
      setEventFinderEventTypes(eventPrefs.eventTypes || []);
      setEventFinderPriceMin(eventPrefs.priceRange?.min);
      setEventFinderPriceMax(eventPrefs.priceRange?.max);
      setEventFinderDistanceRadius(eventPrefs.distanceRadius || 25);
      setEventFinderPreferredDaysOfWeek(eventPrefs.preferredDaysOfWeek || []);
      setEventFinderTimePreference(eventPrefs.timePreference || "any");
    }
    
    // Interest categories
    setInterestCategories(state.workflow_preferences.interestCategories?.map(String) || []);
    
    // Daily briefing preferences
    setDailyBriefingEnabled(!!state.workflow_preferences.dailyBriefingEnabled);
    setDailyBriefingTime(state.workflow_preferences.dailyBriefingTime || "08:00");
    setDailyBriefingOptions({
      includeNews: !!state.workflow_preferences.dailyBriefingIncludeNews,
      includeWeather: !!state.workflow_preferences.dailyBriefingIncludeWeather,
      includeCalendar: !!state.workflow_preferences.dailyBriefingIncludeCalendar,
      includeReminders: !!state.workflow_preferences.dailyBriefingIncludeReminders
    });
  }
} else {
  setLanguage(appConfig.defaultLocale || "en-US");
  setSelectedPersonaId(DEFAULT_PERSONA_ID);
  setSelectedMinatoVoice(defaultMinatoVoice);
  setGoogleCalendarConnected(false); 
  setGoogleGmailConnected(false);
}
}, [profile, state, user, defaultMinatoVoice]);
const handleSaveName = async () => {
if (isSavingName || !user) return;
setIsSavingName(true);

// Extract first name correctly from full name
const nameParts = username.trim().split(/\s+/);
const firstName = nameParts[0] || username.trim();

const success = await updateProfileState({ 
  full_name: username.trim(), 
  first_name: firstName,
  user_first_name: username.trim()  // Use the full username as user_first_name to ensure consistency
});

if (success) toast({ title: "Name saved!" });
else toast({ title: "Failed to save name", variant: "destructive" });
setIsSavingName(false);
};
const handleSaveLanguage = async () => {
if (isSavingLanguage || !user) return;
setIsSavingLanguage(true);

// Make sure we're using a properly formatted locale string
const formattedLocale = language.trim();

const success = await updateProfileState({ preferred_locale: formattedLocale });

if (success) toast({ title: "Language preference saved!" });
else toast({ title: "Failed to save language", variant: "destructive" });
setIsSavingLanguage(false);
};
const handleSavePersona = async () => {
if (isSavingPersona || !user) return;
setIsSavingPersona(true);

// Validate the persona ID exists in the personas list
const personaExists = personas.some(p => p.id === selectedPersonaId);
const personaIdToUse = personaExists ? selectedPersonaId : DEFAULT_PERSONA_ID;

const success = await updateProfileState({ active_persona_id: personaIdToUse });

if (success) {
  toast({ title: "Active persona saved!" });
  // If we fallback to default, update the UI
  if (personaIdToUse !== selectedPersonaId) {
    setSelectedPersonaId(personaIdToUse);
  }
} else {
  toast({ title: "Failed to save persona", variant: "destructive" });
}
setIsSavingPersona(false);
};
const handleSaveMinatoVoice = async (newVoice: OpenAITtsVoice) => {
if (isSavingVoice || !user) return;
setIsSavingVoice(true);

// Validate the voice ID against the allowed list
const isValidVoice = ALL_TTS_VOICES_WITH_DESC.some(voice => voice.id === newVoice);
const voiceToUse = isValidVoice ? newVoice : defaultMinatoVoice;

// Get character name for toast message
const selectedVoiceInfo = ALL_TTS_VOICES_WITH_DESC.find(voice => voice.id === voiceToUse);
const characterName = selectedVoiceInfo?.name || 'Default';

logger.info(`[Settings] Saving voice selection: ${voiceToUse} (${characterName}) for user ${user.id.substring(0, 8)}...`);

setSelectedMinatoVoice(voiceToUse);
const success = await updateProfileState({ chainedvoice: voiceToUse });

if (success) {
  logger.info(`[Settings] Voice successfully saved to Supabase: ${voiceToUse}`);
  toast({ title: `Voice set to ${characterName}!`, description: `Minato will now speak with the ${characterName} voice.` });
} else {
  logger.error(`[Settings] Failed to save voice to Supabase`);
  toast({ title: "Failed to update voice", variant: "destructive" });
  setSelectedMinatoVoice((state?.chainedvoice as OpenAITtsVoice) || defaultMinatoVoice);
}
setIsSavingVoice(false);
};
const handleSavePersonaDialog = async (personaData: Omit<UIPersona, "id" | "isCustom">) => {
  if (!user) return;
  setIsFetchingPanelData(true);
  
  try {
    let newOrUpdatedPersona;
    const payload = {
      name: personaData.name.trim(),
      description: (personaData.description || "").trim(),
      system_prompt: personaData.system_prompt.trim(),
      voice_id: personaData.voice_id,
    };
    
    // Validate that required fields are non-empty
    if (!payload.name) {
      throw new Error("Persona name cannot be empty");
    }
    
    if (!payload.system_prompt) {
      throw new Error("System prompt cannot be empty");
    }
    
    if (editingPersona && editingPersona.isCustom && editingPersona.id) {
      const res = await fetch(`/api/personas/${editingPersona.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP error ${res.status}` }));
        throw new Error(err.error || "Failed to update persona");
      }
      newOrUpdatedPersona = await res.json();
      toast({ title: "Persona updated!" });
    } else {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP error ${res.status}` }));
        throw new Error(err.error || "Failed to create persona");
      }
      newOrUpdatedPersona = await res.json();
      toast({ title: "Persona created!" });
    }
    
    await fetchPersonasFromBackend(); // Refresh persona list
    
    // Set new/updated as active and save to backend
    setSelectedPersonaId(newOrUpdatedPersona.id);
    await updateProfileState({ active_persona_id: newOrUpdatedPersona.id });
  } catch (e: any) {
    toast({
      title: `Failed to ${editingPersona ? "update" : "create"} persona`,
      description: e.message,
      variant: "destructive"
    });
  } finally {
    setIsFetchingPanelData(false);
  }
  
  setEditingPersona(undefined);
  setPersonaEditorOpen(false);
};
const handleDeletePersona = async (id: string) => {
if (!user) return;
const personaToDelete = personas.find(p => p.id === id);
if (!personaToDelete || !personaToDelete.isCustom) {
toast({ title: "Cannot delete standard personas.", variant: "default" });
return;
}
// Add a loading state for delete if needed
try {
const res = await fetch(`/api/personas/${id}`, { method: "DELETE" });
if (!res.ok && res.status !== 204) { const err = await res.json().catch(()=>null); throw new Error(err?.error || "Failed to delete persona"); }
toast({ title: "Custom persona deleted!" });
await fetchPersonasFromBackend();
if (selectedPersonaId === id) {
setSelectedPersonaId(DEFAULT_PERSONA_ID);
await updateProfileState({ active_persona_id: DEFAULT_PERSONA_ID });
}
} catch (e: any) {
toast({ title: "Failed to delete persona", description: e.message, variant: "destructive" });
}
};
const handleGoogleConnect = async (scope: Exclude<GoogleConnectionScope, 'disconnect_all' | null>) => {
if (!user) return;
setIsConnectingGoogle(scope);
try {
  // Instead of connecting to Google, just show a message that this will be available in a future upgrade
  toast({ 
    title: "Coming Soon", 
    description: "Google integration will be available in a future Minato upgrade. Stay tuned!", 
    variant: "default" 
  });
  setIsConnectingGoogle(null);
} catch (error: any) {
  toast({ title: "Google Connection Error", description: error.message, variant: "destructive" });
  setIsConnectingGoogle(null);
}
};
const handleGoogleDisconnect = async () => {
if (!user) return;
setIsConnectingGoogle('disconnect_all');
try {
  // Instead of disconnecting from Google, just show a message that this will be available in a future upgrade
  toast({ 
    title: "Coming Soon", 
    description: "Google integration will be available in a future Minato upgrade. Stay tuned!", 
    variant: "default" 
  });
  setIsConnectingGoogle(null);
} catch (error: any) {
  toast({ title: "Disconnection Error", description: error.message, variant: "destructive" });
} finally {
  setIsConnectingGoogle(null);
}
};
const handleSavePreferences = async () => {
  if (isSavingPreferences || !user) return;
  setIsSavingPreferences(true);
  
  try {
    // Create the updated preferences object from all the individual state variables
    const updatedPreferences: UserWorkflowPreferences = {
      // News preferences
      newsSources,
      newsPreferredCategories: newsPreferredCategories as any[],
      
      // Reddit preferences
      redditPreferredSubreddits,
      
      // YouTube preferences
      youtubePreferredChannels,
      youtubePreferredCategories: youtubePreferredCategories as any[],
      youtubeVideoLengthPreference: youtubeVideoLengthPreference as any,
      
      // HackerNews preferences
      hackernewsPreferredTopics,
      
      // Recipe preferences
      recipePreferredCuisines,
      recipeSkillLevel: recipeSkillLevel as any,
      recipeMaxCookingTime,
      
      // Sports preferences
      sportsPreferredLeagues,
      
      // WebSearch Shopping Preferences
      webSearchShoppingPreferences: {
        preferredRetailers: webSearchShoppingPreferredRetailers,
        priceRange: {
          min: webSearchShoppingPriceMin,
          max: webSearchShoppingPriceMax
        },
        preferredBrands: webSearchShoppingPreferredBrands,
        shippingPreference: webSearchShoppingShippingPreference as any,
        reviewThreshold: webSearchShoppingReviewThreshold
      },
      
      // WebSearch TikTok Preferences
      webSearchTikTokPreferences: {
        preferredCreators: webSearchTikTokPreferredCreators,
        preferredHashtags: webSearchTikTokPreferredHashtags,
        contentTypes: webSearchTikTokContentTypes as any[],
        videoLengthPreference: webSearchTikTokVideoLengthPreference as any
      },
      
      // Event Finder Preferences
      eventFinderPreferences: {
        preferredVenues: eventFinderPreferredVenues,
        eventTypes: eventFinderEventTypes as any[],
        priceRange: {
          min: eventFinderPriceMin,
          max: eventFinderPriceMax
        },
        distanceRadius: eventFinderDistanceRadius,
        preferredDaysOfWeek: eventFinderPreferredDaysOfWeek as any[],
        timePreference: eventFinderTimePreference as any
      },
      
      // Interest categories
      interestCategories: interestCategories as any[],
      
      // Daily briefing preferences
      dailyBriefingEnabled,
      dailyBriefingTime,
      dailyBriefingIncludeNews: dailyBriefingOptions.includeNews,
      dailyBriefingIncludeWeather: dailyBriefingOptions.includeWeather,
      dailyBriefingIncludeCalendar: dailyBriefingOptions.includeCalendar,
      dailyBriefingIncludeReminders: dailyBriefingOptions.includeReminders
    };
    
    // Preserve any existing preferences not managed in this UI
    const mergedPreferences = {
      ...(state?.workflow_preferences || {}),
      ...updatedPreferences
    };
    
    const success = await updateProfileState({ workflow_preferences: mergedPreferences });
    
    if (success) {
      toast({ title: "Preferences saved!" });
      setPreferences(mergedPreferences);
    } else {
      toast({ title: "Failed to save preferences", variant: "destructive" });
    }
  } catch (error: any) {
    toast({ 
      title: "Failed to save preferences", 
      description: error.message, 
      variant: "destructive" 
    });
  } finally {
    setIsSavingPreferences(false);
  }
};
const handleCreatePersona = () => {
setEditingPersona(undefined);
setPersonaEditorOpen(true);
};
const handleEditPersona = (persona: UIPersona) => {
setEditingPersona(persona);
setPersonaEditorOpen(true);
};
const getDocumentUrl = (file: File): string | null => {
try { return URL.createObjectURL(file); } catch (error) { console.error("Error creating object URL:", error); return null; }
};
const handleLinkClick = (url: string | null) => { /* Could add tracking here */ };
const colorPalettes: ColorPaletteOption[] = [
{ name: "Komorebi Path", value: "komorebi-path", primary: "bg-green-600", secondary: "bg-yellow-200", description: "Sunlight through trees" },
{ name: "Sakura Breeze", value: "sakura-breeze", primary: "bg-pink-400", secondary: "bg-pink-100", description: "Cherry blossom wind" },
{ name: "Aki no Mori", value: "aki-no-mori", primary: "bg-orange-600", secondary: "bg-red-300", description: "Autumn forest colors" },
{ name: "Neo Kyoto Glow", value: "neo-kyoto-glow", primary: "bg-purple-600", secondary: "bg-cyan-300", description: "Cyberpunk neon vibes" },
{ name: "Setsugen Whisper", value: "setsugen-whisper", primary: "bg-gray-100", secondary: "bg-blue-100", description: "Quiet snowfield hues" },
{ name: "Yugure Sky", value: "yugure-sky", primary: "bg-orange-500", secondary: "bg-purple-300", description: "Twilight dusk colors" },
{ name: "Kaguya Moon", value: "kaguya-moon", primary: "bg-indigo-200", secondary: "bg-yellow-100", description: "Celestial moon glow" },
{ name: "Shinkai Depths", value: "shinkai-depths", primary: "bg-blue-900", secondary: "bg-teal-300", description: "Deep ocean blues" },
{ name: "Fuji Sunrise", value: "fuji-sunrise", primary: "bg-blue-600", secondary: "bg-orange-200", description: "Mount Fuji dawn" },
{ name: "Tanabata Wish", value: "tanabata-wish", primary: "bg-indigo-800", secondary: "bg-yellow-300", description: "Star festival night" },
{ name: "Kitsune Fire", value: "kitsune-fire", primary: "bg-orange-600", secondary: "bg-red-200", description: "Mystical fox flames" },
{ name: "Ghibli Meadow", value: "ghibli-meadow", primary: "bg-green-500", secondary: "bg-blue-200", description: "Whimsical pastoral" },
{ name: "Ryujin Palace", value: "ryujin-palace", primary: "bg-teal-700", secondary: "bg-cyan-200", description: "Dragon sea palace" },
{ name: "Umi no Iro", value: "umi-no-iro", primary: "bg-blue-500", secondary: "bg-blue-200", description: "Colors of the sea" },
{ name: "Tengu Mountain", value: "tengu-mountain", primary: "bg-green-800", secondary: "bg-gray-300", description: "Mountain spirit realm" },
{ name: "Hotaru Night", value: "hotaru-night", primary: "bg-indigo-900", secondary: "bg-yellow-200", description: "Firefly summer eve" },
{ name: "Matcha Garden", value: "matcha-garden", primary: "bg-green-600", secondary: "bg-green-200", description: "Serene tea garden" },
{ name: "Kamikakushi Hues", value: "kamikakushi-hues", primary: "bg-red-700", secondary: "bg-purple-200", description: "Spirited away colors" },
{ name: "Shonen Spirit", value: "shonen-spirit", primary: "bg-red-600", secondary: "bg-orange-300", description: "Bold anime energy" },
{ name: "Maho Shojo Sparkle", value: "maho-shojo-sparkle", primary: "bg-pink-500", secondary: "bg-purple-200", description: "Magical girl shine" },
{ name: "Tsuchi Earth", value: "tsuchi-earth", primary: "bg-amber-800", secondary: "bg-amber-300", description: "Earthy soil tones" },
{ name: "Raijin Spark", value: "raijin-spark", primary: "bg-blue-500", secondary: "bg-indigo-200", description: "Thunder god energy" },
{ name: "Take Grove", value: "take-grove", primary: "bg-green-600", secondary: "bg-lime-100", description: "Bamboo forest calm" },
{ name: "Sango Reef", value: "sango-reef", primary: "bg-rose-500", secondary: "bg-orange-200", description: "Coral reef colors" },
{ name: "Murasaki Silk", value: "murasaki-silk", primary: "bg-purple-700", secondary: "bg-purple-200", description: "Royal purple silk" },
{ name: "Hoshi Cosmos", value: "hoshi-cosmos", primary: "bg-blue-800", secondary: "bg-blue-400", description: "Starry cosmos deep" },
{ name: "Sakura Gold", value: "sakura-gold", primary: "bg-rose-400", secondary: "bg-rose-200", description: "Golden cherry bloom" },
{ name: "Wakaba Mint", value: "wakaba-mint", primary: "bg-emerald-400", secondary: "bg-emerald-100", description: "Fresh spring leaves" },
{ name: "Hanami Bloom", value: "hanami-bloom", primary: "bg-pink-500", secondary: "bg-pink-200", description: "Flower viewing joy" },
{ name: "Kiniro Hour", value: "kiniro-hour", primary: "bg-amber-400", secondary: "bg-orange-100", description: "Golden hour glow" },
{ name: "Onmyoji Violet", value: "onmyoji-violet", primary: "bg-violet-600", secondary: "bg-violet-200", description: "Mystic spell hues" },
{ name: "Midori Neon", value: "midori-neon", primary: "bg-lime-500", secondary: "bg-lime-200", description: "Electric green flash" },
{ name: "Mitsu Amber", value: "mitsu-amber", primary: "bg-amber-500", secondary: "bg-yellow-200", description: "Sweet honey tones" },
{ name: "Akane Crimson", value: "akane-crimson", primary: "bg-red-800", secondary: "bg-red-300", description: "Deep sunset red" },
{ name: "Mizu Aqua", value: "mizu-aqua", primary: "bg-cyan-500", secondary: "bg-cyan-100", description: "Pure water flow" },
{ name: "Momo Cream", value: "momo-cream", primary: "bg-orange-300", secondary: "bg-orange-100", description: "Soft peach cream" },
{ name: "Hagane Steel", value: "hagane-steel", primary: "bg-blue-600", secondary: "bg-blue-300", description: "Strong steel blue" },
{ name: "Ocha Green", value: "ocha-green", primary: "bg-green-500", secondary: "bg-green-200", description: "Calming tea green" },
{ name: "Tsuki Silver", value: "tsuki-silver", primary: "bg-slate-500", secondary: "bg-slate-200", description: "Moonlight silver" },
{ name: "Yuuhi Pink", value: "yuuhi-pink", primary: "bg-rose-500", secondary: "bg-rose-300", description: "Sunset pink glow" },
{ name: "Kaiyou Blue", value: "kaiyou-blue", primary: "bg-blue-600", secondary: "bg-blue-200", description: "Ocean voyage blue" },
{ name: "Asagiri Mist", value: "asagiri-mist", primary: "bg-gray-400", secondary: "bg-gray-200", description: "Morning mist soft" },
{ name: "Tasogare Haze", value: "tasogare-haze", primary: "bg-purple-500", secondary: "bg-blue-200", description: "Twilight haze dream" },
{ name: "Yuzu Citrus", value: "yuzu-citrus", primary: "bg-lime-500", secondary: "bg-yellow-200", description: "Fresh yuzu zest" },
{ name: "Ichigo Punch", value: "ichigo-punch", primary: "bg-fuchsia-600", secondary: "bg-fuchsia-200", description: "Strawberry burst" },
{ name: "Kohi Mocha", value: "kohi-mocha", primary: "bg-amber-700", secondary: "bg-amber-200", description: "Coffee mocha warm" },
{ name: "Take Bamboo", value: "take-bamboo", primary: "bg-green-600", secondary: "bg-green-200", description: "Bamboo grove peace" },
{ name: "Tsuru Pink", value: "tsuru-pink", primary: "bg-pink-500", secondary: "bg-pink-300", description: "Crane feather pink" },
];
// Overall loading state for the panel
const isPanelLoading = (isAuthLoading || isAuthFetchingProfile) && !initialLoadDone;
if (isPanelLoading) {
return (
<div className="flex flex-col items-center justify-center h-[calc(100vh-6.5rem)]">
<Loader2 className="h-10 w-10 animate-spin text-primary"/>
<p className="mt-2 text-sm text-muted-foreground">Loading settings...</p>
</div>
)
}

// Helper function to get voice character name by ID
const getVoiceCharacterName = (voiceId: OpenAITtsVoice): string => {
  const voice = ALL_TTS_VOICES_WITH_DESC.find(v => v.id === voiceId);
  return voice?.name || "Default";
};

// Helper function to get voice description by ID
const getVoiceDescription = (voiceId: OpenAITtsVoice): string => {
  const voice = ALL_TTS_VOICES_WITH_DESC.find(v => v.id === voiceId);
  return voice?.description || "";
};

// Simplify voice sample playback without authentication
const playVoiceSample = async (voiceId: OpenAITtsVoice) => {
  if (isPlayingSample) {
    // If already playing, stop current sample
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingSample(false);
    return;
  }
  
  setIsPlayingSample(true);
  try {
    // Create a sample text based on the character name
    const voice = ALL_TTS_VOICES_WITH_DESC.find(v => v.id === voiceId);
    const characterName = voice?.name || "Minato";
    
    // Select a random greeting phrase for more variety
    const greetings = [
      `Hello, I'm ${characterName}. This is how my voice sounds.`,
      `I'm ${characterName}. This is a sample of my voice.`,
      `This is ${characterName} speaking. How does my voice sound?`,
      `My name is ${characterName}, and I'll be your assistant today.`,
      `${characterName} here! I hope you like the sound of my voice.`
    ];
    const sampleText = greetings[Math.floor(Math.random() * greetings.length)];
    
    // Show the loading toast
    const loadingToast = toast({ 
      title: "Generating voice sample...",
      description: "Please wait a moment",
    });
    
    // Call the TTS API to generate speech
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: sampleText,
        voice: voiceId
      })
    });
    
    // Dismiss the loading toast
    loadingToast.dismiss?.();
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Error ${response.status}` }));
      throw new Error(errorData.error || "Failed to generate voice sample");
    }
    
    // Get audio data and play it
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.onended = () => {
      setIsPlayingSample(false);
      URL.revokeObjectURL(audioUrl);
      audioRef.current = null;
    };
    
    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      setIsPlayingSample(false);
      toast({ 
        title: "Playback failed", 
        description: "There was an error playing the voice sample.",
        variant: "destructive" 
      });
      URL.revokeObjectURL(audioUrl);
      audioRef.current = null;
    };
    
    // Start playing
    await audio.play();
    
    // Success toast
    toast({ 
      title: `${characterName}'s voice`, 
      description: "Playing voice sample...",
      duration: 2000
    });
    
  } catch (error) {
    console.error("Error playing voice sample:", error);
    toast({ 
      title: "Couldn't play voice sample", 
      description: error instanceof Error ? error.message : "There was an error generating the voice sample.",
      variant: "destructive" 
    });
    setIsPlayingSample(false);
  }
};

return (
<>
<motion.div
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 20 }}
transition={{ duration: 0.3 }}
className="bg-background border rounded-2xl border-primary/20 shadow-lg overflow-hidden flex flex-col h-[calc(100vh-6.5rem)]"
>
<div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
<h2 className="text-lg font-semibold">Settings</h2>
<div className="flex items-center gap-2">
<Button
onClick={() => setIsUpgradeDialogOpen(true)}
className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs px-3 h-8"
size="sm"
>
<Zap className="mr-1.5 h-3.5 w-3.5" /> Upgrade to Pro
</Button>
<Button
variant="ghost"
size="icon"
className="rounded-full h-8 w-8"
onClick={onClose}
aria-label="Close settings"
>
<X className="h-4 w-4" />
</Button>
</div>
</div>
<Tabs
value={activeTab}
onValueChange={setActiveTab}
className="w-full flex flex-col flex-grow overflow-hidden"
>
<div className="border-b border-border flex-shrink-0">
<ScrollArea className="w-full whitespace-nowrap">
<TabsList className="inline-flex h-auto justify-start rounded-none bg-transparent p-0 px-4">
{[
{ id: "general", label: "General", icon: <User className="h-4 w-4" /> },
{ id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
{ id: "audio", label: "Audio", icon: <Volume2 className="h-4 w-4" /> },
{ id: "preferences", label: "Preferences", icon: <Zap className="h-4 w-4" /> },
{ id: "documents", label: "Documents", icon: <FileArchive className="h-4 w-4" /> },
{ id: "privacy", label: "Privacy & Integrations", icon: <Shield className="h-4 w-4" /> },
].map((tab) => (
<TabsTrigger
key={tab.id}
value={tab.id}
className="relative h-12 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-shrink-0 text-xs sm:text-sm"
>
<div className="flex items-center gap-1.5">
{tab.icon}
<span className="hidden md:inline">{tab.label}</span>
</div>
</TabsTrigger>
))}
</TabsList>
</ScrollArea>
</div>
<div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 md:p-6">
            <TabsContent value="general" className="mt-0 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Your Name</Label>
                <div className="flex gap-2">
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your name" onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }} />
                  <Button variant="outline" onClick={handleSaveName} disabled={isSavingName} className="bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary hover:text-primary"> {isSavingName ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save"} </Button>
                </div>
                <p className="text-xs text-muted-foreground"> This is how Minato will address you. </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language-select">Language</Label>
                 <p className="text-xs text-muted-foreground">Minato will try to respond in this language.</p>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language-select" className="w-full"> <SelectValue placeholder="Select language" /> </SelectTrigger>
                  <SelectContent> 
                      <SelectItem value="en-US">English (US)</SelectItem> 
                      <SelectItem value="en-GB">English (UK)</SelectItem> 
                      <SelectItem value="fr-FR">French (France)</SelectItem> 
                      <SelectItem value="es-ES">Spanish (Spain)</SelectItem> 
                      <SelectItem value="de-DE">German (Germany)</SelectItem> 
                      <SelectItem value="ja-JP">Japanese</SelectItem> 
                  </SelectContent>
                </Select>
                <Button onClick={handleSaveLanguage} disabled={isSavingLanguage} className="mt-2 w-full bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary hover:text-primary"> {isSavingLanguage ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save Language"} </Button>
              </div>

              <div className="space-y-4">
                 <Label>AI Persona</Label>
                 <p className="text-xs text-muted-foreground">Choose how Minato behaves and responds.</p>
                <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId} >
                  <SelectTrigger id="persona-select"> <SelectValue placeholder="Select persona" /> </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header-standard" disabled className="font-semibold text-muted-foreground text-xs px-2 py-1.5"> Standard Personas </SelectItem>
                    {personas.filter((p) => !p.isCustom).map((persona) => ( <SelectItem key={persona.id} value={persona.id}> {persona.name} </SelectItem> ))}
                    {personas.some((p) => p.isCustom) && ( <SelectItem value="header-custom" disabled className="font-semibold text-muted-foreground text-xs px-2 py-1.5 mt-2"> Your Custom Personas </SelectItem> )}
                    {personas.filter((p) => p.isCustom).map((persona) => ( <SelectItem key={persona.id} value={persona.id}> {persona.name} </SelectItem> ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSavePersona} disabled={isSavingPersona} className="mt-2 w-full bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary hover:text-primary"> {isSavingPersona ? <Loader2 className="h-4 w-4 animate-spin"/> : "Set Active Persona"} </Button>
                
                {personas.find((p) => p.id === selectedPersonaId) && (
                  <Card className="p-3 bg-muted/30 border-border/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm truncate text-foreground"> {personas.find((p) => p.id === selectedPersonaId)?.name} </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2"> {personas.find((p) => p.id === selectedPersonaId)?.description} </p>
                      </div>
                      {personas.find((p) => p.id === selectedPersonaId)?.isCustom && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => handleEditPersona(personas.find((p) => p.id === selectedPersonaId)!)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeletePersona(selectedPersonaId)}>Delete</Button>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
                <Button onClick={handleCreatePersona} variant="outline" size="sm" className="w-full border-primary/50 hover:bg-primary/5 text-primary hover:text-primary"> Create New Persona </Button>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0 space-y-6">
               <div className="space-y-2"> <h3 className="text-sm font-medium">Theme</h3> <RadioGroup value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")} className="grid grid-cols-3 gap-2"> <Label htmlFor="theme-light" className={`flex flex-col items-center justify-between rounded-md border-2 ${ theme === "light" ? "border-primary" : "border-muted" } bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer`} > <RadioGroupItem value="light" id="theme-light" className="sr-only" /> <Sun className="h-6 w-6 mb-3" /> <span>Light</span> </Label> <Label htmlFor="theme-dark" className={`flex flex-col items-center justify-between rounded-md border-2 ${ theme === "dark" ? "border-primary" : "border-muted" } bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer`} > <RadioGroupItem value="dark" id="theme-dark" className="sr-only" /> <Moon className="h-6 w-6 mb-3" /> <span>Dark</span> </Label> <Label htmlFor="theme-system" className={`flex flex-col items-center justify-between rounded-md border-2 ${ theme === "system" ? "border-primary" : "border-muted" } bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer`} > <RadioGroupItem value="system" id="theme-system" className="sr-only" /> <Laptop className="h-6 w-6 mb-3" /> <span>System</span> </Label> </RadioGroup> </div>
              <div className="space-y-2"> <h3 className="text-sm font-medium">Color Palettes</h3> <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"> {colorPalettes.map((palette) => ( <Card key={palette.name} className={`cursor-pointer hover:border-primary transition-colors ${ colorPalette === palette.value ? "border-primary border-2" : "border" }`} onClick={() => setColorPalette(palette.value as any)} > <CardContent className="p-3"> <div className="flex flex-col items-center gap-2"> <div className="flex gap-1 mt-2"> <div className={`w-6 h-6 rounded-full ${palette.primary}`} ></div> <div className={`w-6 h-6 rounded-full ${palette.secondary}`} ></div> </div> <span className="text-xs font-medium mt-1"> {palette.name} </span> <span className="text-[10px] text-muted-foreground text-center leading-tight"> {palette.description} </span> </div> </CardContent> </Card> ))} </div> </div>
            </TabsContent>

            <TabsContent value="audio" className="mt-0 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="minato-voice-select">Minato's Voice</Label>
                <p className="text-xs text-muted-foreground">
                  Select a voice personality for Minato from these anime-inspired options.
                </p>
                <Select
                  value={selectedMinatoVoice}
                  onValueChange={(value) => handleSaveMinatoVoice(value as OpenAITtsVoice)}
                  disabled={isSavingVoice}
                >
                  <SelectTrigger id="minato-voice-select" className="w-full">
                    <SelectValue placeholder="Select Minato's voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_TTS_VOICES_WITH_DESC.map(voice => (
                        <SelectItem key={voice.id} value={voice.id}>
                            <span className="font-medium">{voice.name}</span> 
                            <span className="text-muted-foreground/70 ml-2 text-xs">{voice.description}</span>
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isSavingVoice && <p className="text-xs text-muted-foreground mt-1 flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1"/>Saving voice...</p>}
                
                {/* Current Voice Display */}
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => playVoiceSample(selectedMinatoVoice)}
                      className={`p-1.5 rounded-full hover:bg-primary/10 ${isPlayingSample ? 'bg-primary/20 text-primary animate-pulse' : 'text-primary/80'}`}
                      disabled={isSavingVoice}
                      aria-label="Play voice sample"
                    >
                      {isPlayingSample ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <div>
                      <p className="text-sm font-medium">Current Voice: {getVoiceCharacterName(selectedMinatoVoice)}</p>
                      <p className="text-xs text-muted-foreground">{getVoiceDescription(selectedMinatoVoice)}</p>
                      <p className="text-xs text-primary mt-1 cursor-pointer hover:underline" onClick={() => playVoiceSample(selectedMinatoVoice)}>
                        Click the speaker to hear a sample
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 rounded-lg border border-border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="text-primary">Tip:</span> Click the speaker icon above to hear a sample of the selected voice.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="mt-0 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tool Preferences</h3>
                <p className="text-sm text-muted-foreground">Customize how Minato's tools work for you.</p>
                
                <Tabs defaultValue="news" className="w-full">
                  <TabsList className="w-full justify-start overflow-auto bg-transparent p-0 h-auto">
                    <TabsTrigger value="news" className="rounded-md px-3 py-1.5 text-xs">News</TabsTrigger>
                    <TabsTrigger value="social" className="rounded-md px-3 py-1.5 text-xs">Social Media</TabsTrigger>
                    <TabsTrigger value="entertainment" className="rounded-md px-3 py-1.5 text-xs">Entertainment</TabsTrigger>
                    <TabsTrigger value="shopping" className="rounded-md px-3 py-1.5 text-xs">Shopping</TabsTrigger>
                    <TabsTrigger value="tiktok" className="rounded-md px-3 py-1.5 text-xs">TikTok</TabsTrigger>
                    <TabsTrigger value="events" className="rounded-md px-3 py-1.5 text-xs">Events</TabsTrigger>
                    <TabsTrigger value="food" className="rounded-md px-3 py-1.5 text-xs">Food & Recipes</TabsTrigger>
                    <TabsTrigger value="sports" className="rounded-md px-3 py-1.5 text-xs">Sports</TabsTrigger>
                    <TabsTrigger value="hackernews" className="rounded-md px-3 py-1.5 text-xs">Tech News</TabsTrigger>
                    <TabsTrigger value="interests" className="rounded-md px-3 py-1.5 text-xs">Interests</TabsTrigger>
                    <TabsTrigger value="dailybrief" className="rounded-md px-3 py-1.5 text-xs">Daily Brief</TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-4 space-y-4">
                    {/* News Preferences */}
                    <TabsContent value="news" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">News Preferences</CardTitle>
                          <CardDescription>Choose your preferred news sources and categories</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="news-sources">Preferred News Sources</Label>
                            <div className="flex flex-wrap gap-2">
                              {['bbc-news', 'cnn', 'the-washington-post', 'the-wall-street-journal', 'bloomberg', 'reuters', 'al-jazeera-english', 'associated-press', 'abc-news', 'fox-news'].map(source => (
                                <Button
                                  key={source}
                                  variant={newsSources.includes(source) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (newsSources.includes(source)) {
                                      setNewsSources(newsSources.filter(s => s !== source));
                                    } else {
                                      setNewsSources([...newsSources, source]);
                                    }
                                  }}
                                >
                                  {source}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect sources</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="news-categories">News Categories</Label>
                            <div className="flex flex-wrap gap-2">
                              {['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'].map(category => (
                                <Button
                                  key={category}
                                  variant={newsPreferredCategories.includes(category) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (newsPreferredCategories.includes(category)) {
                                      setNewsPreferredCategories(newsPreferredCategories.filter(c => c !== category));
                                    } else {
                                      setNewsPreferredCategories([...newsPreferredCategories, category]);
                                    }
                                  }}
                                >
                                  {category}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    {/* Social Media Preferences */}
                    <TabsContent value="social" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Reddit Preferences</CardTitle>
                          <CardDescription>Subreddits you're interested in</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Preferred Subreddits</Label>
                            <div className="flex flex-col space-y-2">
                              <div className="flex gap-2">
                                <Input 
                                  placeholder="Add subreddit (e.g., worldnews)" 
                                  className="flex-1"
                                  id="new-subreddit"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const input = e.currentTarget;
                                      const value = input.value.trim();
                                      if (value && !redditPreferredSubreddits.includes(value)) {
                                        setRedditPreferredSubreddits([...redditPreferredSubreddits, value]);
                                        input.value = '';
                                      }
                                    }
                                  }}
                                />
                                <Button 
                                  onClick={() => {
                                    const input = document.getElementById('new-subreddit') as HTMLInputElement;
                                    const value = input.value.trim();
                                    if (value && !redditPreferredSubreddits.includes(value)) {
                                      setRedditPreferredSubreddits([...redditPreferredSubreddits, value]);
                                      input.value = '';
                                    }
                                  }}
                                  size="sm"
                                >
                                  Add
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {redditPreferredSubreddits.map(subreddit => (
                                  <div key={subreddit} className="bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1">
                                    <span className="text-xs">{subreddit}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-4 w-4 rounded-full"
                                      onClick={() => setRedditPreferredSubreddits(redditPreferredSubreddits.filter(s => s !== subreddit))}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">YouTube Preferences</CardTitle>
                          <CardDescription>Channels you're interested in</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Preferred YouTube Channels</Label>
                            <div className="flex flex-col space-y-2">
                              <div className="flex gap-2">
                                <Input 
                                  placeholder="Add channel (e.g., TED)" 
                                  className="flex-1"
                                  id="new-channel"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const input = e.currentTarget;
                                      const value = input.value.trim();
                                      if (value && !youtubePreferredChannels.includes(value)) {
                                        setYoutubePreferredChannels([...youtubePreferredChannels, value]);
                                        input.value = '';
                                      }
                                    }
                                  }}
                                />
                                <Button 
                                  onClick={() => {
                                    const input = document.getElementById('new-channel') as HTMLInputElement;
                                    const value = input.value.trim();
                                    if (value && !youtubePreferredChannels.includes(value)) {
                                      setYoutubePreferredChannels([...youtubePreferredChannels, value]);
                                      input.value = '';
                                    }
                                  }}
                                  size="sm"
                                >
                                  Add
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {youtubePreferredChannels.map(channel => (
                                  <div key={channel} className="bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1">
                                    <span className="text-xs">{channel}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-4 w-4 rounded-full"
                                      onClick={() => setYoutubePreferredChannels(youtubePreferredChannels.filter(c => c !== channel))}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="entertainment" className="space-y-4">
                      {/* Entertainment preferences will go here */}
                    </TabsContent>
                    <TabsContent value="shopping" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Shopping Preferences</CardTitle>
                          <CardDescription>Preferred retailers and brands</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="shopping-retailers">Preferred Retailers</Label>
                            <div className="flex flex-wrap gap-2">
                              {['amazon', 'ebay', 'walmart', 'target', 'bestbuy', 'costco', 'macys', 'nordstrom', 'zappos', 'macys'].map(retailer => (
                                <Button
                                  key={retailer}
                                  variant={webSearchShoppingPreferredRetailers.includes(retailer) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (webSearchShoppingPreferredRetailers.includes(retailer)) {
                                      setWebSearchShoppingPreferredRetailers(webSearchShoppingPreferredRetailers.filter(r => r !== retailer));
                                    } else {
                                      setWebSearchShoppingPreferredRetailers([...webSearchShoppingPreferredRetailers, retailer]);
                                    }
                                  }}
                                >
                                  {retailer}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect retailers</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="shopping-price-range">Price Range</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                id="shopping-price-min"
                                placeholder="Min"
                                value={webSearchShoppingPriceMin}
                                onChange={(e) => setWebSearchShoppingPriceMin(e.target.value ? Number(e.target.value) : undefined)}
                              />
                              <Input
                                type="number"
                                id="shopping-price-max"
                                placeholder="Max"
                                value={webSearchShoppingPriceMax}
                                onChange={(e) => setWebSearchShoppingPriceMax(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Enter your preferred price range</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="shopping-preferred-brands">Preferred Brands</Label>
                            <div className="flex flex-wrap gap-2">
                              {['apple', 'samsung', 'nike', 'adidas', 'amazon', 'dell', 'hp', 'lenovo', 'microsoft', 'sony'].map(brand => (
                                <Button
                                  key={brand}
                                  variant={webSearchShoppingPreferredBrands.includes(brand) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (webSearchShoppingPreferredBrands.includes(brand)) {
                                      setWebSearchShoppingPreferredBrands(webSearchShoppingPreferredBrands.filter(b => b !== brand));
                                    } else {
                                      setWebSearchShoppingPreferredBrands([...webSearchShoppingPreferredBrands, brand]);
                                    }
                                  }}
                                >
                                  {brand}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect brands</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="shopping-shipping-preference">Shipping Preference</Label>
                            <Select
                              value={webSearchShoppingShippingPreference}
                              onValueChange={(value) => setWebSearchShoppingShippingPreference(value)}
                            >
                              <SelectTrigger id="shopping-shipping-preference">
                                <SelectValue placeholder="Select shipping preference" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any</SelectItem>
                                <SelectItem value="free">Free Shipping</SelectItem>
                                <SelectItem value="fast">Fast Shipping</SelectItem>
                                <SelectItem value="premium">Premium Shipping</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">Select your preferred shipping preference</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="shopping-review-threshold">Review Threshold</Label>
                            <Input
                              type="number"
                              id="shopping-review-threshold"
                              placeholder="3"
                              value={webSearchShoppingReviewThreshold}
                              onChange={(e) => setWebSearchShoppingReviewThreshold(Number(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Enter the minimum number of reviews for a product to be considered</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="tiktok" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">TikTok Preferences</CardTitle>
                          <CardDescription>Preferred creators and hashtags</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="tiktok-creators">Preferred Creators</Label>
                            <div className="flex flex-wrap gap-2">
                              {['tiktok-user1', 'tiktok-user2', 'tiktok-user3', 'tiktok-user4', 'tiktok-user5'].map(creator => (
                                <Button
                                  key={creator}
                                  variant={webSearchTikTokPreferredCreators.includes(creator) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (webSearchTikTokPreferredCreators.includes(creator)) {
                                      setWebSearchTikTokPreferredCreators(webSearchTikTokPreferredCreators.filter(c => c !== creator));
                                    } else {
                                      setWebSearchTikTokPreferredCreators([...webSearchTikTokPreferredCreators, creator]);
                                    }
                                  }}
                                >
                                  {creator}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect creators</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="tiktok-hashtags">Preferred Hashtags</Label>
                            <div className="flex flex-wrap gap-2">
                              {['#tiktok-trending', '#tiktok-funny', '#tiktok-beauty', '#tiktok-travel', '#tiktok-food'].map(hashtag => (
                                <Button
                                  key={hashtag}
                                  variant={webSearchTikTokPreferredHashtags.includes(hashtag) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (webSearchTikTokPreferredHashtags.includes(hashtag)) {
                                      setWebSearchTikTokPreferredHashtags(webSearchTikTokPreferredHashtags.filter(h => h !== hashtag));
                                    } else {
                                      setWebSearchTikTokPreferredHashtags([...webSearchTikTokPreferredHashtags, hashtag]);
                                    }
                                  }}
                                >
                                  {hashtag}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect hashtags</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="tiktok-content-types">Content Types</Label>
                            <div className="flex flex-wrap gap-2">
                              {['videos', 'reels', 'short-form', 'long-form', 'live-stream'].map(contentType => (
                                <Button
                                  key={contentType}
                                  variant={webSearchTikTokContentTypes.includes(contentType) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (webSearchTikTokContentTypes.includes(contentType)) {
                                      setWebSearchTikTokContentTypes(webSearchTikTokContentTypes.filter(c => c !== contentType));
                                    } else {
                                      setWebSearchTikTokContentTypes([...webSearchTikTokContentTypes, contentType]);
                                    }
                                  }}
                                >
                                  {contentType}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect content types</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="tiktok-video-length-preference">Video Length Preference</Label>
                            <Select
                              value={webSearchTikTokVideoLengthPreference}
                              onValueChange={(value) => setWebSearchTikTokVideoLengthPreference(value)}
                            >
                              <SelectTrigger id="tiktok-video-length-preference">
                                <SelectValue placeholder="Select video length preference" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any</SelectItem>
                                <SelectItem value="short">Short</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="long">Long</SelectItem>
                                <SelectItem value="live">Live</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">Select your preferred video length</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="events" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Event Finder Preferences</CardTitle>
                          <CardDescription>Preferred venues and event types</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="event-venues">Preferred Venues</Label>
                            <div className="flex flex-wrap gap-2">
                              {['concert', 'theater', 'sports-event', 'festival', 'conference', 'workshop', 'seminar', 'party', 'networking-event', 'charity-event'].map(venue => (
                                <Button
                                  key={venue}
                                  variant={eventFinderPreferredVenues.includes(venue) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (eventFinderPreferredVenues.includes(venue)) {
                                      setEventFinderPreferredVenues(eventFinderPreferredVenues.filter(v => v !== venue));
                                    } else {
                                      setEventFinderPreferredVenues([...eventFinderPreferredVenues, venue]);
                                    }
                                  }}
                                >
                                  {venue}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect venues</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="event-types">Event Types</Label>
                            <div className="flex flex-wrap gap-2">
                              {['music', 'art', 'sports', 'tech', 'fashion', 'food', 'travel', 'health', 'business', 'education', 'entertainment', 'film', 'gaming', 'literature', 'lifestyle', 'politics'].map(eventType => (
                                <Button
                                  key={eventType}
                                  variant={eventFinderEventTypes.includes(eventType) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (eventFinderEventTypes.includes(eventType)) {
                                      setEventFinderEventTypes(eventFinderEventTypes.filter(e => e !== eventType));
                                    } else {
                                      setEventFinderEventTypes([...eventFinderEventTypes, eventType]);
                                    }
                                  }}
                                >
                                  {eventType}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect event types</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="event-price-range">Price Range</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                id="event-price-min"
                                placeholder="Min"
                                value={eventFinderPriceMin}
                                onChange={(e) => setEventFinderPriceMin(e.target.value ? Number(e.target.value) : undefined)}
                              />
                              <Input
                                type="number"
                                id="event-price-max"
                                placeholder="Max"
                                value={eventFinderPriceMax}
                                onChange={(e) => setEventFinderPriceMax(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Enter your preferred price range</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="event-distance-radius">Distance Radius</Label>
                            <Input
                              type="number"
                              id="event-distance-radius"
                              placeholder="25"
                              value={eventFinderDistanceRadius}
                              onChange={(e) => setEventFinderDistanceRadius(Number(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Enter the maximum distance (in miles) for events</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="event-preferred-days-of-week">Preferred Days of Week</Label>
                            <div className="flex flex-wrap gap-2">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <Button
                                  key={day}
                                  variant={eventFinderPreferredDaysOfWeek.includes(day) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (eventFinderPreferredDaysOfWeek.includes(day)) {
                                      setEventFinderPreferredDaysOfWeek(eventFinderPreferredDaysOfWeek.filter(d => d !== day));
                                    } else {
                                      setEventFinderPreferredDaysOfWeek([...eventFinderPreferredDaysOfWeek, day]);
                                    }
                                  }}
                                >
                                  {day}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect days of the week</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="event-time-preference">Time Preference</Label>
                            <Select
                              value={eventFinderTimePreference}
                              onValueChange={(value) => setEventFinderTimePreference(value)}
                            >
                              <SelectTrigger id="event-time-preference">
                                <SelectValue placeholder="Select time preference" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any Time</SelectItem>
                                <SelectItem value="morning">Morning</SelectItem>
                                <SelectItem value="afternoon">Afternoon</SelectItem>
                                <SelectItem value="evening">Evening</SelectItem>
                                <SelectItem value="night">Night</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">Select your preferred time of day for events</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="food" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Recipe Preferences</CardTitle>
                          <CardDescription>Cuisines you prefer</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Preferred Cuisines</Label>
                            <div className="flex flex-wrap gap-2">
                              {['Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'Thai', 'French', 'Greek', 'Mediterranean', 'American', 'Korean', 'Vietnamese', 'Middle Eastern', 'Spanish', 'Caribbean'].map(cuisine => (
                                <Button
                                  key={cuisine}
                                  variant={recipePreferredCuisines.includes(cuisine) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (recipePreferredCuisines.includes(cuisine)) {
                                      setRecipePreferredCuisines(recipePreferredCuisines.filter(c => c !== cuisine));
                                    } else {
                                      setRecipePreferredCuisines([...recipePreferredCuisines, cuisine]);
                                    }
                                  }}
                                >
                                  {cuisine}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="sports" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Sports Preferences</CardTitle>
                          <CardDescription>Sports and leagues you follow</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Preferred Leagues</Label>
                            <div className="flex flex-wrap gap-2">
                              {['NBA', 'NFL', 'MLB', 'NHL', 'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'MLS', 'UEFA Champions League', 'Formula 1', 'UFC', 'Tennis', 'Golf'].map(league => (
                                <Button
                                  key={league}
                                  variant={sportsPreferredLeagues.includes(league) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (sportsPreferredLeagues.includes(league)) {
                                      setSportsPreferredLeagues(sportsPreferredLeagues.filter(l => l !== league));
                                    } else {
                                      setSportsPreferredLeagues([...sportsPreferredLeagues, league]);
                                    }
                                  }}
                                >
                                  {league}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="hackernews" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Tech News Preferences</CardTitle>
                          <CardDescription>Preferred topics and categories</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="hackernews-topics">Preferred Topics</Label>
                            <div className="flex flex-wrap gap-2">
                              {['tech-trends', 'startup-stories', 'machine-learning', 'cybersecurity', 'blockchain', 'artificial-intelligence', 'software-development', 'tech-culture', 'tech-hardware', 'tech-software', 'tech-hardware', 'tech-software'].map(topic => (
                                <Button
                                  key={topic}
                                  variant={hackernewsPreferredTopics.includes(topic) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (hackernewsPreferredTopics.includes(topic)) {
                                      setHackernewsPreferredTopics(hackernewsPreferredTopics.filter(t => t !== topic));
                                    } else {
                                      setHackernewsPreferredTopics([...hackernewsPreferredTopics, topic]);
                                    }
                                  }}
                                >
                                  {topic}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect topics</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="hackernews-categories">Preferred Categories</Label>
                            <div className="flex flex-wrap gap-2">
                              {['technology', 'business', 'science', 'health', 'entertainment', 'sports', 'gaming', 'lifestyle', 'politics', 'education'].map(category => (
                                <Button
                                  key={category}
                                  variant={interestCategories.includes(category) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (interestCategories.includes(category)) {
                                      setInterestCategories(interestCategories.filter(c => c !== category));
                                    } else {
                                      setInterestCategories([...interestCategories, category]);
                                    }
                                  }}
                                >
                                  {category}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click to select/deselect categories</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="interests" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Interest Categories</CardTitle>
                          <CardDescription>Topics you care about (used for daily briefs and recommendations)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Your Interests</Label>
                            <div className="flex flex-wrap gap-2">
                              {['sports', 'cinema', 'tvshows', 'politics', 'tech', 'anime', 'gaming', 'music', 'books', 'science', 'travel', 'cooking', 'fashion', 'finance', 'health', 'art'].map(interest => (
                                <Button
                                  key={interest}
                                  variant={interestCategories.includes(interest) ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    if (interestCategories.includes(interest)) {
                                      setInterestCategories(interestCategories.filter(i => i !== interest));
                                    } else {
                                      setInterestCategories([...interestCategories, interest]);
                                    }
                                  }}
                                >
                                  {interest}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="dailybrief" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Daily Briefing</CardTitle>
                          <CardDescription>Configure your personalized daily summary</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="daily-briefing">Enable Daily Briefing</Label>
                              <p className="text-xs text-muted-foreground">Receive a personalized summary of your day</p>
                            </div>
                            <Switch 
                              id="daily-briefing" 
                              checked={dailyBriefingEnabled}
                              onCheckedChange={setDailyBriefingEnabled}
                            />
                          </div>
                          
                          {dailyBriefingEnabled && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="briefing-time">Preferred Time</Label>
                                <Input 
                                  id="briefing-time" 
                                  type="time" 
                                  value={dailyBriefingTime}
                                  onChange={(e) => setDailyBriefingTime(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Time when you'd like to receive your daily brief</p>
                              </div>
                              
                              <div className="space-y-3">
                                <Label>Include in Daily Brief</Label>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      id="include-news" 
                                      checked={dailyBriefingOptions.includeNews}
                                      onCheckedChange={(checked) => 
                                        setDailyBriefingOptions({...dailyBriefingOptions, includeNews: !!checked})
                                      }
                                    />
                                    <Label htmlFor="include-news" className="text-sm">News updates</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      id="include-weather" 
                                      checked={dailyBriefingOptions.includeWeather}
                                      onCheckedChange={(checked) => 
                                        setDailyBriefingOptions({...dailyBriefingOptions, includeWeather: !!checked})
                                      }
                                    />
                                    <Label htmlFor="include-weather" className="text-sm">Weather forecast</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      id="include-calendar" 
                                      checked={dailyBriefingOptions.includeCalendar}
                                      onCheckedChange={(checked) => 
                                        setDailyBriefingOptions({...dailyBriefingOptions, includeCalendar: !!checked})
                                      }
                                    />
                                    <Label htmlFor="include-calendar" className="text-sm">Calendar events</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      id="include-reminders" 
                                      checked={dailyBriefingOptions.includeReminders}
                                      onCheckedChange={(checked) => 
                                        setDailyBriefingOptions({...dailyBriefingOptions, includeReminders: !!checked})
                                      }
                                    />
                                    <Label htmlFor="include-reminders" className="text-sm">Reminders</Label>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </div>
                </Tabs>
                
                <Button 
                  onClick={handleSavePreferences} 
                  disabled={isSavingPreferences} 
                  className="w-full"
                >
                  {isSavingPreferences ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                  Save All Preferences
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-0 space-y-4">
              <Card> <CardHeader className="pb-4"> <CardTitle className="text-lg flex items-center gap-2"> <FileArchive className="h-5 w-5 text-primary" /> Archived Documents </CardTitle> <CardDescription className="text-sm"> Documents you've shared with Minato. These are currently stored locally in your browser for this session. </CardDescription> </CardHeader> <CardContent> {uploadedDocuments.length === 0 ? ( <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg"> <Info className="mx-auto h-10 w-10 text-gray-400" /> <p className="mt-3 text-sm font-medium"> No documents in current session. </p> <p className="mt-1 text-xs"> Attach documents in the chat to see them here. </p> </div> ) : ( <ScrollArea className="max-h-[calc(100vh-22rem)] border rounded-lg"> <ul className="divide-y divide-border"> {uploadedDocuments.map((doc) => { const docUrl = getDocumentUrl(doc.file); return ( <li key={doc.id} className={cn( "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3 hover:bg-muted/50" )} > <div className="flex items-center gap-3 min-w-0 flex-1"> <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" /> <div className="min-w-0"> <p className="text-sm font-medium truncate text-foreground" title={doc.name} > {doc.name} </p> <p className="text-xs text-muted-foreground"> {formatFileSize(doc.size)} - {format(doc.uploadedAt, "PPp")} </p> </div> </div> <div className="flex items-center gap-1 flex-shrink-0"> {docUrl ? ( <TooltipProvider delayDuration={100}> <Tooltip> <TooltipTrigger asChild> <a href={docUrl} download={doc.name} target="_blank" rel="noopener noreferrer" onClick={() => handleLinkClick(docUrl)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7 text-muted-foreground" > <ExternalLink className="h-3.5 w-3.5" /> <span className="sr-only"> View/Download {doc.name} </span> </a> </TooltipTrigger> <TooltipContent> <p>View / Download</p> </TooltipContent> </Tooltip> </TooltipProvider> ) : ( <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" disabled > <ExternalLink className="h-3.5 w-3.5" /> </Button> )} <TooltipProvider delayDuration={100}> <Tooltip> <TooltipTrigger asChild> <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDeleteDocument(doc.id)} > <Trash2 className="h-3.5 w-3.5" /> <span className="sr-only"> Delete {doc.name} </span> </Button> </TooltipTrigger> <TooltipContent> <p>Remove from session</p> </TooltipContent> </Tooltip> </TooltipProvider> </div> </li> ); })} </ul> </ScrollArea> )} </CardContent> </Card>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0 space-y-6">
              <div className="rounded-lg border border-border p-4 bg-muted/30"> 
                <p className="text-sm text-foreground/90"> 
                  Minato is committed to protecting your privacy. Your data is encrypted and securely stored. 
                  We only use your information to provide and improve our services.
                </p> 
              </div>
              
              <div className="space-y-4"> 
                <h3 className="text-sm font-medium flex items-center gap-2">
                  Google Integrations
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-80">
                        <p className="text-xs">
                          Connect your Google account to let Minato check your calendar events and emails.
                          You can revoke access at any time in your Google account settings or here.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h3> 
                
                <div className="rounded-lg border border-border p-4 space-y-6 relative overflow-hidden">
                  {/* Calendar Integration */}
                  <div className="flex items-center justify-between"> 
                    <div className="flex items-center gap-2"> 
                      <Calendar className="h-5 w-5 text-primary" /> 
                      <div> 
                        <h4 className="font-medium text-sm flex items-center gap-1.5"> 
                          Google Calendar 
                          {googleCalendarConnected && <Check className="h-3.5 w-3.5 text-green-500" />}
                        </h4> 
                        <p className="text-xs text-muted-foreground"> 
                          {googleCalendarConnected 
                            ? "Minato can access your calendar events" 
                            : "Allow Minato to check your calendar events"}
                        </p> 
                      </div> 
                    </div> 
                    <div className="flex items-center gap-2"> 
                      {googleCalendarConnected ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleGoogleDisconnect()} 
                          disabled={!!isConnectingGoogle} 
                          className="flex items-center gap-1.5"
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleGoogleConnect("calendar")} 
                          disabled={!!isConnectingGoogle} 
                          className="text-primary border-primary/50 hover:bg-primary/10 flex items-center gap-1.5"
                        >
                          Connect
                        </Button>
                      )}
                    </div> 
                  </div>
                  
                  {/* Gmail Integration */}
                  <div className="flex items-center justify-between"> 
                    <div className="flex items-center gap-2"> 
                      <Mail className="h-5 w-5 text-primary" /> 
                      <div> 
                        <h4 className="font-medium text-sm flex items-center gap-1.5"> 
                          Google Gmail 
                          {googleGmailConnected && <Check className="h-3.5 w-3.5 text-green-500" />}
                        </h4> 
                        <p className="text-xs text-muted-foreground"> 
                          {googleGmailConnected 
                            ? "Minato can access your email messages" 
                            : "Allow Minato to check your emails"}
                        </p> 
                      </div> 
                    </div> 
                    <div className="flex items-center gap-2"> 
                      {googleGmailConnected ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleGoogleDisconnect()} 
                          disabled={!!isConnectingGoogle} 
                          className="flex items-center gap-1.5"
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleGoogleConnect("email")} 
                          disabled={!!isConnectingGoogle} 
                          className="text-primary border-primary/50 hover:bg-primary/10 flex items-center gap-1.5"
                        >
                          Connect
                        </Button>
                      )}
                    </div> 
                  </div>
                  
                  {/* Connect Both Services at Once (Optional) */}
                  {!googleCalendarConnected && !googleGmailConnected && (
                    <div className="pt-2 border-t border-border/50">
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleGoogleConnect("both")} 
                        disabled={!!isConnectingGoogle} 
                        className="w-full flex items-center justify-center gap-1.5"
                      >
                        Connect Calendar & Gmail Together
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Connect both services at once for the full experience
                      </p>
                    </div>
                  )}
                  
                  {/* Disconnect All Services */}
                  {(googleCalendarConnected || googleGmailConnected) && (
                    <div className="pt-2 border-t border-border/50">
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleGoogleDisconnect()} 
                        disabled={!!isConnectingGoogle} 
                        className="w-full flex items-center justify-center gap-1.5"
                      >
                        {isConnectingGoogle?.startsWith('disconnect') && <Loader2 className="h-4 w-4 animate-spin"/>}
                        Disconnect All Google Services
                      </Button>
                    </div>
                  )}
                  
                  {/* Connection Status */}
                  {isConnectingGoogle && (
                    <div className={cn(
                      "absolute inset-0 bg-background/80 backdrop-blur-[1px] flex items-center justify-center flex-col gap-2",
                      isConnectingGoogle.startsWith('disconnect') ? "text-destructive" : "text-primary"
                    )}>
                      <Loader2 className="h-8 w-8 animate-spin"/>
                      <p className="text-sm font-medium">
                        {isConnectingGoogle.startsWith('disconnect') 
                          ? "Disconnecting Google services..." 
                          : isConnectingGoogle === 'both'
                            ? "Connecting Google Calendar & Gmail..."
                            : isConnectingGoogle === 'calendar'
                              ? "Connecting Google Calendar..."
                              : "Connecting Google Gmail..."}
                      </p>
                      {!isConnectingGoogle.startsWith('disconnect') && (
                        <p className="text-xs text-muted-foreground">You'll be redirected to Google's authorization page</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Google Integration Information */}
                <Card className="bg-muted/30 border-primary/10">
                  <CardContent className="p-3 pt-3">
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <Info className="h-4 w-4 text-primary/70 flex-shrink-0 mt-0.5"/>
                      <div>
                        <p>When you enable these integrations, Minato will:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          <li>Only access your data when you ask related questions</li>
                          <li>Never share your data with third parties</li>
                          <li>Only use read-only access (won't modify anything)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </div>
    </Tabs>
  </motion.div>

  <PersonaEditorDialog
    open={personaEditorOpen}
    onOpenChange={setPersonaEditorOpen}
    initialPersona={editingPersona ? {
      id: editingPersona.id,
      name: editingPersona.name,
      description: editingPersona.description || "",
      system_prompt: editingPersona.system_prompt,
      isCustom: editingPersona.isCustom
    } : undefined}
    onSave={handleSavePersonaDialog as any}
  />
  <UpgradeDialog
    open={isUpgradeDialogOpen}
    onOpenChange={setIsUpgradeDialogOpen}
  />
</>

);
}
interface UpgradeDialogProps {
open: boolean;
onOpenChange: (open: boolean) => void;
}
function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
const handleGetStarted = () => { console.log("Get Started clicked!"); onOpenChange(false); toast({ title: "Upgrade Action", description: "Redirecting to upgrade page (simulation)...", }); };
const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" }, }, hover: { y: -5, transition: { duration: 0.3, ease: "easeInOut" } }, };
const listItemVariants = { hidden: { opacity: 0, x: -10 }, visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.1, duration: 0.3 }, }), };
return ( <Dialog open={open} onOpenChange={onOpenChange}> <DialogContent className="sm:max-w-md"> <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} > <DialogHeader> <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent"> Unlock Pro Features </DialogTitle> <DialogDescription className="text-center mt-2 text-muted-foreground/80"> Supercharge Minato with the Pro plan. </DialogDescription> </DialogHeader> <motion.div className="py-6" variants={cardVariants} initial="hidden" animate="visible" whileHover="hover" > <Card className="border-primary/20 shadow-xl relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"> <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-emerald-400/5 rounded-lg" /> <CardHeader className="flex flex-row items-center justify-between pb-4 px-6"> <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent"> Pro Plan </CardTitle> <div className="flex items-baseline space-x-1"> <span className="text-3xl font-bold">$19</span> <span className="text-sm font-medium text-muted-foreground/80"> /month </span> </div> </CardHeader> <CardContent className="space-y-3 px-6"> <p className="text-sm text-center text-muted-foreground/80 mb-4"> Includes everything in Free, plus: </p> <motion.ul className="space-y-3 text-sm"> {[ "Advanced AI Models (GPT-4o, etc.)", "Unlimited Memory Storage", "Faster Response Times", "More Custom Personas", "Priority Support", ].map((feature, i) => ( <motion.li key={feature} className="flex items-center" variants={listItemVariants} custom={i} > <motion.span className="mr-2" whileHover={{ scale: 1.1 }}> <Check className="h-4 w-4 text-emerald-400" /> </motion.span> <span className="text-muted-foreground/90"> {feature} </span> </motion.li> ))} </motion.ul> </CardContent> <CardFooter className="px-6"> <Button className="w-full z-30 bg-gradient-to-r from-primary to-emerald-400 hover:from-primary/90 hover:to-emerald-400/90 text-white font-semibold shadow-lg transition-all duration-300" onClick={handleGetStarted} > Get Started with Pro </Button> </CardFooter> </Card> </motion.div> </motion.div> </DialogContent> </Dialog> );
}