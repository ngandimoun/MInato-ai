// Evasion Video AI Prompts
// Prompts for YouTube video understanding and analysis

export const EVASION_PROMPTS = {
  // System prompt for video analysis
  SYSTEM_PROMPT: `You are Minato, an AI assistant helping users understand YouTube videos in real-time during group watching sessions. 

Your role:
- Analyze video content and answer questions about it
- Provide timestamps when referencing specific moments
- Support multiple languages (respond in the user's language)
- Be concise but informative
- Help users navigate to specific parts of the video

Guidelines:
- Always include timestamps in MM:SS format when referencing specific moments
- Make timestamps clickable by wrapping them in [timestamp:MM:SS] format
- If asked about something not in the video, politely clarify
- Be helpful and engaging
- Keep responses conversational and natural`,

  // Prompt for initial video analysis
  INITIAL_ANALYSIS: `Please analyze this YouTube video and provide:
1. A brief summary (2-3 sentences)
2. Key topics discussed
3. Important timestamps for major points
4. Any visual elements or demonstrations shown

Format timestamps as [timestamp:MM:SS] for easy navigation.`,

  // Prompt for specific questions
  QUESTION_ANALYSIS: (question: string, language?: string) => {
    const langPrefix = language ? `Please respond in ${language}. ` : '';
    return `${langPrefix}Answer this question about the video: "${question}"

If your answer references specific moments in the video, include timestamps in [timestamp:MM:SS] format for easy navigation.`;
  },

  // Prompt for timestamp-based questions
  TIMESTAMP_QUESTION: (timestamp: string, question: string) => 
    `At timestamp ${timestamp}, what is happening? Please answer: "${question}"

Provide context about what's shown at that moment and include relevant timestamps in [timestamp:MM:SS] format.`,

  // Prompt for multilingual support
  MULTILINGUAL_QUESTION: (question: string, targetLanguage: string) =>
    `Please answer this question in ${targetLanguage}: "${question}"

If your answer references specific moments in the video, include timestamps in [timestamp:MM:SS] format.`,

  // Prompt for video navigation help
  NAVIGATION_HELP: `Help users navigate this video by providing relevant timestamps for different topics or moments. When referencing specific parts, use [timestamp:MM:SS] format.`,

  // Prompt for content explanation
  EXPLAIN_CONTENT: (timestamp?: string) => {
    if (timestamp) {
      return `Explain what's happening at timestamp ${timestamp} and provide context about this part of the video. Include relevant timestamps in [timestamp:MM:SS] format.`;
    }
    return `Explain what's currently happening in this video and provide context. Include relevant timestamps in [timestamp:MM:SS] format.`;
  }
};

// Helper function to extract timestamps from AI responses
export const extractTimestamps = (text: string): Array<{text: string, timestamp: string}> => {
  const timestampRegex = /\[timestamp:(\d{2}:\d{2})\]/g;
  const timestamps: Array<{text: string, timestamp: string}> = [];
  let match;

  while ((match = timestampRegex.exec(text)) !== null) {
    timestamps.push({
      text: match[0],
      timestamp: match[1]
    });
  }

  return timestamps;
};

// Helper function to convert timestamp to seconds
export const timestampToSeconds = (timestamp: string): number => {
  const [minutes, seconds] = timestamp.split(':').map(Number);
  return minutes * 60 + seconds;
};

// Helper function to format seconds to MM:SS
export const secondsToTimestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};
