//components/tool-cards/DateTimeCard.tsx
'use client'
import { DateTimeStructuredOutput } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Globe, Timer, CalendarDays, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface DateTimeCardProps { data: DateTimeStructuredOutput; }

export function DateTimeCard({ data }: DateTimeCardProps) {
    if (!data || !data.primaryLocation) return (
        <Card className="w-full max-w-sm glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="flex items-center"
                    >
                        <Clock className="h-5 w-5 text-cyan-500 mr-1"/>
                        <Sparkles className="h-3 w-3 text-cyan-400" />
                    </motion.div>
                    <motion.span
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        Time Information
                    </motion.span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">No date/time data available.</p>
            </CardContent>
        </Card>
    );
    
    const loc = data.primaryLocation;
    
    return (
        <Card className="w-full max-w-sm glass-card">
            {/* Card accent */}
            <span className="card-accent-left from-cyan-500/20 to-cyan-400/10" />
            <span className="card-accent-top from-cyan-500/20 to-cyan-400/10" />
            
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="flex items-center"
                    >
                        <Clock className="h-5 w-5 text-cyan-500 mr-1"/>
                        <Sparkles className="h-3 w-3 text-cyan-400" />
                    </motion.div>
                    <motion.span
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        Time for {loc.inputLocation}
                    </motion.span>
                </CardTitle>
                {loc.resolvedTimezone && (
                    <CardDescription className="flex items-center text-xs gap-1.5">
                        <Globe className="h-3 w-3" />
                        <span className="font-medium">
                            {loc.resolvedTimezone} 
                            <span className="opacity-70 ml-1">(UTC{loc.utcOffset})</span>
                        </span>
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                {loc.error ? (
                    <p className="text-destructive text-sm">{loc.error}</p>
                ) : (
                    <div className="space-y-2">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center"
                        >
                            <Timer className="h-4 w-4 text-cyan-500 mr-2" />
                            <p className="text-3xl font-semibold">{loc.currentTime}</p>
                        </motion.div>
                        <motion.div
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center"
                        >
                            <CalendarDays className="h-4 w-4 text-cyan-500 mr-2" />
                            <p className="text-sm text-muted-foreground">{loc.dayOfWeek}, {loc.currentDate}</p>
                        </motion.div>
                    </div>
                )}
                {data.allRequestedLocations && data.allRequestedLocations.length > 1 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-4 pt-3 border-t"
                    >
                        <p className="text-xs font-medium mb-2 flex items-center">
                            <Globe className="h-3.5 w-3.5 text-cyan-500 mr-1.5" /> Other Locations:
                        </p>
                        <div className="space-y-2">
                            {data.allRequestedLocations
                                .filter(l => l.inputLocation !== loc.inputLocation)
                                .map((otherLoc, idx) => (
                                    <motion.div 
                                        key={idx}
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + (idx * 0.1) }}
                                        className="text-xs flex items-center p-1.5 rounded-md bg-background/50"
                                    >
                                        <div className="w-1/3 font-medium text-primary">{otherLoc.inputLocation}:</div>
                                        <div className="flex-1">{otherLoc.currentTime || otherLoc.error}</div>
                                    </motion.div>
                                ))
                            }
                        </div>
                    </motion.div>
                )}
                {data.error && !loc.error && (
                    <p className="text-xs text-destructive mt-3 p-2 bg-destructive/10 rounded-md">
                        Overall Error: {data.error}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}