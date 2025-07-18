// FILE: app/examples/subscription-demo/page.tsx
import React from 'react';
import { ImageGenerationExample } from '@/components/examples/ImageGenerationExample';
import { LeadsGenerationExample } from '@/components/examples/LeadsGenerationExample';
import { MultiplayerExample } from '@/components/examples/MultiplayerExample';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, Zap, Image, Mic } from 'lucide-react';

export default function SubscriptionDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Démonstration du Système d'Abonnement Minato Pro
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Cette page démontre comment le système d'abonnement protège les fonctionnalités 
            selon le plan de l'utilisateur pendant l'essai gratuit de 7 jours.
          </p>
        </div>

        {/* Plan Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">📋 Plan d'Essai Gratuit (7 Jours)</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-green-600 mb-3">✅ Accès Inclus</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  Conversations AI illimitées
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  Mémoire persistante & historique
                </li>
                <li className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-green-500" />
                  Jeux en solo uniquement
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  10 requêtes leads (Creation Hub)
                </li>
                <li className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-green-500" />
                  5 recordings (Listening)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-red-600 mb-3">❌ Accès Bloqué</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-red-500" />
                  Génération d'images (Creation Hub)
                </li>
                <li className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-red-500" />
                  Génération de vidéos (Creation Hub)
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-500" />
                  Mode multijoueur (Games)
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Examples Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Image Generation - Feature Blocked */}
          <div>
            <div className="mb-2">
              <Badge variant="outline" className="text-red-600 border-red-200">
                ❌ Bloqué en Essai Gratuit
              </Badge>
            </div>
            <ImageGenerationExample />
          </div>

          {/* Leads Generation - Quota Limited */}
          <div>
            <div className="mb-2">
              <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                ⚠️ Limité (10 requêtes)
              </Badge>
            </div>
            <LeadsGenerationExample />
          </div>

          {/* Multiplayer - Pro Only */}
          <div>
            <div className="mb-2">
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                👑 Pro Seulement
              </Badge>
            </div>
            <MultiplayerExample />
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">🔧 Comment ça fonctionne</h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-blue-600 mb-2">1. Vérification Backend</h3>
              <p className="text-gray-600">
                Chaque API vérifie automatiquement le plan et les quotas de l'utilisateur 
                avant d'exécuter l'action.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-green-600 mb-2">2. Gestion d'Erreurs</h3>
              <p className="text-gray-600">
                Les erreurs d'abonnement sont capturées et gérées automatiquement 
                par le hook useSubscriptionGuard.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-purple-600 mb-2">3. Modal d'Upgrade</h3>
              <p className="text-gray-600">
                Une modale centrée et non-fermable s'affiche pour inviter 
                l'utilisateur à passer à Pro.
              </p>
            </div>
          </div>
        </div>

        {/* Error Types */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">🚨 Types d'Erreurs Gérées</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-1">feature_blocked</h4>
              <p className="text-red-700">Fonctionnalité complètement bloquée (ex: images/vidéos en essai gratuit)</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-1">quota_exceeded</h4>
              <p className="text-yellow-700">Limite de quota atteinte (ex: 11ème requête leads)</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-800 mb-1">trial_expired</h4>
              <p className="text-orange-700">Essai gratuit de 7 jours expiré</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-1">pro_feature</h4>
              <p className="text-purple-700">Fonctionnalité exclusivement Pro (ex: multijoueur)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 