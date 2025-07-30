import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimestampLinkProps {
  timestamp: string;
  onClick: (timestamp: string) => void;
  className?: string;
}

export const TimestampLink: React.FC<TimestampLinkProps> = ({ 
  timestamp, 
  onClick, 
  className = "" 
}) => {
  const handleClick = () => {
    onClick(timestamp);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-block ${className}`}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="h-6 px-2 text-xs bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <Clock className="w-3 h-3 mr-1" />
        {timestamp}
        <Play className="w-3 h-3 ml-1" />
      </Button>
    </motion.div>
  );
};

// Component to render text with clickable timestamps
interface TimestampTextProps {
  text: string;
  onTimestampClick: (timestamp: string) => void;
  className?: string;
}

export const TimestampText: React.FC<TimestampTextProps> = ({ 
  text, 
  onTimestampClick, 
  className = "" 
}) => {
  // Regular expression to find both [timestamp:MM:SS] and [MM:SS] patterns
  const timestampRegex = /\[(?:timestamp:)?(\d{2}:\d{2})\]/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = timestampRegex.exec(text)) !== null) {
    // Add text before the timestamp
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Add the timestamp link
    parts.push(
      <TimestampLink
        key={match.index}
        timestamp={match[1]}
        onClick={onTimestampClick}
      />
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <span className={className}>
      {parts}
    </span>
  );
}; 