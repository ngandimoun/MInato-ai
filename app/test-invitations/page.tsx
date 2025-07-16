"use client";

import { useState } from 'react';
import { useUserInvitations } from '@/hooks/useSupabaseGames';
import { useAuth } from '@/context/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestInvitationsPage() {
  const { user } = useAuth();
  const { invitations, isLoading } = useUserInvitations();
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');

  const handleSetupUserProfiles = async () => {
    setSetupLoading(true);
    setSetupMessage('');
    
    try {
      const response = await fetch('/api/setup-user-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setSetupMessage('✅ User profiles table created successfully');
      } else {
        setSetupMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setSetupMessage(`❌ Error: ${error}`);
    } finally {
      setSetupLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to view invitations</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Game Invitations Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>User Email:</strong> {user.email}</p>
          </div>
          
          <div>
            <Button 
              onClick={handleSetupUserProfiles}
              disabled={setupLoading}
            >
              {setupLoading ? 'Setting up...' : 'Setup User Profiles Table'}
            </Button>
            {setupMessage && (
              <p className="mt-2 text-sm">{setupMessage}</p>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Invitations Status</h3>
            <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>Count:</strong> {invitations.length}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Invitations Data</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(invitations, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 