//components/settings/persona-editor-dialog.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

interface Persona {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  isCustom: boolean;
}

interface PersonaEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPersona?: Persona;
  onSave: (persona: Omit<Persona, "id">) => void;
}

// Predefined character suggestions
const characterSuggestions = [
  "Supportive Friend 🤗",
  "Encouraging Boyfriend 💕",
  "Lovely Girlfriend 💖",
  "My Sidechick 😏",
  "Sarcastic Sidekick 😏",
  "Business Companion 💼",
  "Entrepreneur Buddy 📈",
  "Wise Mentor 🦉",
  "Playful Companion 🎮",
  "Efficient Assistant 🚀",
  "Minato Namikaze ⚡",
];

// Mood options
const moodOptions = [
  { emoji: "😂", label: "Playful" },
  { emoji: "🤩", label: "Enthusiastic" },
  { emoji: "🙂", label: "Balanced" },
  { emoji: "❤️", label: "Affectionate" },
  { emoji: "💪", label: "Motivational" },
  { emoji: "🤔", label: "Thoughtful" },
  { emoji: "😌", label: "Calming" },
  { emoji: "🔥", label: "Roast Master" },
  { emoji: "😏", label: "Sarcastic" },
  { emoji: "😔", label: "Melancholic" },
  { emoji: "🧐", label: "Analytical" },
  { emoji: "😠", label: "Grumpy" },
  { emoji: "🥰", label: "Loving" },
  { emoji: "😤", label: "Passionate" },
];

// Communication style options
const communicationOptions = [
  { emoji: "💬", label: "Quickfire Texts" },
  { emoji: "🗣️", label: "Casual Chat" },
  { emoji: "📜", label: "Detailed Explanations" },
  { emoji: "🎤", label: "Storyteller Mode" },
  { emoji: "❓", label: "Always Asking Questions" },
  { emoji: "💕", label: "Sweet Compliments" },
  { emoji: "💯", label: "Straight Facts" },
  { emoji: "📊", label: "Data-Driven" },
  { emoji: "🧠", label: "Deep Thinker" },
  { emoji: "🎵", label: "Song Lyrics Only" },
  { emoji: "🤫", label: "Secretive Whispers" },
  { emoji: "💼", label: "Professional Speak" },
];

// Vibe options
const vibeOptions = [
  { emoji: "👕", label: "Super Casual" },
  { emoji: "😎", label: "Cool & Trendy" },
  { emoji: "✅", label: "Friendly & Clear" },
  { emoji: "💡", label: "Creative & Quirky" },
  { emoji: "💖", label: "Romantic & Sweet" },
  { emoji: "🤝", label: "Supportive Partner" },
  { emoji: "💼", label: "Business Professional" },
  { emoji: "🔮", label: "Mystical Advisor" },
  { emoji: "🎓", label: "Academic Mentor" },
  { emoji: "🏋️", label: "Fitness Coach" },
  { emoji: "🎩", label: "Professional & Polished" },
  { emoji: "👑", label: "Regal & Formal" },
  { emoji: "🦊", label: "Flirty & Playful" },
];

// Special skills options
const specialSkillsOptions = [
  { id: "memes", label: "Meme Expert" },
  { id: "history", label: "History Buff" },
  { id: "relationships", label: "Relationship Advice Guru" },
  { id: "business", label: "Business Strategy Coach" },
  { id: "motivation", label: "Motivational Speaker" },
  { id: "love", label: "Romance Expert" },
  { id: "fitness", label: "Fitness & Wellness Coach" },
  { id: "sarcasm", label: "Fluent in Sarcasm" },
  { id: "tech", label: "Tech Wizard" },
  { id: "poetry", label: "Poetry Master" },
  { id: "anime", label: "Anime Knowledge" },
  { id: "naruto", label: "Naruto Universe Expert" },
  { id: "flirting", label: "Master Flirter" },
  { id: "entrepreneur", label: "Startup Mindset" },
  { id: "therapy", label: "Therapy-Like Support" },
];

export function PersonaEditorDialog({
  open,
  onOpenChange,
  initialPersona,
  onSave,
}: PersonaEditorDialogProps) {
  // Core character state
  const [coreCharacter, setCoreCharacter] = useState(
    initialPersona?.name || ""
  );
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedCommunication, setSelectedCommunication] = useState<
    string | null
  >(null);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  // Magic spice state
  const [magicSpiceOpen, setMagicSpiceOpen] = useState(false);
  const [catchphrase, setCatchphrase] = useState("");
  const [avoidance, setAvoidance] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [quirk, setQuirk] = useState("");
  const [voiceStyle, setVoiceStyle] = useState("");
  const [insideJokes, setInsideJokes] = useState("");
  const [languagePreference, setLanguagePreference] = useState("");
  const [relationshipDynamic, setRelationshipDynamic] = useState("");
  const [personalizedKnowledge, setPersonalizedKnowledge] = useState("");

  // Advanced mode state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [titleClickCount, setTitleClickCount] = useState(0);
  const [system_prompt, setSystem_prompt] = useState(
    initialPersona?.system_prompt ||
      "You are a helpful, friendly, and knowledgeable AI assistant named Minato."
  );

  // Animation state
  const [showSparkles, setShowSparkles] = useState(false);

  // Handle title clicks for easter egg
  const handleTitleClick = () => {
    setTitleClickCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        setShowAdvanced(true);
        return 0;
      }
      return newCount;
    });
  };

  // Toggle skill selection
  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  // Show sparkle animation
  const triggerSparkles = () => {
    setShowSparkles(true);
    setTimeout(() => setShowSparkles(false), 1500);
  };

  // Update system prompt based on selections
  useEffect(() => {
    if (!coreCharacter) return;

    let newPrompt = `You are ${coreCharacter}, an AI assistant named Minato.`;

    // Add mood
    if (selectedMood) {
      const mood = moodOptions.find((m) => m.label === selectedMood);
      if (mood) {
        newPrompt += ` You have a ${mood.label.toLowerCase()} mood and demeanor.`;
      }
    }

    // Add communication style
    if (selectedCommunication) {
      const style = communicationOptions.find(
        (c) => c.label === selectedCommunication
      );
      if (style) {
        newPrompt += ` You communicate with ${style.label.toLowerCase()}.`;
      }
    }

    // Add vibe
    if (selectedVibe) {
      const vibe = vibeOptions.find((v) => v.label === selectedVibe);
      if (vibe) {
        newPrompt += ` Your overall vibe is ${vibe.label.toLowerCase()}.`;
      }
    }
    
    // Add relationship dynamic
    if (relationshipDynamic) {
      newPrompt += ` Our relationship dynamic is that ${relationshipDynamic}.`;
    }
    
    // Add voice style
    if (voiceStyle) {
      newPrompt += ` Your voice sounds ${voiceStyle}.`;
    }
    
    // Add language preferences
    if (languagePreference) {
      newPrompt += ` When speaking, you ${languagePreference}.`;
    }

    // Add skills
    if (selectedSkills.length > 0) {
      newPrompt += " You have expertise in: ";
      selectedSkills.forEach((skillId, index) => {
        const skill = specialSkillsOptions.find((s) => s.id === skillId);
        if (skill) {
          newPrompt += skill.label;
          if (index < selectedSkills.length - 1) {
            newPrompt += ", ";
          }
        }
      });
      newPrompt += ".";
    }

    // Add inside jokes
    if (insideJokes) {
      newPrompt += ` We have inside jokes about ${insideJokes}, which you can reference occasionally.`;
    }

    // Add catchphrase
    if (catchphrase) {
      newPrompt += ` You occasionally say "${catchphrase}".`;
    }

    // Add avoidance
    if (avoidance) {
      newPrompt += ` You avoid ${avoidance}.`;
    }

    // Add quirk
    if (quirk) {
      newPrompt += ` You have a quirk where you ${quirk}.`;
    }
    
    // Add personalized knowledge
    if (personalizedKnowledge) {
      newPrompt += ` Important information about me: ${personalizedKnowledge}`;
    }

    // Only update if not in advanced mode or if it's the initial setup
    if (!showAdvanced || !initialPersona) {
      setSystem_prompt(newPrompt);
    }
  }, [
    coreCharacter,
    selectedMood,
    selectedCommunication,
    selectedVibe,
    selectedSkills,
    catchphrase,
    avoidance,
    quirk,
    voiceStyle,
    insideJokes,
    languagePreference,
    relationshipDynamic,
    personalizedKnowledge,
    showAdvanced,
    initialPersona,
  ]);

  // Handle character suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setCoreCharacter(suggestion);
    triggerSparkles();
  };

  // Handle save
  const handleSave = () => {
    // Create a concise but informative description of the persona
    let description = "";
    
    if (selectedMood) {
      description += `${selectedMood} `;
    }
    
    if (selectedCommunication) {
      description += `${selectedCommunication} `;
    }
    
    if (selectedVibe) {
      description += `${selectedVibe} `;
    }
    
    // Add key relationship information if available
    if (relationshipDynamic) {
      description += `| ${relationshipDynamic} `;
    }
    
    // Add skills summary if available
    if (selectedSkills.length > 0) {
      description += "| Expert in: ";
      selectedSkills.slice(0, 2).forEach((skillId, index) => {
        const skill = specialSkillsOptions.find((s) => s.id === skillId);
        if (skill) {
          description += skill.label;
          if (index < Math.min(selectedSkills.length, 2) - 1) {
            description += ", ";
          }
        }
      });
      
      if (selectedSkills.length > 2) {
        description += ` +${selectedSkills.length - 2} more`;
      }
    }
    
    // Trim and clean up description
    description = description.trim();
    
    onSave({
      name: coreCharacter,
      description: description,
      system_prompt: system_prompt,
      isCustom: true,
    });
    onOpenChange(false);
  };

  const isValid = coreCharacter.trim() !== "" && system_prompt.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-center text-xl relative cursor-pointer"
            onClick={handleTitleClick}
          >
            Unleash Minato's True Character
            {showSparkles && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
              >
                <div className="absolute -top-2 -left-2">✨</div>
                <div className="absolute -top-2 -right-2">✨</div>
                <div className="absolute -bottom-2 -left-2">✨</div>
                <div className="absolute -bottom-2 -right-2">✨</div>
              </motion.div>
            )}
          </DialogTitle>
          <DialogDescription className="text-center">
            Define who Minato is and how they'll interact with you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* The Spark: Core Character Definition */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              How should Minato act? Be specific!
            </Label>
            <Input
              placeholder="e.g., Gojo Satoru, my supportive coach, a sarcastic cat..."
              value={coreCharacter}
              onChange={(e) => setCoreCharacter(e.target.value)}
              className="text-base"
            />

            <div className="flex flex-wrap gap-2 mt-2">
              {characterSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant={coreCharacter === suggestion ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="rounded-full text-sm"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          {/* Add Flavor: Personality Nuances */}
          <div className="space-y-5 pt-2">
            <h3 className="text-base font-medium">
              Now, add some unique flavor...
            </h3>

            {/* Mood & Attitude */}
            <div className="space-y-2">
              <Label className="text-sm">Current Mood:</Label>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map((mood) => (
                  <Button
                    key={mood.label}
                    variant={
                      selectedMood === mood.label ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setSelectedMood(
                        selectedMood === mood.label ? null : mood.label
                      );
                      triggerSparkles();
                    }}
                    className="rounded-full"
                  >
                    <span className="mr-1">{mood.emoji}</span> {mood.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Communication Style */}
            <div className="space-y-2">
              <Label className="text-sm">Talks Like:</Label>
              <div className="flex flex-wrap gap-2">
                {communicationOptions.map((style) => (
                  <Button
                    key={style.label}
                    variant={
                      selectedCommunication === style.label
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setSelectedCommunication(
                        selectedCommunication === style.label
                          ? null
                          : style.label
                      );
                      triggerSparkles();
                    }}
                    className="rounded-full"
                  >
                    <span className="mr-1">{style.emoji}</span> {style.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Overall Vibe */}
            <div className="space-y-2">
              <Label className="text-sm">General Vibe:</Label>
              <div className="flex flex-wrap gap-2">
                {vibeOptions.map((vibe) => (
                  <Button
                    key={vibe.label}
                    variant={
                      selectedVibe === vibe.label ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setSelectedVibe(
                        selectedVibe === vibe.label ? null : vibe.label
                      );
                      triggerSparkles();
                    }}
                    className="rounded-full"
                  >
                    <span className="mr-1">{vibe.emoji}</span> {vibe.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Magic Spice Button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              className={cn(
                "rounded-full border-0 hover:opacity-90 relative overflow-hidden",
                magicSpiceOpen
                  ? "bg-primary text-primary-foreground"
                  : "bg-gradient-to-r from-pink-500 to-emerald-400 text-white"
              )}
              onClick={() => setMagicSpiceOpen(!magicSpiceOpen)}
            >
              {magicSpiceOpen ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Close Magic Spice
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Add Magic Spice ✨
                </>
              )}
            </Button>
          </div>

          {/* Magic Spice Options */}
          <AnimatePresence>
            {magicSpiceOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden bg-muted/30 p-4 rounded-lg"
              >
                {/* Catchphrases */}
                <div className="space-y-2">
                  <Label className="text-sm">💬 Teach a Catchphrase:</Label>
                  <Input
                    placeholder="When I succeed, say..."
                    value={catchphrase}
                    onChange={(e) => setCatchphrase(e.target.value)}
                  />
                </div>

                {/* Voice Style */}
                <div className="space-y-2">
                  <Label className="text-sm">🗣️ Voice Style:</Label>
                  <Input
                    placeholder="e.g., deep and calm, high-pitched anime voice, seductive whisper..."
                    value={voiceStyle}
                    onChange={(e) => setVoiceStyle(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Describes how Minato's voice would sound if spoken aloud
                  </p>
                </div>

                {/* Inside Jokes */}
                <div className="space-y-2">
                  <Label className="text-sm">😂 Our Inside Jokes:</Label>
                  <Input
                    placeholder="e.g., We always joke about..."
                    value={insideJokes}
                    onChange={(e) => setInsideJokes(e.target.value)}
                  />
                </div>

                {/* Language Preferences */}
                <div className="space-y-2">
                  <Label className="text-sm">🌐 Language Preferences:</Label>
                  <Input
                    placeholder="e.g., occasional French phrases, speak like a pirate..."
                    value={languagePreference}
                    onChange={(e) => setLanguagePreference(e.target.value)}
                  />
                </div>

                {/* Relationship Dynamic */}
                <div className="space-y-2">
                  <Label className="text-sm">👫 Relationship Dynamic:</Label>
                  <Input
                    placeholder="e.g., we're old friends, secret lovers, mentor/student..."
                    value={relationshipDynamic}
                    onChange={(e) => setRelationshipDynamic(e.target.value)}
                  />
                </div>

                {/* Things to Avoid */}
                <div className="space-y-2">
                  <Label className="text-sm">🚫 Things to NEVER Do/Say:</Label>
                  <Input
                    placeholder="e.g., corporate jargon, technical terms..."
                    value={avoidance}
                    onChange={(e) => setAvoidance(e.target.value)}
                  />
                </div>

                {/* Special Skills */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    🌟 Special Skills/Knowledge:
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {specialSkillsOptions.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`skill-${skill.id}`}
                          checked={selectedSkills.includes(skill.id)}
                          onCheckedChange={() => toggleSkill(skill.id)}
                        />
                        <label
                          htmlFor={`skill-${skill.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {skill.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quirks & Habits */}
                <div className="space-y-2">
                  <Label className="text-sm">🤪 Quirks & Habits:</Label>
                  <Input
                    placeholder="e.g., ends sentences with 'nya', quotes movies..."
                    value={quirk}
                    onChange={(e) => setQuirk(e.target.value)}
                  />
                </div>

                {/* Personalized Knowledge */}
                <div className="space-y-2">
                  <Label className="text-sm">📚 Personalized Knowledge:</Label>
                  <Textarea
                    placeholder="Key facts Minato should know about you or your interests..."
                    value={personalizedKnowledge}
                    onChange={(e) => setPersonalizedKnowledge(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps Minato reference specific details about your life or interests
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Deep End (Easter Egg) */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex items-center">
                  <Label className="text-sm flex items-center text-primary">
                    ✍️ Minato's Deepest Secrets (Advanced)
                  </Label>
                  <div className="ml-auto text-xs text-muted-foreground">
                    {system_prompt.length} characters
                  </div>
                </div>
                <Textarea
                  value={system_prompt}
                  onChange={(e) => setSystem_prompt(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                  placeholder="Add any final, crucial details about Minato's personality, memories, or how they should always behave."
                />
                <p className="text-xs text-muted-foreground">
                  This overrides other settings if conflicting. Safety
                  guardrails will be automatically applied.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid} className="relative">
            {showSparkles && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="absolute -top-1 -right-1">✨</span>
                <span className="absolute -bottom-1 -left-1">✨</span>
              </span>
            )}
            {initialPersona ? "Save Changes" : "Create Persona"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
