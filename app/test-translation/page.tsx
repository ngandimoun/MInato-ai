"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TestTranslationPage() {
  const [text, setText] = useState('Hello, welcome to the game library!');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testTranslation = async () => {
    setIsLoading(true);
    try {
      console.log('Testing translation...');
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLanguage,
          sourceLanguage: 'en',
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Translation result:', data);
      setResult(data.translatedText || 'No translation received');
    } catch (error) {
      console.error('Translation error:', error);
      setResult(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>🌍 Translation Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Text to translate:</label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to translate..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target Language:</label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                <SelectItem value="fr">🇫🇷 French</SelectItem>
                <SelectItem value="de">🇩🇪 German</SelectItem>
                <SelectItem value="ja">🇯🇵 Japanese</SelectItem>
                <SelectItem value="ko">🇰🇷 Korean</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={testTranslation} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Translating...' : 'Test Translation'}
          </Button>

          {result && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Translation Result:</h3>
              <p>{result}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 