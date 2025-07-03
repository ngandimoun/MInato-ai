import React from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserMessageProps {
  message: string;
  userImage?: string;
  userName?: string;
}

export function UserMessage({ message, userImage, userName }: UserMessageProps) {
  // Get first letter of name for avatar fallback
  const fallbackText = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start space-x-3 justify-end"
    >
      <div className="flex-1 max-w-[80%]">
        <div className="bg-primary text-primary-foreground p-3 rounded-lg shadow-sm">
          <p className="text-sm">{message}</p>
        </div>
      </div>
      <Avatar className="h-8 w-8">
        {userImage ? (
          <AvatarImage src={userImage} alt={userName || "User"} />
        ) : (
          <AvatarFallback className="bg-primary/20 text-primary">
            {fallbackText}
          </AvatarFallback>
        )}
      </Avatar>
    </motion.div>
  );
} 