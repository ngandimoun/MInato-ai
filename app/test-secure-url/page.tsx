'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useReturnUrl } from '@/hooks/use-return-url';
import { toast } from 'sonner';

export default function TestSecureUrlPage() {
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { generateReturnUrlId } = useReturnUrl();

  const testUrls = [
    'http://localhost:3000/games',
    'http://localhost:3000/creation-hub',
    'http://localhost:3000/insights',
    'http://localhost:3000/chat'
  ];

  const handleGenerateUrl = async (testUrl: string) => {
    setIsLoading(true);
    try {
      const result = await generateReturnUrlId(testUrl);
      if (result.success) {
        setGeneratedUrl(result.secureUrl || '');
        toast.success('URL sécurisée générée !', {
          description: `ID: ${result.returnId}, Token: ${result.token?.substring(0, 8)}...`
        });
      } else {
        toast.error('Erreur lors de la génération', {
          description: result.error
        });
      }
    } catch (error) {
      toast.error('Erreur inattendue', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestUrl = () => {
    if (generatedUrl) {
      window.open(generatedUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Test du Système d'URLs Sécurisées
          </h1>

          <div className="space-y-6">
            {/* Test URLs */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                URLs de Test
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testUrls.map((url, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {url}
                    </span>
                    <Button
                      onClick={() => handleGenerateUrl(url)}
                      disabled={isLoading}
                      size="sm"
                    >
                      {isLoading ? 'Génération...' : 'Générer'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Generated URL */}
            {generatedUrl && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  URL Sécurisée Générée
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      ✅ URL Sécurisée
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 font-mono break-all">
                      {generatedUrl}
                    </p>
                  </div>
                  
                  <div className="flex space-x-4">
                    <Button onClick={handleTestUrl} className="bg-blue-500 hover:bg-blue-600">
                      Tester l'URL
                    </Button>
                    <Button 
                      onClick={() => navigator.clipboard.writeText(generatedUrl)}
                      variant="outline"
                    >
                      Copier l'URL
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Comparaison Avant/Après
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">❌ Ancien Système</h3>
                  <p className="text-xs text-red-700 dark:text-red-300 font-mono break-all">
                    /subscription/checkout?return_url=http%3A%2F%2Flocalhost%3A3000%2Fgames
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    • URL encodée suspecte<br/>
                    • Expose l'URL complète<br/>
                    • Pas de validation
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">✅ Nouveau Système</h3>
                  <p className="text-xs text-green-700 dark:text-green-300 font-mono break-all">
                    /subscription/checkout?return_id=ABC123&token=xyz789def456
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    • URL propre et lisible<br/>
                    • Sécurisée avec tokens<br/>
                    • Validation automatique
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                📋 Instructions de Test
              </h3>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Cliquez sur "Générer" pour une URL de test</li>
                <li>Cliquez sur "Tester l'URL" pour ouvrir la page de checkout</li>
                <li>Sur la page de checkout, cliquez sur "Back to Minato"</li>
                <li>Vérifiez que vous êtes redirigé vers la page d'origine</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 