// // FILE: components/call/call-header.tsx

// "use client";

// import { motion } from "framer-motion";
// import { Clock, AlertTriangle } from "lucide-react";
// import { cn } from "@/lib/utils";

// interface CallHeaderProps {
//   callMode: "audio" | "video";
//   assistantState:
//     | "idle"
//     | "listening"
//     | "thinking"
//     | "speaking"
//     | "connecting"
//     | "error";
//   callDuration: string;
// }

// export function CallHeader({ callMode, assistantState, callDuration }: CallHeaderProps) {
//   const getStatusText = () => {
//     switch (assistantState) {
//       case "listening": return "Minato is Listening...";
//       case "thinking": return "Minato is Thinking...";
//       case "speaking": return "Minato is Speaking...";
//       case "connecting": return "Connecting to Minato...";
//       case "error": return "Connection Error";
//       default: return "Minato is Ready";
//     }
//   };

//   const getStatusColor = () => {
//     switch (assistantState) {
//       case "listening": return "bg-blue-500";
//       case "thinking": return "bg-amber-500";
//       case "speaking": return "bg-green-500";
//       case "connecting": return "bg-yellow-500";
//       case "error": return "bg-red-500";
//       default: return "bg-slate-500";
//     }
//   };

//   return (
//     <div className="flex items-center justify-between py-2 px-1">
//       <div className="flex items-center space-x-2">
//         <motion.div
//           animate={{
//             scale: assistantState !== "idle" && assistantState !== "error" ? [1, 1.2, 1] : 1,
//             opacity: 1,
//           }}
//           transition={{
//             duration: assistantState === "connecting" ? 0.8 : 1.5,
//             repeat: assistantState !== "idle" && assistantState !== "error" ? Infinity : 0,
//             repeatType: "loop",
//           }}
//           className={cn(
//             "h-2.5 w-2.5 rounded-full transition-colors duration-300",
//             getStatusColor()
//           )}
//         />
//         <span className="text-sm font-medium min-w-[150px] text-left tabular-nums">
//           {assistantState === "error" ? (
//             <span className="flex items-center text-destructive">
//               <AlertTriangle className="h-4 w-4 mr-1" /> Error
//             </span>
//           ) : (
//             getStatusText()
//           )}
//         </span>
//       </div>

//       <div className="flex items-center space-x-1 text-sm text-muted-foreground">
//         <Clock className="h-3.5 w-3.5" />
//         <span className="font-mono">{callDuration}</span>
//       </div>
//     </div>
//   );
// }