//hooks/useFileUpload.ts
import { useState, ChangeEvent } from "react";
import { toast } from "sonner";

export function useFileUpload() {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const newImageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (newImageFiles.length === 0) {
      toast.error("Veuillez sélectionner uniquement des fichiers image");
      return;
    }
    
    // Limiter à 5 images au total
    setImageFiles(prev => {
      const combined = [...prev, ...newImageFiles];
      if (combined.length > 5) {
        toast.warning("Vous ne pouvez pas uploader plus de 5 images");
        return combined.slice(0, 5);
      }
      return combined;
    });
    
    // Réinitialiser la valeur de l'input pour permettre la sélection du même fichier à nouveau
    if (event.target) {
      event.target.value = '';
    }
  };
  
  const handleVideoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('video/')) {
      toast.error("Veuillez sélectionner uniquement un fichier vidéo");
      return;
    }
    
    // Vérifier la taille du fichier (70 Mo = 70 * 1024 * 1024 octets)
    const maxSize = 70 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('La taille du fichier vidéo doit être inférieure à 70 Mo');
      return;
    }
    
    setVideoFile(file);
    toast.success("Vidéo ajoutée avec succès");
    
    // Réinitialiser la valeur de l'input pour permettre la sélection du même fichier à nouveau
    if (event.target) {
      event.target.value = '';
    }
  };
  
  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleRemoveVideo = () => {
    setVideoFile(null);
  };
  
  const resetFiles = () => {
    setImageFiles([]);
    setVideoFile(null);
  };

  return {
    imageFiles,
    videoFile,
    handleImageUpload,
    handleVideoUpload,
    handleRemoveImage,
    handleRemoveVideo,
    resetFiles
  };
}
