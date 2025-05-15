"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

export default function AuthStatusTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState("Unknown");
  const [profileData, setProfileData] = useState<any>(null);
  const [newName, setNewName] = useState("");

  // Check authentication status
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile");
      console.log("[AUTH TEST] Response status:", res.status);
      
      if (res.status === 401) {
        setAuthStatus("Not authenticated (401)");
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        setAuthStatus(`Error (${res.status}): ${errorData?.error || "Unknown"}`);
        return;
      }
      
      const data = await res.json();
      console.log("[AUTH TEST] Profile data:", data);
      setAuthStatus("Authenticated ✓");
      setProfileData(data);
      
      if (data?.profile?.full_name) {
        setNewName(data.profile.full_name);
      }
    } catch (e) {
      console.error("[AUTH TEST] Error:", e);
      setAuthStatus("Error checking authentication");
    } finally {
      setIsLoading(false);
    }
  };

  // Update name
  const updateName = async () => {
    if (!newName.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: newName }),
      });
      
      console.log("[AUTH TEST] Update response status:", res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        toast({
          title: "Update failed",
          description: errorData?.error || `Error (${res.status})`,
          variant: "destructive",
        });
        return;
      }
      
      const data = await res.json();
      console.log("[AUTH TEST] Update response:", data);
      toast({ title: "Name updated successfully" });
      
      // Refresh profile data
      checkAuth();
    } catch (e) {
      console.error("[AUTH TEST] Update error:", e);
      toast({
        title: "Update failed",
        description: "Check console for details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div className="container max-w-2xl py-8 space-y-8">
      <h1 className="text-2xl font-bold">Authentication & Profile Test</h1>
      
      <div className="p-4 border rounded-lg space-y-2">
        <h2 className="text-lg font-medium">Authentication Status</h2>
        <p className="text-lg font-bold">{authStatus}</p>
        <Button onClick={checkAuth} disabled={isLoading}>
          {isLoading ? "Checking..." : "Check Auth Status"}
        </Button>
      </div>
      
      {profileData && (
        <div className="p-4 border rounded-lg space-y-4">
          <h2 className="text-lg font-medium">Profile Data</h2>
          
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded overflow-auto max-h-40">
            <pre className="text-xs">{JSON.stringify(profileData, null, 2)}</pre>
          </div>
          
          <div className="space-y-2">
            <h3>Current Name: <span className="font-medium">{profileData?.profile?.full_name || "Not set"}</span></h3>
            <h3>Current Language: <span className="font-medium">{profileData?.state?.preferred_locale || "Not set"}</span></h3>
            <h3>Active Persona: <span className="font-medium">{profileData?.state?.active_persona_id || "Not set"}</span></h3>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Update Name Test</h3>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
              />
              <Button onClick={updateName} disabled={isLoading}>
                {isLoading ? "Saving..." : "Update Name"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 