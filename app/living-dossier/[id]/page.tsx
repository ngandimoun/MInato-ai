'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LivingDossierProvider } from '@/livingdossier/context/LivingDossierContext';
import DossierView from '@/livingdossier/components/living-dossier/DossierView';
import { useAuth } from '@/context/auth-provider';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DossierPage() {
  const { id } = useParams();
  const { session, isLoading } = useAuth();
  const router = useRouter();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/');
    }
  }, [session, isLoading, router]);

  // Show loading state
  if (isLoading || !session) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <LivingDossierProvider>
      <div className="container py-8 px-4">
        <DossierView dossierId={Array.isArray(id) ? id[0] : id as string} />
      </div>
    </LivingDossierProvider>
  );
}
