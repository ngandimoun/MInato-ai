# Living Dossier - Dynamic, Interactive Reports

The Living Dossier system is a powerful tool for generating dynamic, interactive reports from user queries. This document outlines the key components and features of the system.

## Architecture Overview

The Living Dossier system follows a modular architecture with the following key components:

1. **Query Analysis & Refinement**: Analyzes and refines user queries to extract key information and intent.
2. **Playbook Generation**: Creates a customized execution plan based on the query and available tools.
3. **Task Execution**: Executes the playbook tasks to gather information from various sources.
4. **Synthesis Engine**: Combines the results into a coherent, structured report.
5. **Output Generation**: Creates interactive dashboards and reports in multiple formats.

## Key Features

### 1. Dynamic Multi-Format Output

The system generates reports in multiple formats:

- **Streamlit Dashboard**: Interactive Python-based dashboard with data visualization and user controls.
- **Next.js SPA**: Modern, responsive web application with interactive elements.
- **PDF Report**: Printable, static report for sharing and archiving.

### 2. Real-Time Collaborative Features

- **Real-time Updates**: Updates are pushed to all viewers in real-time using Supabase Realtime.
- **Collaborative Annotations**: Users can add comments and annotations to specific parts of the report.
- **Version History**: All changes are versioned for tracking and auditing.

### 3. Advanced Visualization

- **Dynamic Charts**: Interactive charts and graphs that respond to user input.
- **Custom Visualizations**: Specialized visualizations for different data types.
- **Responsive Design**: Visualizations adapt to different screen sizes.

### 4. Comprehensive Tool Integration

The system integrates with a wide range of tools:

- **Web Search**: Find information from across the web.
- **Financial Data**: Stock market data, company financials, etc.
- **Media Search**: YouTube, images, news, etc.
- **Academic Research**: Google Scholar, arXiv, etc.
- **Data Analysis**: Python REPL for custom analysis.
- **Visualization**: Custom data visualization tools.

### 5. Domain-Specific Intelligence

The system includes specialized components for various domains:

- **Business Intelligence**: Market analysis, competitive landscape, etc.
- **Financial Analysis**: Investment analysis, valuation, etc.
- **Education Planning**: Education funding, college planning, etc.
- **Renewable Energy**: Project finance, energy yield analysis, etc.
- **Travel Planning**: Destination analysis, itinerary planning, etc.
- **Sports Analysis**: Player performance, team analysis, etc.

## Implementation Details

### Database Schema

The Living Dossier is stored in Supabase with the following structure:

```sql
CREATE TABLE living_dossiers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  query TEXT NOT NULL,
  refined_query TEXT,
  status TEXT NOT NULL,
  progress INTEGER,
  playbook JSONB,
  results JSONB,
  streamlit_url TEXT,
  nextjs_url TEXT,
  pdf_url TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  collaborators UUID[],
  annotations JSONB,
  version INTEGER DEFAULT 1,
  last_updated_by UUID
);
```

### API Endpoints

- `POST /api/refine-query`: Analyzes and refines a user query.
- `POST /api/generate-dossier`: Initiates the dossier generation process.
- `GET /api/generate-dossier?dossierId=<id>`: Gets the status of a dossier.

### Real-Time Updates

The system uses Supabase Realtime to push updates to clients:

```typescript
export function subscribeToDossierUpdates(
  dossierId: string,
  callback: (dossier: LivingDossier) => void
): () => void {
  // Create a channel for the dossier
  const channel = supabase.channel(`dossier_${dossierId}`);
  
  // Subscribe to changes
  channel
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'living_dossiers',
      filter: `id=eq.${dossierId}`
    }, payload => {
      callback(payload.new as LivingDossier);
    })
    .subscribe();
  
  // Return a function to unsubscribe
  return () => {
    channel.unsubscribe();
  };
}
```

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key
- Anthropic API key (optional)

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env.local`
4. Run the development server: `npm run dev`

### Configuration

Configure the system in `config/config.ts`:

```typescript
export const config: Config = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  DEFAULT_MODEL: process.env.DEFAULT_MODEL || 'gpt-4-turbo-preview',
  FALLBACK_MODEL: process.env.FALLBACK_MODEL || 'gpt-3.5-turbo',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_KEY || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  // ... other configuration options
};
```

## Usage Examples

### Basic Usage

```typescript
// Generate a dossier
const { dossierId } = await fetch('/api/generate-dossier', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ query: 'Analyze the renewable energy market in Europe' })
}).then(res => res.json());

// Subscribe to updates
const unsubscribe = subscribeToDossierUpdates(dossierId, (dossier) => {
  console.log(`Dossier progress: ${dossier.progress}%`);
  if (dossier.status === 'completed') {
    console.log(`Dossier completed: ${dossier.nextjs_url}`);
  }
});
```

### Collaborative Features

```typescript
// Add a collaborator
await addCollaborator(dossierId, collaboratorUserId);

// Add an annotation
await addAnnotation(dossierId, {
  text: 'This is an important insight!',
  position: { elementId: 'chart-1' },
  type: 'comment'
}, userId);
```

## Future Enhancements

1. **Enhanced Collaboration**: Real-time collaborative editing and commenting.
2. **AI-Powered Insights**: Automatic generation of insights and recommendations.
3. **Custom Templates**: User-defined templates for different types of reports.
4. **Integration with External Tools**: Connect with BI tools, CRMs, etc.
5. **Mobile App**: Native mobile experience for on-the-go access. 