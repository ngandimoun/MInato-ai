import { useState, useEffect, useRef } from 'react';

interface UseTypingEffectOptions {
  speed?: number;
  enabled?: boolean;
}

export function useTypingEffect(
  text: string,
  options: UseTypingEffectOptions = {}
): [string, boolean] {
  const { speed = 20, enabled = true } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const currentIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset when text changes
    currentIndexRef.current = 0;
    setDisplayedText('');
    setIsComplete(false);

    if (!enabled || !text) {
      setDisplayedText(text || '');
      setIsComplete(true);
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start typing effect
    intervalRef.current = setInterval(() => {
      if (currentIndexRef.current < text.length) {
        const nextIndex = Math.min(
          currentIndexRef.current + 1,
          text.length
        );
        setDisplayedText(text.slice(0, nextIndex));
        currentIndexRef.current = nextIndex;
      } else {
        // Complete
        setIsComplete(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, speed);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, speed, enabled]);

  return [displayedText, isComplete];
} 