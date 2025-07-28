//components/landingpage/StatsSection.tsx
// Ajout de "use client" pour pouvoir utiliser les hooks de React (useState)
"use client";

// Ajout de useState pour gérer l'état de la modale (lightbox)
import { useState } from "react";
import InteractiveBentoGallery from "./blocks/interactive-bento-gallery" // Gardé comme dans votre code
import { AnimatePresence, motion } from "motion/react"; // motion/react pour la modale
import { useRouter } from "next/navigation"; // Import du router pour la navigation

/* eslint-disable @next/next/no-img-element */
import { BlurFade } from "@/components/magicui/blur-fade";
import { Button } from "../ui/button";

// Remplacez cette liste par les liens vers vos propres médias.
// Assurez-vous d'avoir des fichiers vidéo (ex: .mp4) dans votre dossier /public
const media = [
  "/1.png",
  "/2.png",
  "/blanck.mp4", // Exemple de vidéo
  "/3.png",
  "/4.png",
  "/5.png",
  "/6.png",
  "/luxe.mp4", // Exemple de vidéo
  "/7.png",
  "/8.png",
  "/9.png",
  "/analytic.mp4",
  "/10.png",
  "/11.png",
  "/12.png",
  "/13.png",
  "/14.png",
  "/Friends.mp4",
  "/hero-visual.jpg",
  "/15.png",
];

// === NOUVELLE FONCTION UTILITAIRE ===
// Détermine si une URL correspond à une vidéo en se basant sur son extension.
const getMediaType = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.ogg'];
  const extension = url.substring(url.lastIndexOf('.')).toLowerCase();
  return videoExtensions.includes(extension) ? 'video' : 'image';
};


export default function StatsSection() {
  const title = "Minato Gallery"
  const description = "Explore a collection of unique artworks, brought to life by your imagination and guided by Minato AI.";
  const router = useRouter(); // Hook pour la navigation

  // === NOUVEL ÉTAT POUR LA MODALE ===
  // `selectedMedia` stockera l'URL du média à afficher en plein écran.
  // `null` signifie qu'aucune modale n'est affichée.
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  // === FONCTION POUR NAVIGUER VERS L'INTERFACE MINATO GALLERY ===
  const handleViewMore = () => {
    router.push('/minato-gallery'); // Navigation vers la page dédiée
  };

  return (
    <> {/* Fragment (INCHANGÉ) */}
      <section id="photos" className="w-full py-12 md:py-20">
        <div className="container mx-auto max-w-5xl px-4">

          {/* Texte de présentation (INCHANGÉ) */}
          <div className="mb-12 text-center">
            <BlurFade delay={0.25} inView>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {title}
              </h2>
            </BlurFade>
            <BlurFade delay={0.35} inView>
              <p className="mx-auto mt-4 max-w-[700px] text-gray-500  text-sm/relaxed dark:text-gray-400">
                {description}
              </p>
            </BlurFade>
          </div>

          {/* Grille de médias (INCHANGÉE) */}
          <div className="columns-2 gap-4 sm:columns-3">
            {media.map((mediaUrl, idx) => {
              const mediaType = getMediaType(mediaUrl);
              return (
                <BlurFade key={mediaUrl} delay={0.25 + idx * 0.05} inView>
                  <div
                    className="mb-4 break-inside-avoid cursor-pointer"
                    onClick={() => setSelectedMedia(mediaUrl)}
                  >
                    {mediaType === 'image' ? (
                      <img
                        className="w-full h-auto rounded-lg object-cover"
                        src={mediaUrl}
                        alt={`Gallery image ${idx + 1}`}
                      />
                    ) : (
                      <video
                        className="w-full h-auto rounded-lg object-cover"
                        src={mediaUrl}
                        muted loop autoPlay playsInline
                      />
                    )}
                  </div>
                </BlurFade>
              );
            })}
          </div>

          {/* === NOUVEAU BOUTON "VIEW MORE" === */}
          <div className="mt-8 text-center">
            <BlurFade delay={0.45} inView>
              <Button
                onClick={handleViewMore}
                variant='outline'
                size='sm'
                className="inline-flex items-center gap-2 px-6 py-3 font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-xl transform hover:scale-105"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View More
              </Button>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* === MODIFICATION ICI : LA MODALE PLEIN ÉCRAN CORRIGÉE === */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMedia(null)}
            // On ajoute un peu de padding pour que le média ne touche jamais les bords de l'écran
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            {/* 
              Ce conteneur "relative" est juste là pour positionner le bouton "fermer"
              et pour empêcher la fermeture de la modale si on clique sur l'image/vidéo.
              Il n'a plus de taille fixe, il s'adapte à son contenu.
            */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative"
            >
              {/* Le média lui-même. C'est ici que la magie opère. */}
              {getMediaType(selectedMedia) === 'image' ? (
                <img
                  src={selectedMedia}
                  alt="Fullscreen view"
                  // === CHANGEMENT CLÉ ===
                  // max-w-[90vw] -> largeur maximale = 90% de la largeur de la fenêtre
                  // max-h-[90vh] -> hauteur maximale = 90% de la hauteur de la fenêtre
                  // Le navigateur appliquera la contrainte la plus forte tout en conservant les proportions.
                  // C'est exactement le comportement souhaité pour une lightbox.
                  className="block rounded-lg max-w-[90vw] max-h-[90vh]"
                />
              ) : (
                                  <video
                    src={selectedMedia}
                    // On applique les mêmes contraintes à la vidéo
                    className="block rounded-lg max-w-[90vw] max-h-[90vh]"
                    controls
                    autoPlay
                    loop
                  />
              )}
              <button
                onClick={() => setSelectedMedia(null)}
                // Positionnement du bouton légèrement ajusté pour être plus esthétique
                className="absolute -top-2 -right-2 bg-white text-black rounded-full h-8 w-8 flex items-center justify-center text-lg font-bold shadow-lg"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}