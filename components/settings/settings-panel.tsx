//components/settings/settings-panel.tsx

"use client";

import React, { useState, useCallback, useEffect } from "react"; // useRef enlevé car non utilisé directement
import { motion } from "framer-motion";
import {
  X,
  User,
  Shield,
  Moon,
  Palette,
  Volume2,
  Calendar,
  Mail,
  Laptop,
  Sun,
  FileArchive,
  FileText,
  Trash2,
  ExternalLink,
  Zap,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonaEditorDialog } from "./persona-editor-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useTheme } from "./theme-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  // DialogClose, // DialogClose n'est pas utilisé directement dans UpgradeDialog
} from "@/components/ui/dialog";

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

interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  voice?: string;
  isCustom: boolean;
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

export function SettingsPanel({
  onClose,
  uploadedDocuments,
  onDeleteDocument,
}: SettingsPanelProps) {
  const { theme, colorPalette, setTheme, setColorPalette } = useTheme();
  const [activeTab, setActiveTab] = useState("general");
  const [username, setUsername] = useState("User");
  const [language, setLanguage] = useState("en-US");
  const [selectedPersonaId, setSelectedPersonaId] = useState("default");
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | undefined>(
    undefined
  );
  const [selectedChainedVoice, setSelectedChainedVoice] = useState("alloy");
  const [selectedRealtimeVoice, setSelectedRealtimeVoice] = useState("echo");
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [googleGmailConnected, setGoogleGmailConnected] = useState(false);
  // const [toolUsageConfirmation, setToolUsageConfirmation] = useState(true); // Commenté car non utilisé
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

  // Add loading states
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const colorPalettes: ColorPaletteOption[] = [
    {
      name: "Arctic Dawn",
      value: "arctic-dawn",
      primary: "bg-blue-600",
      secondary: "bg-blue-200",
      description: "Cool blues and greys",
    },
    {
      name: "Sakura Blossom",
      value: "sakura-blossom",
      primary: "bg-pink-400",
      secondary: "bg-pink-100",
      description: "Soft pinks and whites",
    },
    {
      name: "Emerald Forest",
      value: "emerald-forest",
      primary: "bg-green-700",
      secondary: "bg-green-200",
      description: "Deep greens and browns",
    },
    {
      name: "Cyber Neon",
      value: "cyber-neon",
      primary: "bg-purple-600",
      secondary: "bg-cyan-300",
      description: "Vibrant purple and cyan",
    },
    {
      name: "Monochrome Ink",
      value: "monochrome-ink",
      primary: "bg-gray-800",
      secondary: "bg-gray-300",
      description: "Grayscale variants",
    },
    {
      name: "Sunset Gold",
      value: "sunset-gold",
      primary: "bg-amber-500",
      secondary: "bg-amber-200",
      description: "Warm oranges and golds",
    },
    {
      name: "Lavender Mist",
      value: "lavender-mist",
      primary: "bg-purple-400",
      secondary: "bg-purple-100",
      description: "Soft purples and lilacs",
    },
    {
      name: "Ocean Depths",
      value: "ocean-depths",
      primary: "bg-teal-700",
      secondary: "bg-blue-300",
      description: "Deep blues and teals",
    },
    {
      name: "Desert Sand",
      value: "desert-sand",
      primary: "bg-amber-600",
      secondary: "bg-yellow-100",
      description: "Warm neutrals and tans",
    },
    {
      name: "Midnight Galaxy",
      value: "midnight-galaxy",
      primary: "bg-indigo-800",
      secondary: "bg-violet-300",
      description: "Deep purples and blues",
    },
    {
      name: "Autumn Harvest",
      value: "autumn-harvest",
      primary: "bg-red-600",
      secondary: "bg-orange-300",
      description: "Rich reds and oranges",
    },
    {
      name: "Spring Meadow",
      value: "spring-meadow",
      primary: "bg-lime-600",
      secondary: "bg-yellow-300",
      description: "Fresh greens and yellows",
    },
    {
      name: "Royal Purple",
      value: "royal-purple",
      primary: "bg-purple-800",
      secondary: "bg-purple-300",
      description: "Deep royal purples",
    },
    {
      name: "Tropical Paradise",
      value: "tropical-paradise",
      primary: "bg-teal-500",
      secondary: "bg-yellow-200",
      description: "Bright tropical colors",
    },
    {
      name: "Ruby Red",
      value: "ruby-red",
      primary: "bg-red-700",
      secondary: "bg-red-200",
      description: "Rich ruby reds",
    },
    {
      name: "Midnight Blue",
      value: "midnight-blue",
      primary: "bg-blue-900",
      secondary: "bg-blue-300",
      description: "Deep midnight blues",
    },
    {
      name: "Forest Green",
      value: "forest-green",
      primary: "bg-green-800",
      secondary: "bg-green-300",
      description: "Dark forest greens",
    },
    {
      name: "Sunset Orange",
      value: "sunset-orange",
      primary: "bg-orange-600",
      secondary: "bg-orange-200",
      description: "Warm sunset oranges",
    },
    {
      name: "Slate Gray",
      value: "slate-gray",
      primary: "bg-slate-700",
      secondary: "bg-slate-300",
      description: "Cool slate grays",
    },
    {
      name: "Turquoise Sea",
      value: "turquoise-sea",
      primary: "bg-cyan-600",
      secondary: "bg-cyan-200",
      description: "Vibrant turquoise blues",
    },
    {
      name: "Chocolate Brown",
      value: "chocolate-brown",
      primary: "bg-amber-800",
      secondary: "bg-amber-300",
      description: "Rich chocolate browns",
    },
    {
      name: "Electric Blue",
      value: "electric-blue",
      primary: "bg-blue-500",
      secondary: "bg-indigo-200",
      description: "Vibrant electric blues",
    },
    {
      name: "Olive Green",
      value: "olive-green",
      primary: "bg-green-600",
      secondary: "bg-lime-100",
      description: "Earthy olive greens",
    },
    {
      name: "Coral Reef",
      value: "coral-reef",
      primary: "bg-rose-500",
      secondary: "bg-orange-200",
      description: "Vibrant coral colors",
    },
  ];
  const [personas, setPersonas] = useState<Persona[]>([
    {
      id: "default",
      name: "Default",
      description: "Helpful, friendly, and knowledgeable assistant",
      systemPrompt:
        "You are a helpful, friendly, and knowledgeable AI assistant named Minato.",
      isCustom: false,
    },
    {
      id: "professional",
      name: "Professional",
      description: "Formal, precise, and business-oriented",
      systemPrompt:
        "You are a professional AI assistant named Minato. Provide concise, accurate information with a formal tone.",
      isCustom: false,
    },
    {
      id: "creative",
      name: "Creative",
      description: "Imaginative, artistic, and expressive",
      systemPrompt:
        "You are a creative AI assistant named Minato. Think outside the box and provide imaginative responses.",
      isCustom: false,
    },
    {
      id: "custom-1",
      name: "Tech Expert",
      description: "Specialized in technology and programming",
      systemPrompt:
        "You are a technology expert AI assistant named Minato. Provide detailed technical explanations and coding help.",
      voice: "nova",
      isCustom: true,
    },
  ]);

  // Fetch user profile and personas on mount
  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    await Promise.all([fetchProfile(), fetchPersonas()]);
  }

  async function fetchProfile() {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        toast({ title: "Failed to fetch profile", variant: "destructive" });
        console.error("/api/user/profile response not ok", res);
        return;
      }
      const data = await res.json();
      console.log("[DEBUG] /api/user/profile response:", data);
      if (!data?.profile || !data?.state) {
        toast({ title: "Profile data missing", variant: "destructive" });
        return;
      }
      
      // Set state from profile data
      if (data.profile.full_name) setUsername(data.profile.full_name);
      
      // Set state from state data
      if (data.state.preferred_locale) setLanguage(data.state.preferred_locale);
      if (data.state.active_persona_id) setSelectedPersonaId(data.state.active_persona_id);
      if (data.state.chainedvoice) setSelectedChainedVoice(data.state.chainedvoice);
      if (data.state.realtimevoice) setSelectedRealtimeVoice(data.state.realtimevoice);
      
      // Set other states like Google integration if needed
      if (data.state.googlecalendarenabled) setGoogleCalendarConnected(data.state.googlecalendarenabled);
      if (data.state.googleemailenabled) setGoogleGmailConnected(data.state.googleemailenabled);
    } catch (e) {
      toast({ title: "Failed to fetch profile", variant: "destructive" });
      console.error("[DEBUG] fetchProfile error:", e);
    }
  }

  async function fetchPersonas() {
    try {
      const res = await fetch("/api/personas");
      if (!res.ok) {
        toast({ title: "Failed to fetch personas", variant: "destructive" });
        console.error("/api/personas response not ok", res);
        return;
      }
      const data = await res.json();
      console.log("[DEBUG] /api/personas response:", data);
      // Merge predefined and user personas, mapping backend fields to frontend
      const allPersonas = [
        ...(data.predefined || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          systemPrompt: p.system_prompt, // mapping
          voice: p.voice_id,
          isCustom: false,
        })),
        ...(data.user || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          systemPrompt: p.system_prompt, // mapping
          voice: p.voice_id,
          isCustom: true,
        })),
      ];
      if (allPersonas.length === 0) {
        toast({ title: "No personas found", variant: "destructive" });
        console.warn("[DEBUG] Personas array is empty after fetch", data);
      }
      setPersonas(allPersonas);
    } catch (e) {
      toast({ title: "Failed to fetch personas", variant: "destructive" });
      console.error("[DEBUG] fetchPersonas error:", e);
    }
  }

  // Debug function to check auth status
  const checkAuthStatus = async () => {
    setIsCheckingAuth(true);
    try {
      console.log("[DEBUG] Checking authentication status...");
      const res = await fetch("/api/user/profile");
      console.log("[DEBUG] Auth check response status:", res.status);
      
      if (res.status === 401) {
        toast({ 
          title: "You are not logged in", 
          description: "Please log in to save settings", 
          variant: "destructive" 
        });
        return false;
      } else if (!res.ok) {
        const errorData = await res.json();
        console.error("[DEBUG] Auth check error:", errorData);
        toast({ 
          title: "Error checking authentication", 
          description: errorData?.error || "Please try again", 
          variant: "destructive" 
        });
        return false;
      }
      
      const data = await res.json();
      console.log("[DEBUG] Auth check successful, user data:", data);
      return true;
    } catch (e) {
      console.error("[DEBUG] Auth check exception:", e);
      toast({ 
        title: "Error checking authentication", 
        description: "Please check your connection", 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Save name to backend
  const handleSaveName = async () => {
    if (isSavingName) return; // Prevent multiple simultaneous saves
    setIsSavingName(true);
    
    try {
      console.log("[DEBUG] Saving name:", username);
      
      // Check auth first
      if (!await checkAuthStatus()) {
        console.log("[DEBUG] Auth check failed, aborting name save");
        return;
      }
      
      toast({ title: "Saving name...", duration: 2000 });
      
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: username }),
      });
      
      console.log("[DEBUG] Name save response status:", res.status);
      
      if (res.ok) {
        toast({ title: "Name saved!" });
        const data = await res.json();
        console.log("[DEBUG] Name save success response:", data);
        fetchProfile();
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("[DEBUG] Name save error:", res.status, errorData);
        toast({ 
          title: "Failed to save name", 
          description: errorData?.error || `Error (${res.status})`, 
          variant: "destructive" 
        });
      }
    } catch (e) {
      console.error("[DEBUG] Name save exception:", e);
      toast({ 
        title: "Failed to save name", 
        description: "Please check your connection", 
        variant: "destructive" 
      });
    } finally {
      setIsSavingName(false);
    }
  };

  // handleLanguageChange now only updates local state
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };

  const handleSaveLanguage = async () => {
    if (isSavingLanguage) return;
    setIsSavingLanguage(true);
    try {
      console.log("[DEBUG] Saving language:", language);
      if (!(await checkAuthStatus())) return;
      toast({ title: "Saving language...", duration: 2000 });
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred_locale: language,
          active_persona_id: selectedPersonaId,
        }),
      });
      console.log("[DEBUG] Language save response status:", res.status);
      if (res.ok) {
        toast({ title: "Language saved!" });
        await fetchProfile();
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        toast({ title: "Failed to save language", description: errorData?.error || `Error (${res.status})`, variant: "destructive" });
      }
    } catch (e) {
      console.error("[DEBUG] Language save exception:", e);
      toast({ title: "Failed to save language", description: "Please check your connection", variant: "destructive" });
    } finally {
      setIsSavingLanguage(false);
    }
  };

  // handlePersonaChange only updates local state
  const handlePersonaChangeSelect = (pid: string) => {
    setSelectedPersonaId(pid);
  };

  const handleSavePersona = async () => {
    if (isSavingPersona) return;
    setIsSavingPersona(true);
    try {
      console.log("[DEBUG] Saving persona:", selectedPersonaId);
      if (!(await checkAuthStatus())) return;
      toast({ title: "Saving persona...", duration: 2000 });
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active_persona_id: selectedPersonaId,
          preferred_locale: language,
        }),
      });
      console.log("[DEBUG] Persona save response status:", res.status);
      if (res.ok) {
        toast({ title: "Persona saved!" });
        await fetchProfile();
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        toast({ title: "Failed to save persona", description: errorData?.error || `Error (${res.status})`, variant: "destructive" });
      }
    } catch (e) {
      console.error("[DEBUG] Persona save exception:", e);
      toast({ title: "Failed to save persona", description: "Please check your connection", variant: "destructive" });
    } finally {
      setIsSavingPersona(false);
    }
  };

  // Create or edit persona
  const handleSavePersonaDialog = async (personaData: Omit<Persona, "id">) => {
    try {
      let newPersona;
      if (editingPersona) {
        // Edit
        const res = await fetch(`/api/personas/${editingPersona.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: personaData.name,
            description: personaData.description,
            system_prompt: personaData.systemPrompt,
            voice_id: personaData.voice,
          }),
        });
        if (!res.ok) throw new Error("Failed to update persona");
        newPersona = await res.json();
        toast({ title: "Persona updated!" });
      } else {
        // Create
        const res = await fetch("/api/personas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: personaData.name,
            description: personaData.description,
            system_prompt: personaData.systemPrompt,
            voice_id: personaData.voice,
          }),
        });
        if (!res.ok) throw new Error("Failed to create persona");
        newPersona = await res.json();
        toast({ title: "Persona created!" });
      }
      await fetchPersonas();
      setSelectedPersonaId(newPersona.id);
    } catch (e) {
      toast({ title: (editingPersona ? "Failed to update" : "Failed to create") + " persona", variant: "destructive" });
    }
    setEditingPersona(undefined);
    setPersonaEditorOpen(false);
  };

  // Delete persona
  const handleDeletePersona = async (id: string) => {
    try {
      const res = await fetch(`/api/personas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete persona");
      toast({ title: "Persona deleted!" });
      await fetchPersonas();
      if (selectedPersonaId === id) setSelectedPersonaId("default");
    } catch (e) {
      toast({ title: "Failed to delete persona", variant: "destructive" });
    }
  };

  const handleCreatePersona = () => {
    setEditingPersona(undefined);
    setPersonaEditorOpen(true);
  };
  const handleEditPersona = (persona: Persona) => {
    setEditingPersona(persona);
    setPersonaEditorOpen(true);
  };

  const connectGoogleCalendar = async () => {
    setGoogleCalendarConnected(true);
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googlecalendarenabled: true }),
    });
    if (!res.ok) {
      toast({ title: "Failed to connect Google Calendar", variant: "destructive" });
      setGoogleCalendarConnected(false);
    }
  };
  
  const disconnectGoogleCalendar = async () => {
    setGoogleCalendarConnected(false);
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googlecalendarenabled: false }),
    });
    if (!res.ok) {
      toast({ title: "Failed to disconnect Google Calendar", variant: "destructive" });
      setGoogleCalendarConnected(true);
    }
  };
  
  const connectGoogleGmail = async () => {
    setGoogleGmailConnected(true);
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleemailenabled: true }),
    });
    if (!res.ok) {
      toast({ title: "Failed to connect Google Gmail", variant: "destructive" });
      setGoogleGmailConnected(false);
    }
  };
  
  const disconnectGoogleGmail = async () => {
    setGoogleGmailConnected(false);
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleemailenabled: false }),
    });
    if (!res.ok) {
      toast({ title: "Failed to disconnect Google Gmail", variant: "destructive" });
      setGoogleGmailConnected(true);
    }
  };

  const handleDeleteDocument = useCallback(
    (idToDelete: string) => {
      onDeleteDocument(idToDelete);
    },
    [onDeleteDocument]
  );

  const getDocumentUrl = (file: File): string | null => {
    try {
      return URL.createObjectURL(file);
    } catch (error) {
      console.error("Error creating object URL:", error);
      return null;
    }
  };

  const handleLinkClick = (url: string | null) => {
    // Optionnel: URL.revokeObjectURL(url) après un délai si le fichier est très gros et reste en mémoire.
    // Mais attention, si l'utilisateur veut re-cliquer rapidement.
    // Pour cette démo, on ne fait rien de spécial ici.
  };

  // Update appropriate save audio functions to use lowercase column names
  const saveChainedVoice = async (voice: string) => {
    setSelectedChainedVoice(voice);
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chainedvoice: voice }), // changed from chainedVoice
    });
    if (res.ok) {
      toast({ title: "Voice saved!" });
      fetchProfile();
    } else {
      toast({ title: "Failed to save voice", variant: "destructive" });
    }
  };

  const saveRealtimeVoice = async (voice: string) => {
    setSelectedRealtimeVoice(voice);
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ realtimevoice: voice }), // changed from realtimeVoice
    });
    if (res.ok) {
      toast({ title: "Voice saved!" });
      fetchProfile();
    } else {
      toast({ title: "Failed to save voice", variant: "destructive" });
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="bg-background border rounded-2xl border-primary shadow-lg overflow-hidden flex flex-col h-[calc(100vh-6.5rem)]"
      >
        <div className="flex items-center justify-between p-4 border-b border-primary flex-shrink-0">
          <h2 className="text-lg font-semibold">Settings</h2>
          <Button
            onClick={() => setIsUpgradeDialogOpen(true)}
            className="bg-primary text-primary-foreground bg-gradient-to-r from-pink-500 to-emerald-400 text-white"
          >
            <Zap className="mr-2 h-4 w-4" /> Upgrade to Pro
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
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
                  {
                    id: "general",
                    label: "General",
                    icon: <User className="h-4 w-4 mr-2" />,
                  },
                  {
                    id: "appearance",
                    label: "Appearance",
                    icon: <Palette className="h-4 w-4 mr-2" />,
                  },
                  {
                    id: "audio",
                    label: "Audio",
                    icon: <Volume2 className="h-4 w-4 mr-2" />,
                  },
                  {
                    id: "documents",
                    label: "Documents",
                    icon: <FileArchive className="h-4 w-4 mr-2" />,
                  },
                  {
                    id: "privacy",
                    label: "Privacy & Integrations",
                    icon: <Shield className="h-4 w-4 mr-2" />,
                  },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="relative h-14 rounded-none border-b-2 border-transparent px-4 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-shrink-0"
                  >
                    <div className="flex items-center">
                      {tab.icon}
                      <span className="ml-1 hidden md:block">{tab.label}</span>
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
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your name"
                        onKeyDown={(e) => {
                          // Also save when user presses Enter
                          if (e.key === 'Enter') handleSaveName();
                        }}
                      />
                      <Button 
                        variant="outline" 
                        onClick={handleSaveName}
                        disabled={isSavingName}
                        className="bg-primary/10 hover:bg-primary/20 border-primary/20"
                      >
                        {isSavingName ? "Saving..." : "Save"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is how Minato will address you
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">Language</h3>
                      <p className="text-xs text-muted-foreground">Changes save automatically</p>
                    </div>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleSaveLanguage} disabled={isSavingLanguage} className="mt-2 w-full bg-primary/10 hover:bg-primary/20 border-primary/20">
                      {isSavingLanguage ? "Saving..." : "Save Language"}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">AI Persona</h3>
                      <p className="text-xs text-muted-foreground">Changes save automatically</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="persona">Select Persona</Label>
                      <Select
                        value={selectedPersonaId}
                        onValueChange={handlePersonaChangeSelect}
                      >
                        <SelectTrigger id="persona">
                          <SelectValue placeholder="Select persona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="header-standard"
                            disabled
                            className="font-semibold text-muted-foreground text-xs px-2 py-1.5"
                          >
                            Standard
                          </SelectItem>
                          {personas
                            .filter((p) => !p.isCustom)
                            .map((persona) => (
                              <SelectItem key={persona.id} value={persona.id}>
                                {persona.name}
                              </SelectItem>
                            ))}
                          {personas.some((p) => p.isCustom) && (
                            <SelectItem
                              value="header-custom"
                              disabled
                              className="font-semibold text-muted-foreground text-xs px-2 py-1.5 mt-2"
                            >
                              Your Creations
                            </SelectItem>
                          )}
                          {personas
                            .filter((p) => p.isCustom)
                            .map((persona) => (
                              <SelectItem key={persona.id} value={persona.id}>
                                {persona.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleSavePersona} disabled={isSavingPersona} className="mt-2 w-full bg-primary/10 hover:bg-primary/20 border-primary/20">
                        {isSavingPersona ? "Saving..." : "Save Persona"}
                      </Button>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {personas.find((p) => p.id === selectedPersonaId) && (
                        <Card className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {
                                  personas.find(
                                    (p) => p.id === selectedPersonaId
                                  )?.name
                                }
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {
                                  personas.find(
                                    (p) => p.id === selectedPersonaId
                                  )?.description
                                }
                              </p>
                            </div>
                            {personas.find((p) => p.id === selectedPersonaId)
                              ?.isCustom && (
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() =>
                                    handleEditPersona(
                                      personas.find(
                                        (p) => p.id === selectedPersonaId
                                      )!
                                    )
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    handleDeletePersona(selectedPersonaId)
                                  }
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                        </Card>
                      )}
                      <Button
                        onClick={handleCreatePersona}
                        variant="outline"
                        size="sm"
                        className="border border-primary"
                      >
                        Create New Persona
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="appearance" className="mt-0 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Theme</h3>
                    <RadioGroup
                      value={theme}
                      onValueChange={(value) =>
                        setTheme(value as "light" | "dark" | "system")
                      }
                      className="grid grid-cols-3 gap-2"
                    >
                      <Label
                        htmlFor="theme-light"
                        className={`flex flex-col items-center justify-between rounded-md border-2 ${
                          theme === "light" ? "border-primary" : "border-muted"
                        } bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer`}
                      >
                        <RadioGroupItem
                          value="light"
                          id="theme-light"
                          className="sr-only"
                        />
                        <Sun className="h-6 w-6 mb-3" />
                        <span>Light</span>
                      </Label>
                      <Label
                        htmlFor="theme-dark"
                        className={`flex flex-col items-center justify-between rounded-md border-2 ${
                          theme === "dark" ? "border-primary" : "border-muted"
                        } bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer`}
                      >
                        <RadioGroupItem
                          value="dark"
                          id="theme-dark"
                          className="sr-only"
                        />
                        <Moon className="h-6 w-6 mb-3" />
                        <span>Dark</span>
                      </Label>
                      <Label
                        htmlFor="theme-system"
                        className={`flex flex-col items-center justify-between rounded-md border-2 ${
                          theme === "system" ? "border-primary" : "border-muted"
                        } bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer`}
                      >
                        <RadioGroupItem
                          value="system"
                          id="theme-system"
                          className="sr-only"
                        />
                        <Laptop className="h-6 w-6 mb-3" />
                        <span>System</span>
                      </Label>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Color Palettes</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {colorPalettes.map((palette) => (
                        <Card
                          key={palette.name}
                          className={`cursor-pointer hover:border-primary transition-colors ${
                            colorPalette === palette.value
                              ? "border-primary border-2"
                              : "border"
                          }`}
                          onClick={() => setColorPalette(palette.value as any)}
                        >
                          <CardContent className="p-3">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex gap-1 mt-2">
                                <div
                                  className={`w-6 h-6 rounded-full ${palette.primary}`}
                                ></div>
                                <div
                                  className={`w-6 h-6 rounded-full ${palette.secondary}`}
                                ></div>
                              </div>
                              <span className="text-xs font-medium mt-1">
                                {palette.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                                {palette.description}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="audio" className="mt-0 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">
                      Text-to-Speech Voice
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Select the voice used for standard text responses
                    </p>
                    <Select
                      value={selectedChainedVoice}
                      onValueChange={saveChainedVoice}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">Alloy (Balanced)</SelectItem>
                        <SelectItem value="shimmer">
                          Shimmer (Bright)
                        </SelectItem>
                        <SelectItem value="nova">Nova (Warm)</SelectItem>
                        <SelectItem value="echo">Echo (Clear)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Realtime Voice</h3>
                    <p className="text-xs text-muted-foreground">
                      Select the voice used for live conversations
                    </p>
                    <Select
                      value={selectedRealtimeVoice}
                      onValueChange={saveRealtimeVoice}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">Alloy (Balanced)</SelectItem>
                        <SelectItem value="shimmer">
                          Shimmer (Bright)
                        </SelectItem>
                        <SelectItem value="nova">Nova (Warm)</SelectItem>
                        <SelectItem value="echo">Echo (Clear)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">
                        Archived Documents
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Documents sent in your chat messages.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {uploadedDocuments.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">
                          <FileArchive className="mx-auto h-10 w-10 text-gray-400" />
                          <p className="mt-3 text-sm font-medium">
                            No documents archived yet.
                          </p>
                          <p className="mt-1 text-xs">
                            Documents sent in chat will appear here.
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="max-h-[calc(100vh-20rem)] border rounded-lg">
                          {" "}
                          {/* Ajuster max-h au besoin */}
                          <ul className="divide-y">
                            {uploadedDocuments.map((doc) => {
                              const docUrl = getDocumentUrl(doc.file);
                              return (
                                <li
                                  key={doc.id}
                                  className={cn(
                                    "flex flex-wrap items-start justify-between gap-x-4 gap-y-2 p-4 hover:bg-muted/50"
                                  )}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p
                                        className="text-sm font-medium truncate"
                                        title={doc.name}
                                      >
                                        {doc.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatFileSize(doc.size)} - Archived{" "}
                                        {format(doc.uploadedAt, "PPp")}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                                    {docUrl ? (
                                      <TooltipProvider delayDuration={100}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <a
                                              href={docUrl}
                                              download={doc.name}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={() =>
                                                handleLinkClick(docUrl)
                                              }
                                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-muted-foreground"
                                            >
                                              <ExternalLink className="h-4 w-4" />
                                              <span className="sr-only">
                                                View/Download {doc.name}
                                              </span>
                                            </a>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>View / Download</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground"
                                        disabled
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <TooltipProvider delayDuration={100}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                              handleDeleteDocument(doc.id)
                                            }
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">
                                              Delete {doc.name}
                                            </span>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Delete</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="privacy" className="mt-0 space-y-6">
                  <div className="rounded-lg border border-border p-4 bg-muted/30">
                    <p className="text-sm">
                      Minato is committed to protecting your privacy. Your data
                      is encrypted and securely stored. We only use your
                      information to provide and improve our services.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Integrations</h3>
                    <div className="rounded-lg border border-border p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          <div>
                            <h4 className="font-medium text-sm">
                              Google Calendar
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Allow Minato to access your calendar events
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={googleCalendarConnected}
                            onCheckedChange={setGoogleCalendarConnected}
                            id="gcal-switch"
                          />
                          <Label htmlFor="gcal-switch" className="sr-only">
                            Toggle Google Calendar
                          </Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-primary" />
                          <div>
                            <h4 className="font-medium text-sm">
                              Google Gmail
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Allow Minato to access your emails
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={googleGmailConnected}
                            onCheckedChange={setGoogleGmailConnected}
                            id="gmail-switch"
                          />
                          <Label htmlFor="gmail-switch" className="sr-only">
                            Toggle Google Gmail
                          </Label>
                        </div>
                      </div>
                    </div>
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
        initialPersona={editingPersona}
        onSave={handleSavePersonaDialog}
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
  const handleGetStarted = () => {
    console.log("Get Started clicked!");
    onOpenChange(false);
    toast({
      title: "Upgrade Action",
      description: "Redirecting to upgrade page (simulation)...",
    });
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
    hover: { y: -5, transition: { duration: 0.3, ease: "easeInOut" } },
  };

  const listItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1, duration: 0.3 },
    }),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              Unlock Pro Features
            </DialogTitle>
            <DialogDescription className="text-center mt-2 text-muted-foreground/80">
              Supercharge Minato with the Pro plan.
            </DialogDescription>
          </DialogHeader>
          <motion.div
            className="py-6"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
          >
            <Card className="border-primary/20 shadow-xl relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-emerald-400/5 rounded-lg" />
              <CardHeader className="flex flex-row items-center justify-between pb-4 px-6">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                  Pro Plan
                </CardTitle>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold">$19</span>
                  <span className="text-sm font-medium text-muted-foreground/80">
                    /month
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-6">
                <p className="text-sm text-center text-muted-foreground/80 mb-4">
                  Includes everything in Free, plus:
                </p>
                <motion.ul className="space-y-3 text-sm">
                  {[
                    "Advanced AI Models (GPT-4o, etc.)",
                    "Unlimited Memory Storage",
                    "Faster Response Times",
                    "More Custom Personas",
                    "Priority Support",
                  ].map((feature, i) => (
                    <motion.li
                      key={feature}
                      className="flex items-center"
                      variants={listItemVariants}
                      custom={i}
                    >
                      <motion.span className="mr-2" whileHover={{ scale: 1.1 }}>
                        <Check className="h-4 w-4 text-emerald-400" />
                      </motion.span>
                      <span className="text-muted-foreground/90">
                        {feature}
                      </span>
                    </motion.li>
                  ))}
                </motion.ul>
              </CardContent>
              <CardFooter className="px-6">
                <Button
                  className="w-full z-30 bg-gradient-to-r from-primary to-emerald-400 hover:from-primary/90 hover:to-emerald-400/90 text-white font-semibold shadow-lg transition-all duration-300"
                  onClick={handleGetStarted}
                >
                  Get Started with Pro
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
