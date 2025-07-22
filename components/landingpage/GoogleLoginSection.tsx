'use client'

import React from 'react';
// import { BorderBeam } from './magicui/border-beam'; // Assurez-vous que le chemin est correct

// ======================================================================================
// NOUVEAU COMPOSANT: ShapedVideoContainer
// Ce composant remplace l'ancien MaskedVideoShape. Il utilise border-radius pour
// créer une forme asymétrique qui contient parfaitement l'iframe.
// ======================================================================================
const ShapedVideoContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      // Conteneur principal avec la forme personnalisée et le ratio
      className={`relative aspect-video w-full overflow-hidden border-4 border-primary ${className}`}
      style={{
        // Crée une forme asymétrique. Ordre: haut-gauche, haut-droit, bas-droit, bas-gauche
        // N'hésitez pas à jouer avec ces valeurs pour changer la forme !
        borderRadius: '2.5rem 0.75rem 2.5rem 1.5rem', 
      }}
      {...props}
    >
      <iframe
        // L'iframe remplit maintenant parfaitement son parent qui a déjà la bonne forme
        className="absolute inset-0 h-full w-full"
        src="https://www.youtube.com/embed/5ouVWbW7SsM?autoplay=1&mute=1&controls=1&loop=1&playlist=5ouVWbW7SsM"
        title="Vidéo sur la créativité et l'intelligence artificielle"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      ></iframe>
      <iframe className="absolute inset-0 h-full w-full" 
      src="https://www.youtube.com/embed/B_RIxFSVnMU?autoplay=1&mute=1&controls=1&loop=1&si=pxfwd9jtgU3rA4DX" 
      title="Vidéo sur la créativité et l'intelligence artificielle"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen>

      </iframe>
    </div>
  )
);

ShapedVideoContainer.displayName = 'ShapedVideoContainer';

// =========================================================================
// COMPOSANT PRINCIPAL (utilise le nouveau conteneur)
// =========================================================================
const GoogleLoginSection = React.forwardRef<HTMLElement, {}>(
  (props, ref) => {
  return (
    <section id="google-login-section" className="py-16 bg-gradient-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md lg:max-w-4xl">
          {/* On utilise notre nouveau composant ici */}
          <ShapedVideoContainer />
        </div>
      </div>
    </section>
  );
}
);

GoogleLoginSection.displayName = 'GoogleLoginSection';

export default GoogleLoginSection;