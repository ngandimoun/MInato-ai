//components/tool-cards/GoogleGmailCard.tsx
"use client";
import { EmailHeaderList, EmailHeader } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, UserCircle, Clock, FileText, AlertCircle, ChevronDown, ChevronUp, Inbox } from "lucide-react";
import { format, parseISO, formatDistanceToNowStrict } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
interface EmailItemProps {
email: EmailHeader;
isExpanded: boolean;
onToggleExpand: () => void;
userLocale?: string;
}
const EmailItem: React.FC<EmailItemProps> = ({ email, isExpanded, onToggleExpand, userLocale }) => {
let formattedDate = "Date N/A";
let relativeDate = "";
if (email.date) {
  try {
    const dateObj = parseISO(email.date);
    // Pour la plupart des apps Next.js, l'import dynamique de locale n'est pas supporté côté client sans configuration spéciale
    // Donc on laisse locale undefined sauf pour 'en' (par défaut)
    const dateFnsLocale = userLocale && userLocale.toLowerCase() !== 'en' ? undefined : undefined;
    formattedDate = format(dateObj, "PPp", { locale: dateFnsLocale });
    relativeDate = `(${formatDistanceToNowStrict(dateObj, { addSuffix: true, locale: dateFnsLocale })})`;
  } catch (e) {
    formattedDate = email.dateRaw || "Invalid Date"; // Fallback to raw date string
  }
}
const hasDetails = email.snippet || email.bodySummary;

return (
    <li className="p-3 border rounded-lg hover:bg-muted/50 transition-shadow">
        <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-primary line-clamp-1" title={email.subject}>{email.subject}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <UserCircle className="h-3 w-3 flex-shrink-0"/> 
                    <span className="truncate" title={email.fromRaw || email.from}>From: {email.from}</span>
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1" title={formattedDate}>
                    <Clock className="h-3 w-3 flex-shrink-0"/>
                    {relativeDate || formattedDate}
                </p>
            </div>
            {hasDetails && (
                 <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-7 w-7 text-muted-foreground hover:text-primary -mr-1">
                    {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                 </Button>
            )}
        </div>

        <AnimatePresence initial={false}>
        {isExpanded && (
            <motion.div
                key="content"
                initial="collapsed"
                animate="open"
                exit="collapsed"
                variants={{
                    open: { opacity: 1, height: "auto", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed hsl(var(--border))" },
                    collapsed: { opacity: 0, height: 0, marginTop: "0rem", paddingTop: "0rem" }
                }}
                transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
            >
                {email.bodySummary && email.bodySummary !== "[Could not summarize body]" && email.bodySummary !== "[No text body found]" && (
                    <div className="mb-1.5">
                        <p className="text-xs font-medium text-foreground/90 flex items-center gap-1"><FileText size={12}/> Minato's Summary:</p>
                        <p className="text-xs text-muted-foreground pl-1">{email.bodySummary}</p>
                    </div>
                )}
                {email.snippet && (!email.bodySummary || email.bodySummary.startsWith("[")) && ( // Show snippet if no good summary
                    <div >
                        <p className="text-xs font-medium text-foreground/90">Snippet:</p>
                        <p className="text-xs text-muted-foreground pl-1 italic">"{email.snippet}"</p>
                    </div>
                )}
            </motion.div>
        )}
        </AnimatePresence>
    </li>
);
};
interface GoogleGmailCardProps { data: EmailHeaderList; }
export function GoogleGmailCard({ data }: GoogleGmailCardProps) {
const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
const userLocale = data.query?.context?.locale?.split("-")[0];
if (!data) return <p className="text-sm text-muted-foreground">No email data available.</p>;
const toggleExpand = (emailId: string) => {
setExpandedEmailId(prevId => (prevId === emailId ? null : emailId));
};
const queryDisplay = data.query?.query === "is:unread category:primary"
  ? "your primary unread emails"
  : (data.query?.query ? `emails matching "${data.query.query}"` : "recent emails");
return (
<Card className="w-full">
<CardHeader>
<CardTitle className="flex items-center gap-2">
<Mail className="h-5 w-5 text-primary"/>
Recent Emails
</CardTitle>
<CardDescription>
  {data.emails.length > 0 ? `Showing ${data.emails.length} of ${queryDisplay}.` : `No ${queryDisplay} found.`}
</CardDescription>
</CardHeader>
<CardContent>
{data.error && (
<div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
<AlertCircle size={18}/>
<div>
<p className="font-medium">Gmail Access Error</p>
<p className="text-xs">{data.error}</p>
</div>
</div>
)}
{!data.error && data.emails && data.emails.length > 0 ? (
<ScrollArea className={cn("max-h-80", data.emails.length > 3 ? "pr-2" : "")}>
<ul className="space-y-2.5">
{data.emails.map(email => (
<EmailItem
key={email.id}
email={email}
isExpanded={expandedEmailId === email.id}
onToggleExpand={() => toggleExpand(email.id)}
userLocale={userLocale}
/>
))}
</ul>
</ScrollArea>
) : (
!data.error &&
<div className="text-center py-6 text-muted-foreground">
<Inbox size={24} className="mx-auto mb-2 opacity-50"/>
<p className="text-sm">Your inbox is clear for this search.</p>
</div>
)}
</CardContent>
</Card>
);
}