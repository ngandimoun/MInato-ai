import React from 'react';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

interface ProtectedInputProps {
  feature: keyof import('@/hooks/use-subscription').FeaturePermissions;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showProToast?: boolean;
}

export function ProtectedInput({ 
  feature, 
  children, 
  className = '',
  disabled = false,
  placeholder = '',
  showProToast = true 
}: ProtectedInputProps) {
  const { permissions, showProFeatureToast } = useSubscription();

  // Si les permissions ne sont pas encore chargées, afficher le contenu normalement
  if (!permissions) {
    return <>{children}</>;
  }

  // Vérifier si l'utilisateur a accès à la fonctionnalité
  const hasAccess = permissions[feature];

  if (!hasAccess) {
    // Handler for click events to show toast
    const handleProFeatureClick = () => {
      if (showProToast) {
        showProFeatureToast(feature);
      }
    };
    
    // Retourner un input désactivé avec un placeholder informatif
    return (
      <div className={cn("relative", className)}>
        <input
          type="text"
          disabled={true}
          placeholder="Pro feature required ($25/month) - Click on 'Plan' to upgrade to Pro"
          className={cn(
            "w-full px-3 py-2 border rounded-md",
            "bg-gray-100 text-gray-500 cursor-not-allowed",
            "focus:outline-none focus:ring-0"
          )}
          onClick={handleProFeatureClick}
        />
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handleProFeatureClick}
        >
          <span className="text-xs text-gray-400 bg-white px-2">
            Pro Plan Required
          </span>
        </div>
      </div>
    );
  }

  // Afficher le contenu normal si l'utilisateur a accès
  return <>{children}</>;
}

// Composant pour les textareas protégés
interface ProtectedTextareaProps {
  feature: keyof import('@/hooks/use-subscription').FeaturePermissions;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showProToast?: boolean;
}

export function ProtectedTextarea({ 
  feature, 
  children, 
  className = '',
  disabled = false,
  placeholder = '',
  showProToast = true 
}: ProtectedTextareaProps) {
  const { permissions, showProFeatureToast } = useSubscription();

  // Si les permissions ne sont pas encore chargées, afficher le contenu normalement
  if (!permissions) {
    return <>{children}</>;
  }

  // Vérifier si l'utilisateur a accès à la fonctionnalité
  const hasAccess = permissions[feature];

  if (!hasAccess) {
    // Handler for click events to show toast
    const handleProFeatureClick = () => {
      if (showProToast) {
        showProFeatureToast(feature);
      }
    };
    
    // Retourner un textarea désactivé avec un placeholder informatif
    return (
      <div className={cn("relative", className)}>
        <textarea
          disabled={true}
          placeholder="Pro feature required ($25/month) - Click on 'Plan' to upgrade to Pro"
          className={cn(
            "w-full px-3 py-2 border rounded-md resize-none",
            "bg-gray-100 text-gray-500 cursor-not-allowed",
            "focus:outline-none focus:ring-0"
          )}
          rows={4}
          onClick={handleProFeatureClick}
        />
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handleProFeatureClick}
        >
          <span className="text-xs text-gray-400 bg-white px-2">
            Pro Plan Required
          </span>
        </div>
      </div>
    );
  }

  // Afficher le contenu normal si l'utilisateur a accès
  return <>{children}</>;
} 