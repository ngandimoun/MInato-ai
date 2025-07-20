import React, { useEffect, useRef } from 'react';
import { useSubscription } from '@/hooks/use-subscription';

interface FeatureGuardProps {
  feature: keyof import('@/hooks/use-subscription').FeaturePermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showProToast?: boolean;
}

export function FeatureGuard({ 
  feature, 
  children, 
  fallback = null,
  showProToast = true 
}: FeatureGuardProps) {
  const { permissions, showProFeatureToast } = useSubscription();
  const hasShownToast = useRef(false);

  // Vérifier si l'utilisateur a accès à la fonctionnalité
  const hasAccess = permissions ? permissions[feature] : false;

  // Utiliser useEffect pour éviter les re-renders infinis
  useEffect(() => {
    if (permissions && !hasAccess && showProToast && !hasShownToast.current) {
      showProFeatureToast(feature);
      hasShownToast.current = true;
    }
  }, [permissions, hasAccess, showProToast, showProFeatureToast, feature]);

  // Si les permissions ne sont pas encore chargées, afficher le contenu
  if (!permissions) {
    return <>{children}</>;
  }

  if (!hasAccess) {
    // Retourner le fallback ou rien
    return <>{fallback}</>;
  }

  // Afficher le contenu si l'utilisateur a accès
  return <>{children}</>;
}

// Composant pour les boutons avec protection
interface ProtectedButtonProps {
  feature: keyof import('@/hooks/use-subscription').FeaturePermissions;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ProtectedButton({ 
  feature, 
  children, 
  onClick, 
  disabled = false,
  className = '',
  variant = 'default',
  size = 'default'
}: ProtectedButtonProps) {
  const { permissions, showProFeatureToast } = useSubscription();

  const handleClick = () => {
    if (!permissions) return;

    const hasAccess = permissions[feature];
    
    if (!hasAccess) {
      // Utiliser setTimeout pour éviter les re-renders immédiats
      setTimeout(() => {
        showProFeatureToast(feature);
      }, 0);
      return;
    }

    if (onClick) {
      onClick();
    }
  };

  const isDisabled = disabled || (permissions ? !permissions[feature] : false) || false;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={className}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  );
} 