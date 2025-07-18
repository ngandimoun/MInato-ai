// FILE: app/subscription/page.tsx
'use client';

import { Metadata } from 'next';
import { SubscriptionManager } from '@/components/subscription/SubscriptionManager';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Gérer les retours de Stripe
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      toast({
        title: "🎉 Bienvenue chez Minato Pro !",
        description: "Votre abonnement a été activé avec succès. Vous avez maintenant accès à toutes les fonctionnalités premium.",
        variant: "default",
      });
    } else if (canceled === 'true') {
      toast({
        title: "Paiement annulé",
        description: "Vous pouvez réessayer à tout moment pour accéder aux fonctionnalités Pro.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestion des Abonnements
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez votre abonnement Minato Pro, consultez vos quotas d'utilisation et vos crédits à usage unique.
          </p>
        </div>

        {/* Subscription Manager */}
        <SubscriptionManager />

        {/* Additional Information */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Comparaison des Plans
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Leads par mois</span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">5</span>
                  <span className="text-sm font-medium text-green-600">50</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Enregistrements par mois</span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">3</span>
                  <span className="text-sm font-medium text-green-600">20</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Images par mois</span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">2</span>
                  <span className="text-sm font-medium text-green-600">30</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Vidéos par mois</span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">1</span>
                  <span className="text-sm font-medium text-green-600">20</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Mode multijoueur</span>
                <div className="flex space-x-4">
                  <span className="text-sm text-red-500">✗</span>
                  <span className="text-sm text-green-600">✓</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Support prioritaire</span>
                <div className="flex space-x-4">
                  <span className="text-sm text-red-500">✗</span>
                  <span className="text-sm text-green-600">✓</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Prix mensuel</span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium text-green-600">Gratuit</span>
                  <span className="text-sm font-medium">$25.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Questions Fréquentes
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Comment fonctionne l'essai gratuit ?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vous bénéficiez d'un essai gratuit de 7 jours avec accès à toutes les fonctionnalités Pro. Aucune carte de crédit requise.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Puis-je annuler à tout moment ?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Oui, vous pouvez annuler votre abonnement à tout moment. Vous conserverez l'accès Pro jusqu'à la fin de la période de facturation.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Que sont les crédits à usage unique ?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Les crédits à usage unique vous permettent d'utiliser des fonctionnalités premium même après avoir dépassé vos quotas mensuels.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Comment sont réinitialisés les quotas ?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Les quotas mensuels sont automatiquement réinitialisés le premier jour de chaque mois.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Besoin d'aide ?
          </h3>
          <p className="text-blue-700 dark:text-blue-300 mb-4">
            Si vous avez des questions sur votre abonnement ou rencontrez des problèmes, notre équipe est là pour vous aider.
          </p>
          <div className="flex space-x-4">
            <a
              href="/support"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Contacter le Support
            </a>
            <a
              href="/docs/subscription"
              className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-md border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 