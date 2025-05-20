//components/settings/settings-panel.tsx
import React, { useState, useCallback, useEffect } from "react";
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
import { UserPersona as PersonaTypeFromLib, OpenAITtsVoice } from "@/lib/types";
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
  uploadedDocuments: DocumentFile[];
  onDeleteDocument: (id: string) => void;
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

const formatFileSize = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const ALL_TTS_VOICES_WITH_DESC: { id: OpenAITtsVoice; name: string; description: string }[] = [
  { id: "alloy", name: "Alloy", description: "Warm, balanced, and professional." },
  { id: "echo", name: "Echo", description: "Clear, articulate, and slightly formal." },
  { id: "fable", name: "Fable", description: "Storytelling, expressive, and engaging." },
  { id: "onyx", name: "Onyx", description: "Deep, resonant, and authoritative." },
  { id: "nova", name: "Nova", description: "Bright, friendly, and energetic (Default)." },
  { id: "shimmer", name: "Shimmer", description: "Gentle, soothing, and slightly airy." },
  { id: "ash", name: "Ash", description: "Calm and composed." },
  { id: "ballad", name: "Ballad", description: "Smooth and melodic." },
  { id: "coral", name: "Coral", description: "Friendly and approachable." },
  { id: "sage", name: "Sage", description: "Wise and mature." },
  { id: "verse", name: "Verse", description: "Clear and narrative." },
];

type GoogleConnectionScope = 'calendar' | 'email' | 'both' | 'disconnect_all' | null;

export function SettingsPanel({
  onClose,
  uploadedDocuments,
  onDeleteDocument,
}: SettingsPanelProps) {
  const { theme, colorPalette, setTheme, setColorPalette } = useTheme();
  const { user, profile, state, fetchUserProfileAndState, updateProfileState, isLoading: isAuthLoading } = useAuth();
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
  const [isFetchingSettings, setIsFetchingSettings] = useState(true); // Start true
  const [personas, setPersonas] = useState<UIPersona[]>([]);

  const fetchPersonasFromBackend = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/personas");
      if (!res.ok) {
        toast({ title: "Failed to fetch personas", variant: "destructive" });
        return;
      }
      const data = await res.json();
      const allPersonas: UIPersona[] = [
        ...(data.predefined || []).map((p: any) => ({
          id: p.id, name: p.name, description: p.description,
          systemPrompt: p.system_prompt, voice_id: p.voice_id, isCustom: false,
        })),
        ...(data.user || []).map((p: any) => ({
          id: p.id, name: p.name, description: p.description,
          systemPrompt: p.system_prompt, voice_id: p.voice_id, isCustom: true,
        })),
      ];
      setPersonas(allPersonas);
    } catch (e) {
      toast({ title: "Failed to fetch personas", variant: "destructive" });
    }
  }, [user]);

  const fetchAllBackendData = useCallback(async () => {
    if (!user) {
      setIsFetchingSettings(false); // Ensure loading stops if no user
      return;
    }
    setIsFetchingSettings(true);
    try {
      await fetchUserProfileAndState(true); // Force refresh profile/state
      await fetchPersonasFromBackend();
    } catch (error) {
      logger.error("[SettingsPanel] Error in fetchAllBackendData:", error);
      toast({title: "Error Loading Settings", description: "Could not load all settings.", variant: "destructive"});
    } finally {
      setIsFetchingSettings(false); // Stop loading regardless of outcome
    }
  }, [user, fetchUserProfileAndState, fetchPersonasFromBackend]);

  useEffect(() => {
    // Only run if not already fetching and user is available (or auth has finished loading)
    if (!isAuthLoading && user && isFetchingSettings) { 
      fetchAllBackendData();
    } else if (!isAuthLoading && !user) {
        // If auth is done and no user, stop fetching settings
        setIsFetchingSettings(false);
    }
  }, [user, isAuthLoading, fetchAllBackendData, isFetchingSettings]); // Added isFetchingSettings to dependencies

  useEffect(() => {
    if (profile) setUsername(profile.full_name || user?.user_metadata?.full_name || DEFAULT_USER_NAME);
    else if (user) setUsername(user.user_metadata?.full_name || DEFAULT_USER_NAME);
    
    if (state) {
      setLanguage(state.preferred_locale || appConfig.defaultLocale || "en-US");
      setSelectedPersonaId(state.active_persona_id || DEFAULT_PERSONA_ID);
      setSelectedMinatoVoice((state.chainedvoice as OpenAITtsVoice) || defaultMinatoVoice);
      setGoogleCalendarConnected(!!state.googlecalendarenabled);
      setGoogleGmailConnected(!!state.googleemailenabled);
    } else {
      // Defaults if state is not yet available or null
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
    const success = await updateProfileState({ full_name: username, first_name: username.split(" ")[0] || username });
    if (success) toast({ title: "Name saved!" });
    else toast({ title: "Failed to save name", variant: "destructive" });
    setIsSavingName(false);
  };

  const handleSaveLanguage = async () => {
    if (isSavingLanguage || !user) return;
    setIsSavingLanguage(true);
    const success = await updateProfileState({ preferred_locale: language });
    if (success) toast({ title: "Language preference saved!" });
    else toast({ title: "Failed to save language", variant: "destructive" });
    setIsSavingLanguage(false);
  };

  const handleSavePersona = async () => {
    if (isSavingPersona || !user) return;
    setIsSavingPersona(true);
    const success = await updateProfileState({ active_persona_id: selectedPersonaId });
    if (success) toast({ title: "Active persona saved!" });
    else toast({ title: "Failed to save persona", variant: "destructive" });
    setIsSavingPersona(false);
  };

  const handleSaveMinatoVoice = async (newVoice: OpenAITtsVoice) => {
    if (isSavingVoice || !user) return;
    setIsSavingVoice(true);
    setSelectedMinatoVoice(newVoice);
    const success = await updateProfileState({ chainedvoice: newVoice });
    if (success) toast({ title: "Minato's voice updated!" });
    else {
      toast({ title: "Failed to update voice", variant: "destructive" });
      setSelectedMinatoVoice((state?.chainedvoice as OpenAITtsVoice) || defaultMinatoVoice);
    }
    setIsSavingVoice(false);
  };

  const handleSavePersonaDialog = async (personaData: Omit<UIPersona, "id" | "isCustom">) => {
    if (!user) return;
    try {
      let newOrUpdatedPersona;
      const payload = {
        name: personaData.name,
        description: personaData.description || "",
        system_prompt: personaData.system_prompt,
        voice_id: personaData.voice_id,
      };

      if (editingPersona && editingPersona.isCustom && editingPersona.id) {
        const res = await fetch(`/api/personas/${editingPersona.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
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
          const err = await res.json();
          throw new Error(err.error || "Failed to create persona");
        }
        newOrUpdatedPersona = await res.json();
        toast({ title: "Persona created!" });
      }
      await fetchPersonasFromBackend(); // Refresh the list
      setSelectedPersonaId(newOrUpdatedPersona.id); // Set the new/updated persona as active
      await updateProfileState({ active_persona_id: newOrUpdatedPersona.id }); // Save to backend
    } catch (e: any) {
      toast({
        title: `Failed to ${editingPersona ? "update" : "create"} persona`,
        description: e.message,
        variant: "destructive"
      });
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
    try {
      const res = await fetch(`/api/personas/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) { const err = await res.json().catch(()=>null); throw new Error(err?.error || "Failed to delete persona"); }
      toast({ title: "Custom persona deleted!" });
      await fetchPersonasFromBackend();
      if (selectedPersonaId === id) { // If active persona was deleted, reset to default
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
      const res = await fetch(`/api/auth/connect/google?scope=${scope}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to initiate Google connection (${res.status})`);
      }
      const { authorizeUrl } = await res.json();
      if (authorizeUrl) {
        window.location.href = authorizeUrl; // Redirect to Google
      } else {
        throw new Error("Could not get Google authorization URL.");
      }
    } catch (error: any) {
      toast({ title: "Google Connection Error", description: error.message, variant: "destructive" });
      setIsConnectingGoogle(null);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!user) return;
    setIsConnectingGoogle('disconnect_all');
    try {
      const res = await fetch(`/api/auth/disconnect/google`, { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to disconnect Google services (${res.status})`);
      }
      toast({ title: "Google Services Disconnected", description: "Calendar and Email access has been revoked." });
      await fetchUserProfileAndState(true); // Force refresh to update connection status
    } catch (error: any) {
      toast({ title: "Disconnection Error", description: error.message, variant: "destructive" });
    } finally {
      setIsConnectingGoogle(null);
    }
  };

  const onGoogleToggle = (service: 'calendar' | 'email', checked: boolean) => {
    if (checked) {
      // If enabling a service and the other isn't connected yet OR this one isn't connected
      if (service === "calendar" && !googleCalendarConnected) {
        handleGoogleConnect("calendar"); // Can also be "both" if you want to connect all at once
      } else if (service === "email" && !googleGmailConnected) {
        handleGoogleConnect("email"); // Can also be "both"
      }
      // If one is already connected and we are enabling the other, also use "both" or individual
      // This logic might need to be smarter if individual enabling of scopes is desired after initial "both"
    } else {
      // Always disconnect all services if unchecking one, for simplicity.
      // If granular disconnect is needed, the backend API for disconnect needs `scope` param.
      handleGoogleDisconnect();
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
    try {
      return URL.createObjectURL(file);
    } catch (error) {
      console.error("Error creating object URL:", error);
      return null;
    }
  };

  const handleLinkClick = (url: string | null) => {
    // This function seems unused, but keeping it in case it's for a future feature.
    // If it's intended to open the URL, use window.open(url, '_blank');
  };

  const colorPalettes: ColorPaletteOption[] = [
    { name: "Arctic Dawn", value: "arctic-dawn", primary: "bg-blue-600", secondary: "bg-blue-200", description: "Cool blues and greys" },
    { name: "Sakura Blossom", value: "sakura-blossom", primary: "bg-pink-400", secondary: "bg-pink-100", description: "Soft pinks and whites" },
    { name: "Emerald Forest", value: "emerald-forest", primary: "bg-green-700", secondary: "bg-green-200", description: "Deep greens and browns" },
    { name: "Cyber Neon", value: "cyber-neon", primary: "bg-purple-600", secondary: "bg-cyan-300", description: "Vibrant purple and cyan" },
    { name: "Monochrome Ink", value: "monochrome-ink", primary: "bg-gray-800", secondary: "bg-gray-300", description: "Grayscale variants" },
    { name: "Sunset Gold", value: "sunset-gold", primary: "bg-amber-500", secondary: "bg-amber-200", description: "Warm oranges and golds" },
    { name: "Lavender Mist", value: "lavender-mist", primary: "bg-purple-400", secondary: "bg-purple-100", description: "Soft purples and lilacs" },
    { name: "Ocean Depths", value: "ocean-depths", primary: "bg-teal-700", secondary: "bg-blue-300", description: "Deep blues and teals" },
    { name: "Desert Sand", value: "desert-sand", primary: "bg-amber-600", secondary: "bg-yellow-100", description: "Warm neutrals and tans" },
    { name: "Midnight Galaxy", value: "midnight-galaxy", primary: "bg-indigo-800", secondary: "bg-violet-300", description: "Deep purples and blues" },
    { name: "Autumn Harvest", value: "autumn-harvest", primary: "bg-red-600", secondary: "bg-orange-300", description: "Rich reds and oranges" },
    { name: "Spring Meadow", value: "spring-meadow", primary: "bg-lime-600", secondary: "bg-yellow-300", description: "Fresh greens and yellows" },
    { name: "Royal Purple", value: "royal-purple", primary: "bg-purple-800", secondary: "bg-purple-300", description: "Deep royal purples" },
    { name: "Tropical Paradise", value: "tropical-paradise", primary: "bg-teal-500", secondary: "bg-yellow-200", description: "Bright tropical colors" },
    { name: "Ruby Red", value: "ruby-red", primary: "bg-red-700", secondary: "bg-red-200", description: "Rich ruby reds" },
    { name: "Midnight Blue", value: "midnight-blue", primary: "bg-blue-900", secondary: "bg-blue-300", description: "Deep midnight blues" },
    { name: "Forest Green", value: "forest-green", primary: "bg-green-800", secondary: "bg-green-300", description: "Dark forest greens" },
    { name: "Sunset Orange", value: "sunset-orange", primary: "bg-orange-600", secondary: "bg-orange-200", description: "Warm sunset oranges" },
    { name: "Slate Gray", value: "slate-gray", primary: "bg-slate-700", secondary: "bg-slate-300", description: "Cool slate grays" },
    { name: "Turquoise Sea", value: "turquoise-sea", primary: "bg-cyan-600", secondary: "bg-cyan-200", description: "Vibrant turquoise blues" },
    { name: "Chocolate Brown", value: "chocolate-brown", primary: "bg-amber-800", secondary: "bg-amber-300", description: "Rich chocolate browns" },
    { name: "Electric Blue", value: "electric-blue", primary: "bg-blue-500", secondary: "bg-indigo-200", description: "Vibrant electric blues" },
    { name: "Olive Green", value: "olive-green", primary: "bg-green-600", secondary: "bg-lime-100", description: "Earthy olive greens" },
    { name: "Coral Reef", value: "coral-reef", primary: "bg-rose-500", secondary: "bg-orange-200", description: "Vibrant coral colors" },
  ];

  if (isAuthLoading || isFetchingSettings) { // Show loader if either auth state is loading OR settings data is being fetched
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-6.5rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary"/>
        <p className="mt-2 text-sm text-muted-foreground">Loading settings...</p>
      </div>
    )
  }
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
                  {/* General Settings Content - Name, Language, Persona */}
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
                   {/* Appearance Settings Content - Theme, Color Palette */}
                   <div className="space-y-2"> <h3 className="text-sm font-medium">Theme</h3> <RadioGroup value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")} className="grid grid-cols-3 gap-2"> <Label htmlFor="theme-light" className={`flex flex-col items-center justify-between rounded-md border-2 ${ theme === "light" ? "border-primary" : "border-muted" } bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer`} > <RadioGroupItem value="light" id="theme-light" className="sr-only" /> <Sun className="h-6 w-6 mb-3" /> <span>Light</span> </Label> <Label htmlFor="theme-dark" className={`flex flex-col items-center justify-between rounded-md border-2 ${ theme === "dark" ? "border-primary" : "border-muted" } bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer`} > <RadioGroupItem value="dark" id="theme-dark" className="sr-only" /> <Moon className="h-6 w-6 mb-3" /> <span>Dark</span> </Label> <Label htmlFor="theme-system" className={`flex flex-col items-center justify-between rounded-md border-2 ${ theme === "system" ? "border-primary" : "border-muted" } bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer`} > <RadioGroupItem value="system" id="theme-system" className="sr-only" /> <Laptop className="h-6 w-6 mb-3" /> <span>System</span> </Label> </RadioGroup> </div>
                  <div className="space-y-2"> <h3 className="text-sm font-medium">Color Palettes</h3> <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"> {colorPalettes.map((palette) => ( <Card key={palette.name} className={`cursor-pointer hover:border-primary transition-colors ${ colorPalette === palette.value ? "border-primary border-2" : "border" }`} onClick={() => setColorPalette(palette.value as any)} > <CardContent className="p-3"> <div className="flex flex-col items-center gap-2"> <div className="flex gap-1 mt-2"> <div className={`w-6 h-6 rounded-full ${palette.primary}`} ></div> <div className={`w-6 h-6 rounded-full ${palette.secondary}`} ></div> </div> <span className="text-xs font-medium mt-1"> {palette.name} </span> <span className="text-[10px] text-muted-foreground text-center leading-tight"> {palette.description} </span> </div> </CardContent> </Card> ))} </div> </div>
                </TabsContent>

                <TabsContent value="audio" className="mt-0 space-y-6">
                  {/* Audio Settings Content - Minato's Voice */}
                  <div className="space-y-2">
                    <Label htmlFor="minato-voice-select">Minato's Voice</Label>
                    <p className="text-xs text-muted-foreground">
                      Select the voice used for Minato's spoken responses.
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
                                {voice.name} 
                                <span className="text-muted-foreground/70 ml-2 text-xs">({voice.description})</span>
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     {isSavingVoice && <p className="text-xs text-muted-foreground mt-1 flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1"/>Saving voice...</p>}
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-0 space-y-4">
                  {/* Documents Settings Content */}
                  <Card> <CardHeader className="pb-4"> <CardTitle className="text-lg flex items-center gap-2"> <FileArchive className="h-5 w-5 text-primary" /> Archived Documents </CardTitle> <CardDescription className="text-sm"> Documents you've shared with Minato. These are currently stored locally in your browser for this session. </CardDescription> </CardHeader> <CardContent> {uploadedDocuments.length === 0 ? ( <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg"> <Info className="mx-auto h-10 w-10 text-gray-400" /> <p className="mt-3 text-sm font-medium"> No documents in current session. </p> <p className="mt-1 text-xs"> Attach documents in the chat to see them here. </p> </div> ) : ( <ScrollArea className="max-h-[calc(100vh-22rem)] border rounded-lg"> <ul className="divide-y divide-border"> {uploadedDocuments.map((doc) => { const docUrl = getDocumentUrl(doc.file); return ( <li key={doc.id} className={cn( "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3 hover:bg-muted/50" )} > <div className="flex items-center gap-3 min-w-0 flex-1"> <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" /> <div className="min-w-0"> <p className="text-sm font-medium truncate text-foreground" title={doc.name} > {doc.name} </p> <p className="text-xs text-muted-foreground"> {formatFileSize(doc.size)} - {format(doc.uploadedAt, "PPp")} </p> </div> </div> <div className="flex items-center gap-1 flex-shrink-0"> {docUrl ? ( <TooltipProvider delayDuration={100}> <Tooltip> <TooltipTrigger asChild> <a href={docUrl} download={doc.name} target="_blank" rel="noopener noreferrer" onClick={() => handleLinkClick(docUrl)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7 text-muted-foreground" > <ExternalLink className="h-3.5 w-3.5" /> <span className="sr-only"> View/Download {doc.name} </span> </a> </TooltipTrigger> <TooltipContent> <p>View / Download</p> </TooltipContent> </Tooltip> </TooltipProvider> ) : ( <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" disabled > <ExternalLink className="h-3.5 w-3.5" /> </Button> )} <TooltipProvider delayDuration={100}> <Tooltip> <TooltipTrigger asChild> <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDeleteDocument(doc.id)} > <Trash2 className="h-3.5 w-3.5" /> <span className="sr-only"> Delete {doc.name} </span> </Button> </TooltipTrigger> <TooltipContent> <p>Remove from session</p> </TooltipContent> </Tooltip> </TooltipProvider> </div> </li> ); })} </ul> </ScrollArea> )} </CardContent> </Card>
                </TabsContent>

                <TabsContent value="privacy" className="mt-0 space-y-6">
                  {/* Privacy & Integrations Content */}
                  <div className="rounded-lg border border-border p-4 bg-muted/30"> <p className="text-sm text-foreground/90"> Minato is committed to protecting your privacy. Your data is encrypted and securely stored. We only use your information to provide and improve our services. </p> </div>
                  <div className="space-y-4"> <h3 className="text-sm font-medium">Integrations</h3> <div className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-center justify-between"> <div className="flex items-center gap-2"> <Calendar className="h-5 w-5 text-primary" /> <div> <h4 className="font-medium text-sm"> Google Calendar </h4> <p className="text-xs text-muted-foreground"> Allow Minato to access your calendar events </p> </div> </div> <div className="flex items-center gap-2"> <Switch checked={googleCalendarConnected} onCheckedChange={(checked) => onGoogleToggle("calendar", checked)} id="gcal-switch" disabled={isConnectingGoogle === 'calendar' || isConnectingGoogle === 'both' || isConnectingGoogle === 'disconnect_all' || isConnectingGoogle?.startsWith('disconnect')} /> <Label htmlFor="gcal-switch" className="sr-only"> Toggle Google Calendar </Label> </div> </div>
                    <div className="flex items-center justify-between"> <div className="flex items-center gap-2"> <Mail className="h-5 w-5 text-primary" /> <div> <h4 className="font-medium text-sm"> Google Gmail </h4> <p className="text-xs text-muted-foreground"> Allow Minato to access your emails </p> </div> </div> <div className="flex items-center gap-2"> <Switch checked={googleGmailConnected} onCheckedChange={(checked) => onGoogleToggle("email", checked)} id="gmail-switch" disabled={isConnectingGoogle === 'email' || isConnectingGoogle === 'both' || isConnectingGoogle === 'disconnect_all' || isConnectingGoogle?.startsWith('disconnect')} /> <Label htmlFor="gmail-switch" className="sr-only"> Toggle Google Gmail </Label> </div> </div>
                    { (googleCalendarConnected || googleGmailConnected) && (
                        <Button variant="destructive" size="sm" onClick={() => handleGoogleDisconnect()} disabled={!!isConnectingGoogle?.startsWith('disconnect')} className="w-full mt-2">
                            {isConnectingGoogle?.startsWith('disconnect') ? <Loader2 className="h-4 w-4 animate-spin mr-1.5"/> : ""}
                            Disconnect All Google Services
                        </Button>
                    )}
                    {isConnectingGoogle && !isConnectingGoogle.startsWith('disconnect') && <p className="text-xs text-muted-foreground mt-1 flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1"/>Redirecting to Google...</p>}
                  </div> </div>
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
          systemPrompt: editingPersona.system_prompt,
          isCustom: editingPersona.isCustom,
          // voice_id is part of UIPersona, so it's passed. Ensure Persona type matches
        } as any : undefined} 
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