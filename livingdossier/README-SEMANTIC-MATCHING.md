# Semantic Matching System for Living Dossier

This document describes the enhanced semantic matching system implemented for the Living Dossier feature, which enables more dynamic and language-agnostic task selection based on user queries.

## Overview

The semantic matching system allows the Living Dossier to understand user queries in multiple languages and match them to the most relevant tasks, regardless of the exact wording used. This is achieved through several components:

1. **Multilingual Strategy Components**: Enhanced YAML configuration with triggers in multiple languages
2. **Semantic Concept Library**: A library of semantic concepts with synonyms in different languages
3. **Semantic Matcher**: A matching engine that uses semantic concepts to find relevant tasks
4. **Enhanced Query Analysis**: Language detection and semantic concept extraction

## Components

### 1. Multilingual Strategy Components

The `enhanced_strategy_components.yaml` file contains task definitions with triggers in multiple languages:

```yaml
- id: "market_size_analysis"
  description: "Analyze market size and growth potential"
  type: "llm"
  base_score: 60
  triggers:
    - keyword: "market size"
      weight: 100
    - keyword: "taille du marché" # French
      weight: 90
    - keyword: "tamaño del mercado" # Spanish
      weight: 90
    - keyword: "marktgröße" # German
      weight: 90
    - keyword: "市场规模" # Chinese
      weight: 90
    - keyword: "市場規模" # Japanese
      weight: 90
```

### 2. Semantic Concept Library

The `ConceptLibrary.ts` file defines semantic concepts with multilingual synonyms:

```typescript
export const businessConcepts: SemanticConcept[] = [
  {
    id: 'market_analysis',
    name: 'Market Analysis',
    keywords: ['market analysis', 'market research', 'industry analysis'],
    synonyms: {
      'en': ['market intelligence', 'market study'],
      'fr': ['analyse de marché', 'étude de marché'],
      'es': ['análisis de mercado', 'estudio de mercado'],
      'de': ['Marktanalyse', 'Marktforschung'],
      'zh': ['市场分析', '市场研究'],
      'ja': ['市場分析', '市場調査']
    },
    related_concepts: ['business_idea', 'competitor_analysis']
  }
]
```

### 3. Semantic Matcher

The `SemanticMatcher.ts` file implements the matching engine:

- **Language Detection**: Identifies the language of the user query
- **Concept Extraction**: Extracts semantic concepts from the query
- **Task Scoring**: Scores tasks based on semantic concept matches
- **Fuzzy Matching**: Handles partial or approximate matches

### 4. Enhanced Query Analysis

The query analysis has been enhanced to:

- Detect the language of the query
- Extract semantic concepts
- Identify related terms and synonyms
- Provide more comprehensive keyword extraction

## How It Works

1. User submits a query in any language
2. The system analyzes the query, detecting its language and extracting semantic concepts
3. The semantic matcher scores tasks based on:
   - Direct concept matches
   - Language-specific keyword matches
   - Fuzzy matches for similar terms
4. The system selects the highest-scoring tasks to execute
5. Task parameters are filled in with values from the query analysis

## Benefits

- **Language Agnostic**: Works with queries in multiple languages
- **Intent Understanding**: Focuses on the semantic meaning rather than exact keywords
- **More Accurate Matching**: Uses concept relationships and fuzzy matching
- **Dynamic Adaptation**: Can handle variations in phrasing and terminology

## Future Improvements

- Add more languages and concepts
- Implement vector embeddings for even better semantic matching
- Add automatic translation of task outputs to the user's language
- Expand the concept library with domain-specific terminology 