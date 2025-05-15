// components/chat/audio-player.tsx

"use client";

import { useState, useRef, useEffect, useCallback } from "react"; // Ajout useCallback
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Button } from "../ui/button"; // Assurez-vous que Button est importé

interface AudioPlayerProps {
  isUser: boolean;
  audioUrl?: string;
}

// Fonction utilitaire partagée
const formatTime = (time: number): string => {
  if (isNaN(time) || time < 0) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function AudioPlayer({ isUser, audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false); // État pour savoir si l'audio est prêt
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Gestionnaire pour quand l'audio peut être joué et les métadonnées sont chargées
  const handleCanPlay = useCallback(() => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      if (!isNaN(audioDuration) && isFinite(audioDuration)) {
        setDuration(audioDuration);
        setIsReady(true);
      } else {
        // Gérer le cas où la durée n'est pas immédiatement disponible
        console.warn("Audio duration not available yet.");
        // On peut essayer de mettre isReady à true quand même si la lecture est possible
        if (audioRef.current.readyState >= 2) {
          // HAVE_CURRENT_DATA
          setIsReady(true);
        }
      }
    }
  }, []); // Pas de dépendances spécifiques

  // Gestionnaire pour la mise à jour du temps pendant la lecture
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []); // Pas de dépendances spécifiques

  // Gestionnaire pour la fin de la lecture
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0); // Revenir au début à la fin
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Assurer la réinitialisation
    }
  }, []); // Pas de dépendances spécifiques

  // Effet pour configurer l'élément audio
  useEffect(() => {
    if (!audioUrl) {
      setIsReady(false);
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.preload = "metadata"; // Important pour obtenir la durée rapidement

    // Ajouter les écouteurs d'événements
    audio.addEventListener("loadedmetadata", handleCanPlay); // Tenter de charger la durée ici
    audio.addEventListener("canplay", handleCanPlay); // Confirmer la possibilité de lecture
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", (e) => {
      console.error("Error loading or playing audio:", e);
      setIsReady(false); // Marquer comme non prêt en cas d'erreur
    });

    // Nettoyer les écouteurs lors du démontage ou du changement d'URL
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleCanPlay);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", () => {}); // Nettoyer l'écouteur d'erreur aussi
      audioRef.current = null; // Supprimer la référence
    };
    // Dépendances : recréer l'audio si l'URL change ou si les handlers changent
  }, [audioUrl, handleCanPlay, handleTimeUpdate, handleEnded]);

  // Toggle Play/Pause
  const togglePlayPause = useCallback(() => {
    if (audioRef.current && isReady) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current
          .play()
          .catch((error) => console.error("Error playing audio:", error));
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, isReady]);

  // Gestionnaire de changement du Slider
  const handleSliderChange = useCallback(
    (value: number[]) => {
      if (audioRef.current && isReady) {
        const newTime = value[0];
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime); // Mettre à jour l'état immédiatement pour la réactivité du slider
      }
    },
    [isReady]
  );

  return (
    <div
      className={cn(
        "flex items-center gap-3 w-full",
        isUser ? "text-primary-foreground" : "text-foreground"
      )}
    >
      <Button
        type="button" // Ajout type pour clarté
        onClick={togglePlayPause}
        disabled={!isReady}
        size="icon" // Utiliser size="icon" pour un bouton carré
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          isUser
            ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
            : "bg-primary/10 text-primary hover:bg-primary/20",
          !isReady && "opacity-50 cursor-not-allowed"
        )}
        aria-label={isPlaying ? "Pause audio" : "Play audio"} // Pour l'accessibilité
      >
        <AnimatedPlayPauseIcon isPlaying={isPlaying} />
      </Button>

      {/* Slider et Temps */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {" "}
        {/* min-w-0 */}
        <Slider
          value={[currentTime]}
          max={duration > 0 ? duration : 1} // Éviter max=0
          step={0.1}
          disabled={!isReady}
          onValueChange={handleSliderChange} // Utiliser onValueChange
          className={cn(
            "h-1.5 data-[disabled=true]:opacity-50", // Style pour désactivé
            isUser
              ? "[&>span:first-child>span]:bg-primary-foreground [&_[role=slider]]:bg-primary-foreground/80 [&_[role=slider]]:border-primary-foreground/50" // Cibler le track et le thumb pour user
              : "[&>span:first-child>span]:bg-primary [&_[role=slider]]:bg-primary/80 [&_[role=slider]]:border-primary/50" // Cibler le track et le thumb pour assistant
            // Appliquer les styles spécifiques au slider de shadcn/ui si nécessaire pour le track rempli
          )}
          aria-label="Audio progress"
        />
        <div className="flex justify-between text-xs opacity-80">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span> {/* Afficher la durée totale */}
        </div>
      </div>
      {/* L'élément audio est géré dans useEffect, pas besoin de le rendre ici */}
    </div>
  );
}

// AnimatedPlayPauseIcon (inchangé)
function AnimatedPlayPauseIcon({ isPlaying }: { isPlaying: boolean }) {
  /* ... (code inchangé) ... */ return (
    <div className="relative w-4 h-4">
      {" "}
      <motion.div
        initial={false}
        animate={{ opacity: isPlaying ? 0 : 1, scale: isPlaying ? 0.8 : 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {" "}
        <Play size={16} className="ml-0.5" />{" "}
      </motion.div>{" "}
      <motion.div
        initial={false}
        animate={{ opacity: isPlaying ? 1 : 0, scale: isPlaying ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {" "}
        <Pause size={16} />{" "}
      </motion.div>{" "}
    </div>
  );
}
