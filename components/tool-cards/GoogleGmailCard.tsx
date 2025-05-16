//components/tool-cards/GoogleGmailCard.tsx
"use client";

import { EmailHeaderList, EmailHeader } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, UserCircle, Clock } from "lucide-react";

interface GoogleGmailCardProps { data: EmailHeaderList; }

export function GoogleGmailCard({ data }: GoogleGmailCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No email data available.</p>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary"/>
            Recent Emails
        </CardTitle>
        <CardDescription>
          {data.emails.length > 0 ? `Showing ${data.emails.length} recent email(s).` : "No recent emails matching criteria."}
          {data.query?.query && ` For query: "${data.query.query}"`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.emails && data.emails.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {data.emails.map(email => (
              <li key={email.id} className="p-3 border rounded-md hover:bg-muted/50">
                <h4 className="font-medium text-sm truncate" title={email.subject}>{email.subject}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <UserCircle className="h-3 w-3"/> From: {email.from}
                </p>
                {email.date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3"/>
                    {new Date(email.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                )}
                {email.snippet && <p className="text-xs text-muted-foreground mt-1 truncate">"{email.snippet}"</p>}
                {email.bodySummary && <p className="text-xs mt-1 border-t pt-1"><strong>Summary:</strong> {email.bodySummary}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No emails to display.</p>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}