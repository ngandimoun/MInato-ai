//components/tool-cards/MoodJournalCard.tsx
"use client";

import { MoodJournalStructuredOutput } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smile, Meh, Frown, Edit3, CheckCircle, AlertCircle } from "lucide-react"; // Example icons

interface MoodJournalCardProps { data: MoodJournalStructuredOutput; }

export function MoodJournalCard({ data }: MoodJournalCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No journal data available.</p>;

  const getMoodIcon = () => {
    const moodLower = data.loggedMood?.toLowerCase();
    if (moodLower?.includes("happy") || moodLower?.includes("excited") || moodLower?.includes("joy")) return <Smile className="h-5 w-5 text-green-500"/>;
    if (moodLower?.includes("sad") || moodLower?.includes("stressed") || moodLower?.includes("anxious")) return <Frown className="h-5 w-5 text-red-500"/>;
    return <Meh className="h-5 w-5 text-yellow-500"/>;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary"/>
            Journal Entry Logged
        </CardTitle>
        {data.timestamp && <CardDescription>Logged on: {new Date(data.timestamp).toLocaleString()}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.status === "success" ? (
          <>
            {data.loggedMood && <p className="text-sm flex items-center gap-1"><strong>Mood:</strong> {getMoodIcon()} {data.loggedMood}</p>}
            {data.loggedRating !== undefined && <p className="text-sm"><strong>Rating:</strong> {data.loggedRating}/5</p>}
            <p className="text-xs text-muted-foreground mt-2">Entry Text (from query):</p>
            <p className="text-sm p-2 bg-muted rounded-md max-h-20 overflow-y-auto">"{data.query?.entryText || "No text provided in query."}"</p>
            <p className="text-green-600 text-xs mt-2 flex items-center gap-1"><CheckCircle size={14}/> Successfully saved to your journal.</p>
          </>
        ) : (
            <p className="text-destructive text-sm flex items-center gap-1"><AlertCircle size={16}/> {data.errorMessage || "Could not log entry."}</p>
        )}
      </CardContent>
    </Card>
  );
}