"use client";

import MinatoGallery from "@/components/landingpage/MinatoGallery";
import { useRouter } from "next/navigation";

export default function MinatoGalleryPage() {
  const router = useRouter();

  const handleGoBack = () => {
    router.back(); // Retour à la page précédente
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 relative">
      {/* Bouton retour fixe */}
      <button
        onClick={handleGoBack}
        className="fixed top-6 left-6 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        aria-label="Retour"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </button>

      <MinatoGallery />
    </div>
  );
} 