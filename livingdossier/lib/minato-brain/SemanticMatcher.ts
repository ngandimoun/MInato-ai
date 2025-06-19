import { Task, QueryAnalysis } from './PlaybookGenerator';
import { generateStructuredData } from '../../services/llm/openai';

/**
 * Interface for semantic concepts that can be used for matching
 */
export interface SemanticConcept {
  id: string;
  name: string;
  keywords: string[];
  synonyms: { [language: string]: string[] };
  related_concepts: string[];
}

/**
 * Interface for semantic matching results
 */
export interface SemanticMatchResult {
  taskId: string;
  score: number;
  matchedConcepts: string[];
  confidence: number;
}

export interface ConceptMatch {
  conceptId: string;
  score: number;
  conceptName: string;
  name: string;
}

/**
 * Semantic matcher for finding the best tasks based on query analysis
 */
export class SemanticMatcher {
  private conceptLibrary: Map<string, SemanticConcept> = new Map();
  private taskConceptMap: Map<string, string[]> = new Map();
  
  /**
   * Initialize the semantic matcher with concepts and task mappings
   * @param concepts List of semantic concepts
   * @param taskMappings Mapping of task IDs to concept IDs
   */
  constructor(concepts: SemanticConcept[] = [], taskMappings: Record<string, string[]> = {}) {
    // Initialize concept library
    concepts.forEach(concept => {
      this.conceptLibrary.set(concept.id, concept);
    });
    
    // Initialize task-concept mappings
    Object.entries(taskMappings).forEach(([taskId, conceptIds]) => {
      this.taskConceptMap.set(taskId, conceptIds);
    });
  }
  
  /**
   * Add a semantic concept to the library
   * @param concept The concept to add
   */
  public addConcept(concept: SemanticConcept): void {
    this.conceptLibrary.set(concept.id, concept);
  }
  
  /**
   * Map a task to concepts
   * @param taskId The ID of the task
   * @param conceptIds The IDs of the concepts to map to the task
   */
  public mapTaskToConcepts(taskId: string, conceptIds: string[]): void {
    this.taskConceptMap.set(taskId, conceptIds);
  }
  
  /**
   * Detect the language of a text
   * @param text The text to detect the language of
   * @returns The detected language code (e.g., 'en', 'fr', 'es')
   */
  private async detectLanguage(text: string): Promise<string> {
    const prompt = `
Detect the language of this text and return only the ISO 639-1 language code (e.g., 'en' for English, 'fr' for French):

"${text}"
`;
    
    return await generateStructuredData<string>(prompt);
  }
  
  /**
   * Extract semantic concepts from a query analysis
   * @param analysis The query analysis
   * @returns A list of concept IDs and their confidence scores
   */
  private async extractConcepts(analysis: QueryAnalysis): Promise<Map<string, number>> {
    const conceptScores = new Map<string, number>();
    const language = await this.detectLanguage(analysis.topic);
    
    // Process keywords from the analysis
    const processedKeywords = Array.from(new Set<string>(
      analysis.keywords.map(k => this.normalize(k))
    ));
    
    // Add topic and domain as keywords
    processedKeywords.push(this.normalize(analysis.topic));
    processedKeywords.push(this.normalize(analysis.domain));
    
    // Use Array.from instead of direct iteration
    Array.from(this.conceptLibrary.entries()).forEach(([conceptId, concept]) => {
      let score = 0;
      
      // Check for keyword matches
      processedKeywords.forEach(keyword => {
        const conceptKeywords = concept.keywords.map(k => this.normalize(k));
        conceptKeywords.forEach(conceptKeyword => {
          if (keyword.includes(conceptKeyword) || conceptKeyword.includes(keyword)) {
            score += 0.5;
          }
        });
      });
      
      // Check for synonym matches in the user's language
      const synonyms = concept.synonyms[language] || concept.synonyms['en'] || [];
      synonyms.forEach(synonym => {
        const normalizedSynonym = this.normalize(synonym);
        processedKeywords.forEach(keyword => {
          if (keyword.includes(normalizedSynonym) || normalizedSynonym.includes(keyword)) {
            score += 0.75; // Higher weight for language-specific synonyms
          }
        });
      });
      
      // If we have a score, add it to the map
      if (score > 0) {
        conceptScores.set(conceptId, score);
      }
    });
    
    return conceptScores;
  }
  
  /**
   * Score a task based on semantic matching with the query analysis
   * @param task The task to score
   * @param analysis The query analysis
   * @param extractedConcepts Map of concept IDs to confidence scores
   * @returns The score for the task and matched concepts
   */
  public async scoreTaskSemantically(
    task: Task,
    analysis: QueryAnalysis
  ): Promise<SemanticMatchResult> {
    try {
      // Extract concepts from the analysis
      const conceptScores = await this.extractConcepts(analysis);
      const matchedConcepts: string[] = [];
      let totalScore = 0;
      
      // Use Array.from instead of direct iteration
      Array.from(this.conceptLibrary.entries()).forEach(([conceptId, concept]) => {
        const conceptScore = conceptScores.get(conceptId) || 0;
        if (conceptScore > 0) {
          matchedConcepts.push(conceptId);
          totalScore += conceptScore;
          
          // Check if this task is mapped to this concept
          if (this.taskConceptMap.has(task.id)) {
            const taskConcepts = this.taskConceptMap.get(task.id) || [];
            if (taskConcepts.includes(conceptId)) {
              // Give a boost for direct concept matches
              totalScore += conceptScore * 2;
            }
          }
        }
      });
      
      // Calculate confidence based on matched concepts
      const confidence = matchedConcepts.length > 0 
        ? totalScore / matchedConcepts.length 
        : 0;
      
      return {
        taskId: task.id,
        score: totalScore,
        matchedConcepts,
        confidence
      };
    } catch (error) {
      console.error(`Error scoring task semantically: ${error}`);
      return {
        taskId: task.id,
        score: task.base_score || 0,
        matchedConcepts: [],
        confidence: 0
      };
    }
  }
  
  /**
   * Generate semantic embeddings for a text
   * This is a placeholder for future implementation with actual embedding models
   * @param text The text to generate embeddings for
   * @returns A vector representation of the text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // This is a placeholder. In a real implementation, you would use a proper embedding model
    // like OpenAI's text-embedding-ada-002 or a local model
    return Array(128).fill(0).map(() => Math.random());
  }
  
  /**
   * Calculate the cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity score (0-1)
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Build a semantic concept library from task triggers
   * @param tasks List of tasks to extract concepts from
   * @returns A list of semantic concepts
   */
  public static buildConceptLibraryFromTasks(tasks: Task[]): SemanticConcept[] {
    const concepts: SemanticConcept[] = [];
    const keywordMap = new Map<string, Set<string>>();
    
    // Extract keywords from task triggers
    tasks.forEach(task => {
      task.triggers.forEach(trigger => {
        const keyword = trigger.keyword.toLowerCase();
        if (keyword !== 'all') {
          const conceptId = `task_${task.id}`;
          const keywordSet = keywordMap.get(conceptId) || new Set<string>();
          keywordSet.add(keyword);
          keywordMap.set(conceptId, keywordSet);
        }
      });
    });
    
    // Create concepts from keywords
    Array.from(keywordMap.entries()).forEach(([conceptId, keywordSet]) => {
      const task = tasks.find(t => `task_${t.id}` === conceptId);
      if (task) {
        concepts.push({
          id: conceptId,
          name: task.description,
          keywords: Array.from(keywordSet),
          synonyms: { 'en': Array.from(keywordSet) },
          related_concepts: []
        });
      }
    });
    
    return concepts;
  }
  
  /**
   * Expand the concept library with new concepts extracted from a query
   * @param query The query to extract concepts from
   * @param language The language of the query
   * @returns The newly added concepts
   */
  public async expandConceptLibrary(query: string, language: string = 'en'): Promise<SemanticConcept[]> {
    const prompt = `
Analyze the following query and identify potential new domain concepts that might not be in our existing concept library:

Query: "${query}"
Language: "${language}"

Extract 1-3 key domain concepts that appear to be central to this query. For each concept, provide:
1. A clear name for the concept
2. A list of keywords closely associated with this concept
3. Synonyms in the query language and English (if different)
4. Related concepts that might be connected

Return the results as a JSON array with this structure:
[
  {
    "id": "concept_[unique_identifier]",
    "name": "Concept Name",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "synonyms": {
      "${language}": ["synonym1", "synonym2"],
      "en": ["english_synonym1", "english_synonym2"]
    },
    "related_concepts": []
  }
]

Focus on domain-specific concepts that represent specialized knowledge areas, techniques, methodologies, or frameworks.
`;

    try {
      const newConcepts = await generateStructuredData<SemanticConcept[]>(prompt);
      
      // Add the new concepts to the library
      for (const concept of newConcepts) {
        // Generate a unique ID if one doesn't exist
        if (!concept.id) {
          concept.id = `concept_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
        
        // Add the concept to the library
        this.addConcept(concept);
      }
      
      console.log(`Added ${newConcepts.length} new concepts to the library`);
      return newConcepts;
    } catch (error) {
      console.error('Error expanding concept library:', error);
      return [];
    }
  }
  
  /**
   * Save the expanded concept library to a file for future use
   * @param filePath The path to save the concept library to
   * @returns Whether the save was successful
   */
  public async saveConceptLibrary(filePath: string): Promise<boolean> {
    try {
      const fs = require('fs');
      const concepts = Array.from(this.conceptLibrary.values());
      
      await fs.promises.writeFile(
        filePath,
        `export const expandedConcepts = ${JSON.stringify(concepts, null, 2)};`
      );
      
      return true;
    } catch (error) {
      console.error('Error saving concept library:', error);
      return false;
    }
  }

  /**
   * Finds concepts that match the given query
   * @param query The query to match against
   * @param threshold The minimum similarity score to consider a match
   * @returns An array of matched concepts with their scores
   */
  findMatchingConcepts(query: string, threshold = 0.6): ConceptMatch[] {
    const matches: ConceptMatch[] = [];
    
    // Convert entries to array before iterating
    Array.from(this.conceptLibrary.values()).forEach(concept => {
      const score = this.calculateSimilarityScore(query, concept);
      
      if (score >= threshold) {
        matches.push({
          conceptId: concept.id,
          conceptName: concept.name,
          name: concept.name,
          score
        });
      }
    });
    
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Extracts keywords from a query based on concept mappings
   * @param query The query to extract keywords from
   * @returns An array of extracted keywords
   */
  extractKeywords(query: string): string[] {
    // Simple implementation - split by spaces and filter out common words
    const stopWords = ['the', 'and', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'with'];
    return query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }

  private buildKeywordIndex(): Map<string, string[]> {
    const conceptMap = this.buildConceptKeywordMap();
    const keywordIndex = new Map<string, string[]>();
    
    // Convert entries to array before iterating
    Array.from(conceptMap.entries()).forEach(([conceptId, keywords]) => {
      keywords.forEach(keyword => {
        const normalized = keyword.toLowerCase();
        const concepts = keywordIndex.get(normalized) || [];
        concepts.push(conceptId);
        keywordIndex.set(normalized, concepts);
      });
    });
    
    return keywordIndex;
  }

  /**
   * Calculate similarity score between query and concept
   * @param query The query text
   * @param concept The concept to compare against
   * @returns Similarity score between 0 and 1
   */
  private calculateSimilarityScore(query: string, concept: SemanticConcept): number {
    // Simple implementation - check for keyword matches
    const normalizedQuery = query.toLowerCase();
    const matchCount = concept.keywords.filter(keyword => 
      normalizedQuery.includes(keyword.toLowerCase())
    ).length;
    
    // Calculate score based on match count and total keywords
    return concept.keywords.length > 0 ? matchCount / concept.keywords.length : 0;
  }

  /**
   * Build a map of concept IDs to their keywords
   * @returns Map of concept IDs to keyword arrays
   */
  private buildConceptKeywordMap(): Map<string, string[]> {
    const conceptMap = new Map<string, string[]>();
    
    // Convert entries to array before iterating
    Array.from(this.conceptLibrary.values()).forEach(concept => {
      conceptMap.set(concept.id, concept.keywords);
    });
    
    return conceptMap;
  }

  /**
   * Normalize text for comparison
   * @param text The text to normalize
   * @returns Normalized text in lowercase with punctuation removed
   */
  private normalize(text: string): string {
    if (!text) return '';
    
    // Convert to lowercase and remove punctuation
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
  }
} 