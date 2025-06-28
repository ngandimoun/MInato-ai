# Reddit Lead Generator Tool

The Reddit Lead Generator Tool is an AI-powered lead generation system that scans multiple subreddits to find potential customers based on their posts and generates personalized outreach messages.

## Features

- **AI-Powered Lead Analysis**: Uses advanced AI to analyze Reddit posts and identify potential leads
- **Multi-Subreddit Scanning**: Search across multiple subreddits simultaneously
- **Confidence Scoring**: Each lead gets a confidence score (0-100%) based on AI analysis
- **Pain Point Identification**: Automatically identifies pain points mentioned in posts
- **Intent Classification**: Categorizes user intent (seeking help, asking questions, expressing frustration, etc.)
- **Urgency Assessment**: Determines urgency level (high, medium, low)
- **Budget & Decision Maker Signals**: Identifies signs of budget authority and decision-making power
- **Personalized Message Generation**: Creates custom DMs and public comments for each lead
- **Mobile-Friendly UI**: Beautiful, responsive interface for viewing and managing leads

## How It Works

1. **Search Configuration**: Specify what type of leads you're looking for and which subreddits to search
2. **Post Scanning**: The tool fetches recent posts from specified subreddits
3. **AI Analysis**: Each post is analyzed by AI to determine if the author is a potential lead
4. **Lead Qualification**: Only high-confidence leads (60%+ confidence) are included in results
5. **Message Generation**: For each qualified lead, personalized DM and comment messages are generated
6. **Results Display**: Leads are sorted by confidence and urgency, with full analysis and generated messages

## Usage Examples

### Basic Lead Generation
```
Find me leads for website building services on Reddit
```

### Specific Product/Service
```
Find leads for AI marketing tools in r/entrepreneur, r/marketing, r/digitalmarketing
```

### Advanced Configuration
```
Search for people looking for website builders in webdev and entrepreneur subreddits. I'm selling a drag-and-drop website builder for small businesses.
```

## Tool Parameters

- **searchPrompt**: Description of what type of posts/leads to look for
- **subreddits**: Array of subreddit names to search (without 'r/' prefix)
- **productOrService**: Your product/service description for personalized messaging
- **targetAudience**: Description of your ideal customer
- **maxPostsPerSubreddit**: Number of posts to analyze per subreddit (1-25, default: 10)
- **timeFilter**: Time period for posts (hour, day, week, month, year, all)
- **generateMessages**: Whether to generate personalized messages (default: true)

## AI Analysis Components

### Lead Qualification
- **Confidence Score**: 0-100% confidence that this is a qualified lead
- **Intent Classification**: seeking_help, asking_questions, expressing_frustration, looking_for_solutions, other
- **Urgency Level**: high, medium, low

### Signal Detection
- **Pain Points**: Specific problems or frustrations mentioned
- **Budget Indicators**: Signs they have budget or spending authority
- **Decision Maker Signals**: Indicators they can make purchasing decisions

### Message Generation
- **Direct Message**: Personal, helpful message for private outreach
- **Public Comment**: Value-adding comment for public engagement
- **Strategy Reasoning**: Explanation of the messaging approach

## Best Practices

### Subreddit Selection
- Choose subreddits where your target audience is active
- Include both general business subreddits and niche-specific ones
- Popular choices: entrepreneur, smallbusiness, startups, webdev, marketing

### Search Prompt Optimization
- Be specific about what you're looking for
- Include keywords your prospects might use
- Examples:
  - "people looking for website builders"
  - "users asking about marketing automation"
  - "business owners needing help with social media"

### Ethical Outreach
- Always add value before pitching
- Reference specific details from their post
- Be genuine and helpful
- Follow Reddit's rules and subreddit guidelines
- Don't spam or be overly promotional

## Example Output

Each lead includes:
- **Post Title & Content**: The original Reddit post
- **Author Information**: Username and subreddit
- **Confidence Score**: AI-generated confidence percentage
- **Analysis Details**: Pain points, intent, urgency, signals
- **Generated Messages**: Personalized DM and comment
- **Quick Actions**: Links to view post and user profile

## Integration

The tool is fully integrated into Minato's chat interface with:
- Beautiful, mobile-friendly UI cards
- Copy-to-clipboard functionality for messages
- Real-time lead analysis
- Sortable results by confidence and urgency

## Tool Aliases

You can invoke this tool using any of these commands:
- `redditleads`
- `findleads`
- `leadgen`
- `leadgeneration`
- `redditprospecting`
- `prospecting`
- `redditoutreach`
- `socialmedialeads`
- `generateleads`
- `scanlead`

## Technical Details

- **Rate Limiting**: Respects Reddit's API rate limits
- **Caching**: Results cached for 10 minutes to avoid duplicate API calls
- **Error Handling**: Graceful handling of API errors and timeouts
- **Privacy**: No data stored permanently, only processed for analysis
- **Performance**: Parallel processing for multiple subreddits

## Limitations

- Only analyzes public Reddit posts
- Limited to 25 posts per subreddit per request
- Requires posts to have sufficient content for analysis
- AI analysis accuracy depends on post quality and context
- Subject to Reddit's API availability and rate limits

## Future Enhancements

- Comment analysis integration
- Historical post scanning
- Lead scoring refinements
- CRM integration capabilities
- Automated follow-up scheduling
- Sentiment analysis improvements 