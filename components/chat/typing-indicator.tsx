// components/chat/typing-indicator.tsx
// (Content from finalcodebase.txt - verified)
"use client";

import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card text-card-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-border" // Use border for consistency
      >
        <div className="flex space-x-1.5 items-center h-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/70" // Slightly smaller dots
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 1.2, // Slightly slower for smoother feel
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.15, // Adjusted delay
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
