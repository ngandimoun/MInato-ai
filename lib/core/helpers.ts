import { UserState, OrchestratorResponse, ChatMessage } from "@/lib/types";
import { BaseTool } from "../tools/base-tool";

/**
 * Helper function to remove system prefixes from user inputs
 * @param input User input text
 * @returns Cleaned text without system prefixes
 */
export function stripSystemPrefixes(input: string): string {
  if (typeof input !== 'string') return input;
  
  // Remove voice conversation prefix
  input = input.replace(/^\[VOICE CONVERSATION: This is a spoken conversation\. Respond naturally and avoid using tools unless explicitly requested\.\]\s*/i, '');
  
  // Remove media upload prefix
  input = input.replace(/^\[MEDIA UPLOAD: The user has shared media content\. Please respond to the content directly in conversation, don't use tools\.\]\s*/i, '');
  
  return input;
}

/**
 * Summarize user state into a string representation
 * @param userState User state to summarize
 * @param maxLength Maximum length of summary
 * @returns String summary of the user state
 */
export function summarizeUserState(userState: UserState | null, maxLength: number = 200): string {
  if (!userState) return "No user state available.";
  
  const parts = [];
  
  if (userState.user_first_name) {
    parts.push(`Name: ${userState.user_first_name}`);
  }
  
  if (userState.preferred_locale) {
    parts.push(`Locale: ${userState.preferred_locale}`);
  }
  
  if (userState.timezone) {
    parts.push(`Timezone: ${userState.timezone}`);
  }
  
  return parts.join(" | ").substring(0, maxLength) || "Basic user state.";
}

/**
 * Gets the first response from an orchestration result
 * @param orchResult Orchestration result
 * @returns First response content
 */
export function getFirstOrchResponse(orchResult: any): string | null {
  if (!orchResult) return null;
  
  if (typeof orchResult === 'string') {
    return orchResult;
  }
  
  if (Array.isArray(orchResult) && orchResult.length > 0) {
    const firstItem = orchResult[0];
    
    if (typeof firstItem === 'string') {
      return firstItem;
    }
    
    if (firstItem && typeof firstItem === 'object') {
      if (typeof firstItem.content === 'string') {
        return firstItem.content;
      }
      
      if (firstItem.message && typeof firstItem.message.content === 'string') {
        return firstItem.message.content;
      }
    }
  }
  
  if (orchResult.message && typeof orchResult.message.content === 'string') {
    return orchResult.message.content;
  }
  
  if (orchResult.content && typeof orchResult.content === 'string') {
    return orchResult.content;
  }
  
  return null;
}

/**
 * Summarizes chat history into a concise text representation
 * @param history Array of chat messages
 * @param maxLength Maximum length of the summary in characters
 * @returns String summary of the chat history
 */
export function summarizeChatHistory(history: ChatMessage[], maxLength: number = 500): string {
  if (!history || history.length === 0) return "No conversation history.";
  
  // Take the last 10 messages or fewer
  const relevantHistory = history.slice(-10);
  
  // Convert each message to a string representation
  const messageStrings = relevantHistory.map(msg => {
    let content = "";
    
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Extract text content from content parts
      content = msg.content
        .filter(part => part.type === 'text')
        .map(part => (part as any).text || '')
        .join(' ');
    }
    
    // Truncate long messages
    if (content.length > 100) {
      content = content.substring(0, 97) + '...';
    }
    
    return `${msg.role.toUpperCase()}: ${content}`;
  });
  
  // Join with newlines
  let summary = messageStrings.join('\n');
  
  // Truncate if too long
  if (summary.length > maxLength) {
    summary = summary.substring(summary.length - maxLength);
    
    // Make sure we start at a newline
    const firstNewline = summary.indexOf('\n');
    if (firstNewline > -1) {
      summary = summary.substring(firstNewline + 1);
    }
    
    summary = `... (earlier conversation omitted) ...\n${summary}`;
  }
  
  return summary;
}

/**
 * Formats tool registry into a structured description for planners
 * @param toolRegistry Dictionary of available tools
 * @returns String representation of tools for the planner
 */
export function getToolDescriptionsForPlanner(toolRegistry: { [key: string]: any }): string {
  if (!toolRegistry || Object.keys(toolRegistry).length === 0) {
    return "No tools available.";
  }
  
  const toolDescriptions = Object.entries(toolRegistry).map(([name, tool]) => {
    // Extract parameters information if available
    let parametersText = "";
    
    if (tool && typeof tool === 'object' && 'parameters' in tool) {
      const toolParams = tool.parameters as any;
      const requiredParams = toolParams.required || [];
      const parameterProps = toolParams.properties || {};
      
      parametersText = Object.entries(parameterProps)
        .map(([paramName, paramInfo]: [string, any]) => {
          const isRequired = requiredParams.includes(paramName);
          const paramType = paramInfo.type || 'any';
          const description = paramInfo.description || '';
          
          return `    - ${paramName}${isRequired ? ' (required)' : ''}: ${paramType} - ${description}`;
        })
        .join('\n');
    }
    
    return `- Tool: ${name}
  Description: ${tool.description || 'No description available'}
  Parameters:
${parametersText || '    - No parameters required'}`;
  });
  
  return toolDescriptions.join('\n\n');
} 