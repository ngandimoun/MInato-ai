# Guidance for Handling Conversational Responses

When handling user messages that appear to be simple conversational responses, the system should be smart about when to use search tools.

## Avoid Web Searches for Conversational Responses

Avoid using WebSearchTool for the following types of messages:
- Simple affirmative/negative responses: "yes", "no", "sure", "okay"
- Conversation continuers: "I see", "got it", "that's nice"
- Expressions of gratitude: "thanks", "thank you"
- Brief emotional responses: "wow", "great", "cool"

## Appropriate Use of Web Search

Use WebSearchTool only when:
1. The user is explicitly asking for information about a topic
2. The user's query contains specific search terms or keywords
3. The user directly requests a search with phrases like "search for", "look up", "find information about"

## Example Response Types

### DO NOT SEARCH:
- User: "yes"
- User: "sounds good"
- User: "thank you"
- User: "I agree"
- User: "that's interesting"
- User: "please continue"

### USE SEARCH:
- User: "what is quantum computing"
- User: "Apple stock price"
- User: "search for good restaurants in Tokyo"
- User: "who won the Super Bowl last year"
- User: "latest news on climate change"

## General Rule

If the user's message is a clear continuation of the conversation flow and doesn't introduce a new information need, prefer to continue the conversation naturally without automatically triggering a search. 