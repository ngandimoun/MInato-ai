"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";

export default function TestScrollPage() {
  return (
    <main className="flex h-screen flex-col bg-background overflow-hidden">
      <Header currentView="games" onViewChange={() => {}} />
      
      <ScrollArea className="flex-1">
        <div className="container max-w-6xl mx-auto px-4 py-8 pt-20">
          <h1 className="text-3xl font-bold mb-8">Test Scroll avec ScrollArea</h1>
          
          <div className="space-y-6">
            {/* Section avec beaucoup de contenu pour tester le scroll */}
            {Array.from({ length: 20 }, (_, i) => (
              <Card key={i} className="p-6">
                <CardHeader>
                  <CardTitle>Section {i + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    Ceci est un test pour vérifier que le scroll fonctionne correctement avec ScrollArea.
                    Cette section contient du contenu pour forcer le scroll.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }, (_, j) => (
                      <div key={j} className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">Élément {j + 1}</h3>
                        <p className="text-sm text-muted-foreground">
                          Contenu de l'élément {j + 1} dans la section {i + 1}.
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </main>
  );
} 