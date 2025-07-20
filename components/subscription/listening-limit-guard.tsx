import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-provider';
import { useSubscription } from '@/hooks/use-subscription';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ListeningLimitGuardProps {
  children: React.ReactNode;
  onLimitReached?: () => void;
}

export function ListeningLimitGuard({ children, onLimitReached }: ListeningLimitGuardProps) {
  const { user } = useAuth();
  const { subscriptionStatus } = useSubscription();
  const { toast } = useToast();
  const [recordingCount, setRecordingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Récupérer le nombre d'enregistrements de l'utilisateur
  useEffect(() => {
    const fetchRecordingCount = async () => {
      if (!user?.id) return;

      try {
        const { count, error } = await supabase
          .from('recordings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching recording count:', error);
        } else {
          setRecordingCount(count || 0);
        }
      } catch (error) {
        console.error('Error fetching recording count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecordingCount();
  }, [user?.id]);

  // Vérifier si l'utilisateur peut encore enregistrer
  const canRecord = () => {
    if (!subscriptionStatus) return true; // Par défaut, permettre l'enregistrement
    
    // Si l'utilisateur est PRO, pas de limite
    if (subscriptionStatus.is_pro) return true;
    
    // If user is on free trial, limit of 5
    if (subscriptionStatus.is_trial) {
      return recordingCount < 5;
    }
    
    // Si l'utilisateur est expiré, pas d'enregistrement
    return false;
  };

  // Gérer l'enregistrement
  const handleRecording = () => {
    if (!canRecord()) {
      toast({
        title: "Recording limit reached",
        description: "You have reached the limit of 5 recordings for the free trial. Upgrade to Pro plan for unlimited recordings.",
        duration: 10000,
      });
      
      if (onLimitReached) {
        onLimitReached();
      }
      return;
    }

    // Incrémenter le compteur
    setRecordingCount(prev => prev + 1);
  };

  // Afficher le nombre d'enregistrements restants pour les utilisateurs en essai
  const renderRecordingInfo = () => {
    if (!subscriptionStatus?.is_trial) return null;

    const remaining = 5 - recordingCount;
    
    return (
      <div className="text-xs text-muted-foreground mt-2">
        {remaining > 0 ? (
          `${remaining} recording${remaining > 1 ? 's' : ''} remaining`
        ) : (
          "Recording limit reached"
        )}
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {React.cloneElement(children as React.ReactElement, {
        onClick: handleRecording,
        disabled: !canRecord(),
      })}
      {renderRecordingInfo()}
    </div>
  );
} 