//livingdossier/lib/minato-brain/SynthesisEngine.ts

//The "Creative Directe and Author"

import { TaskResult } from './ExecutionEngine';
import { askGPT, generateStructuredData } from '../../services/llm/openai';
import { updateDossier } from '../../services/database/living_dossier';
import { config } from '../../config/config';
import * as fs from 'fs';
import * as path from 'path';

export interface SynthesisOptions {
  format: 'streamlit' | 'nextjs' | 'pdf' | 'all';
  includeRawData?: boolean;
  includeVisualization?: boolean;
  includeInteractiveElements?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export interface SynthesisResult {
  title?: string;
  summary: string;
  structure: any;
  sections?: {title: string, content: string}[];
  visualizations: any[];
  interactiveElements: any[];
  rawData: any;
  format: string;
}

/**
 * Generate a title for the dossier
 * @param query The user's query
 * @param taskResults The results of the tasks
 * @returns A title for the dossier
 */
async function generateTitle(query: string, taskResults: TaskResult[]): Promise<string> {
  const prompt = `
Generate a concise, engaging title for a report that answers this query:
"${query}"

The title should be clear, professional, and accurately reflect the content of the report.
Respond with just the title, no quotes or additional text.
`;

  return await askGPT(prompt);
}

/**
 * Generate a summary of the dossier
 * @param query The user's query
 * @param taskResults The results of the tasks
 * @returns A summary of the dossier
 */
async function generateSummary(query: string, taskResults: TaskResult[]): Promise<string> {
  const successfulResults = taskResults.filter(r => r.success);
  const resultsText = successfulResults
    .map(r => `Task "${r.taskId}" output:\n${JSON.stringify(r.result, null, 2)}`)
    .join('\n\n');
  
  const prompt = `
You are a senior analyst preparing an executive summary for a comprehensive report.

The report answers this query:
"${query}"

Based on the following task results, write a concise, insightful executive summary (3-4 paragraphs) that captures the key findings and their implications:

${resultsText}

Your summary should be clear, direct, and focused on the most important insights. Use professional language suitable for a business audience.
`;

  return await askGPT(prompt);
}

/**
 * Generate sections for the dossier
 * @param query The user's query
 * @param taskResults The results of the tasks
 * @returns Sections for the dossier
 */
async function generateSections(query: string, taskResults: TaskResult[]): Promise<{title: string, content: string}[]> {
  const successfulResults = taskResults.filter(r => r.success);
  const resultsText = successfulResults
    .map(r => `Task "${r.taskId}" output:\n${JSON.stringify(r.result, null, 2)}`)
    .join('\n\n');
  
  const prompt = `
You are a professional report writer organizing a comprehensive analysis into logical sections.

The report answers this query:
"${query}"

Based on the following task results, identify the most important themes and organize them into 3-5 coherent sections:

${resultsText}

For each section, provide:
1. A clear, descriptive title
2. Comprehensive content (2-3 paragraphs) that synthesizes relevant findings

Return the result as a JSON array of objects, each with "title" and "content" properties.
`;

  return await generateStructuredData<{title: string, content: string}[]>(prompt);
}

/**
 * Generate visualizations for the dossier
 * @param query The user's query
 * @param taskResults The results of the tasks
 * @returns Visualizations for the dossier
 */
async function generateVisualizations(
  query: string, 
  taskResults: TaskResult[]
): Promise<{type: string, title: string, description: string, data: any}[]> {
  const successfulResults = taskResults.filter(r => r.success);
  const resultsText = successfulResults
    .map(r => `Task "${r.taskId}" output:\n${JSON.stringify(r.result, null, 2)}`)
    .join('\n\n');
  
  const prompt = `
You are a data visualization expert creating visualizations for an interactive report.

The report answers this query:
"${query}"

Based on the following task results, identify 2-3 key insights that would benefit from visualization:

${resultsText}

For each visualization, specify:
1. The visualization type (bar_chart, line_chart, pie_chart, scatter_plot, table, etc.)
2. A clear title
3. A brief description of what the visualization shows
4. The data to be visualized (extract or transform from the task results)

Return the result as a JSON array of objects, each with "type", "title", "description", and "data" properties.
`;

  return await generateStructuredData<{type: string, title: string, description: string, data: any}[]>(prompt);
}

/**
 * Generate a Python Streamlit app for the dossier
 * @param synthesis The synthesis result
 * @returns Python code for a Streamlit app
 */
async function generateStreamlitApp(synthesis: SynthesisResult): Promise<string> {
  const prompt = `
You are an expert Python developer specializing in data visualization with Streamlit.

Create a complete, self-contained Streamlit application that presents the following report:

Title: ${synthesis.title || 'Living Dossier Report'}

Summary: ${synthesis.summary}

Sections:
${synthesis.sections?.map(s => `- ${s.title}: ${s.content}`).join('\n') || 'No sections available'}

Visualizations:
${synthesis.visualizations.map(v => `- ${v.type} - ${v.title}: ${v.description}`).join('\n')}

Requirements:
1. The app should be visually appealing with a clean, professional design
2. Include a sidebar for navigation between sections
3. Make all visualizations interactive where appropriate
4. Ensure the app is mobile-responsive
5. Use plotly for visualizations
6. Include all necessary imports and data processing code

Return only the complete Python code for the Streamlit app, with no additional explanations.
`;

  return await askGPT(prompt);
}

/**
 * Generate a JavaScript SPA for the dossier
 * @param synthesis The synthesis result
 * @returns JavaScript code for a SPA
 */
async function generateJavaScriptSPA(synthesis: SynthesisResult): Promise<string> {
  const prompt = `
You are an expert JavaScript developer specializing in data visualization and interactive web applications.

Create a complete, self-contained Single Page Application that presents the following report:

Title: ${synthesis.title || 'Living Dossier Report'}

Summary: ${synthesis.summary}

Sections:
${synthesis.sections?.map(s => `- ${s.title}: ${s.content}`).join('\n') || 'No sections available'}

Visualizations:
${synthesis.visualizations.map(v => `- ${v.type} - ${v.title}: ${v.description}`).join('\n')}

Requirements:
1. Use modern JavaScript with HTML and CSS (no frameworks required, but you can use CDN-hosted libraries)
2. The app should be visually appealing with a clean, professional design
3. Include navigation between sections
4. Make all visualizations interactive where appropriate
5. Ensure the app is mobile-responsive
6. Use D3.js or Chart.js for visualizations
7. Include all necessary data processing code
8. The entire application should be in a single HTML file with embedded JavaScript and CSS

Return only the complete HTML code for the SPA, with no additional explanations.
`;

  return await askGPT(prompt);
}

/**
 * Save a file to the dossier storage
 * @param dossierId The ID of the dossier
 * @param filename The name of the file
 * @param content The content of the file
 * @returns The path to the saved file
 */
function saveToStorage(dossierId: string, filename: string, content: string): string {
  const storageDir = path.join(config.DOSSIER_STORAGE_PATH, dossierId);
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  
  const filePath = path.join(storageDir, filename);
  fs.writeFileSync(filePath, content);
  
  return filePath;
}

/**
 * Deploy a Streamlit app
 * @param dossierId The ID of the dossier
 * @param code The Python code for the Streamlit app
 * @returns The URL of the deployed app
 */
async function deployStreamlitApp(dossierId: string, code: string): Promise<string> {
  // Save the code to a file
  const filePath = saveToStorage(dossierId, 'app.py', code);
  
  // This is a placeholder - in a real implementation, you would deploy the app to a server
  // For now, we'll just return a mock URL
  return `${config.DOSSIER_BASE_URL || 'https://dossier.example.com'}/streamlit/${dossierId}`;
}

/**
 * Deploy a JavaScript SPA
 * @param dossierId The ID of the dossier
 * @param code The HTML code for the SPA
 * @returns The URL of the deployed app
 */
async function deployJavaScriptSPA(dossierId: string, code: string): Promise<string> {
  // Save the code to a file
  const filePath = saveToStorage(dossierId, 'index.html', code);
  
  // This is a placeholder - in a real implementation, you would deploy the app to a server
  // For now, we'll just return a mock URL
  return `${config.DOSSIER_BASE_URL || 'https://dossier.example.com'}/spa/${dossierId}`;
}

/**
 * Synthesize the results of multiple tasks into a coherent dossier
 * @param results The results of all tasks
 * @param query The original user query
 * @param refinedQuery The refined query
 * @param dossierId The ID of the dossier
 * @param options Synthesis options
 * @returns The synthesized dossier
 */
export async function synthesizeResults(
  results: TaskResult[],
  query: string,
  refinedQuery: string,
  dossierId: string,
  options: SynthesisOptions = { format: 'all' }
): Promise<SynthesisResult> {
  try {
    // Filter out failed tasks
    const successfulResults = results.filter(r => r.success);
    
    // Generate an executive summary of all results
    const summaryPrompt = `
You are a strategic analyst tasked with synthesizing multiple research findings into a coherent executive summary.

Original query: "${query}"
Refined query: "${refinedQuery}"

Here are the findings from various analyses:
${successfulResults.map(r => `Task "${r.taskId}" output:\n${JSON.stringify(r.result, null, 2)}`).join('\n\n')}

Generate a concise executive summary (300-500 words) that integrates these findings and directly addresses the user's query.
Focus on key insights, patterns across analyses, and actionable recommendations.
`;

    const summary = await askGPT(summaryPrompt);
    
    // Generate a structured representation of the data
    const structurePrompt = `
You are an information architect tasked with organizing research findings into a coherent structure.

Original query: "${query}"
Refined query: "${refinedQuery}"

Here are the findings from various analyses:
${successfulResults.map(r => `Task "${r.taskId}" output:\n${JSON.stringify(r.result, null, 2)}`).join('\n\n')}

Create a JSON structure that organizes these findings into a logical hierarchy. The structure should include:
1. An executive summary section
2. Key findings organized by theme or domain
3. Detailed analyses for each major point
4. Recommendations and next steps

Return only the JSON structure without explanation.
`;

    const structure = await generateStructuredData<any>(structurePrompt);
    
    // Generate visualization suggestions
    const visualizationPrompt = `
You are a data visualization expert tasked with suggesting visualizations for research findings.

Original query: "${query}"
Refined query: "${refinedQuery}"

Here are the findings from various analyses:
${successfulResults.map(r => `Task "${r.taskId}" output:\n${JSON.stringify(r.result, null, 2)}`).join('\n\n')}

Suggest 3-5 visualizations that would effectively communicate key insights from these findings.
For each visualization, provide:
1. A title
2. The type of chart/graph
3. What data it should display
4. Why this visualization is effective for this data

Return a JSON array of visualization objects.
`;

    const visualizations = await generateStructuredData<any[]>(visualizationPrompt);
    
    // Generate interactive element suggestions
    const interactivePrompt = `
You are a UX designer tasked with suggesting interactive elements for a data dashboard.

Original query: "${query}"
Refined query: "${refinedQuery}"

Here are the findings from various analyses:
${successfulResults.map(r => `Task "${r.taskId}" output:\n${JSON.stringify(r.result, null, 2)}`).join('\n\n')}

Suggest 3-5 interactive elements that would enhance user engagement with these findings.
For each element, provide:
1. A title
2. The type of interactive element (e.g., slider, dropdown, toggle, etc.)
3. What data it should manipulate
4. How it enhances user understanding

Return a JSON array of interactive element objects.
`;

    const interactiveElements = await generateStructuredData<any[]>(interactivePrompt);
    
    // Update the dossier with the synthesized results
    await updateDossier(dossierId, {
      status: 'completed',
      results: [...(successfulResults.map(r => ({
        taskId: r.taskId,
        result: r.result
      })))],
      progress: 100
    });
    
    return {
      summary,
      structure,
      visualizations,
      interactiveElements,
      rawData: options.includeRawData ? successfulResults : [],
      format: options.format
    };
  } catch (error: any) {
    console.error('Error synthesizing results:', error);
    throw new Error(`Failed to synthesize results: ${error.message}`);
  }
}

/**
 * Generate code for a Streamlit dashboard based on the synthesis results
 * @param synthesis The synthesis results
 * @returns The Streamlit code
 */
export async function generateStreamlitDashboard(synthesis: SynthesisResult): Promise<string> {
  const prompt = `
You are an expert Python developer specializing in Streamlit dashboards.

Generate a complete, standalone Streamlit application that creates an interactive dashboard based on the following synthesis:

Summary: ${synthesis.summary}

Structure: ${JSON.stringify(synthesis.structure, null, 2)}

Visualizations: ${JSON.stringify(synthesis.visualizations, null, 2)}

Interactive Elements: ${JSON.stringify(synthesis.interactiveElements, null, 2)}

The Streamlit application should:
1. Have a clean, professional UI with a sidebar for navigation
2. Implement all the suggested visualizations using Plotly or Altair
3. Implement all the suggested interactive elements
4. Include the executive summary and all key findings
5. Be well-structured and follow best practices for Streamlit development
6. Include sample data that matches the structure of the real data

Return only the Python code for the Streamlit application, with no explanation.
`;

  return await askGPT(prompt);
}

/**
 * Generate code for a Next.js dashboard based on the synthesis results
 * @param synthesis The synthesis results
 * @returns The Next.js code
 */
export async function generateNextJsDashboard(synthesis: SynthesisResult): Promise<string> {
  const prompt = `
You are an expert Next.js developer specializing in interactive dashboards.

Generate a complete, standalone Next.js application that creates an interactive dashboard based on the following synthesis:

Summary: ${synthesis.summary}

Structure: ${JSON.stringify(synthesis.structure, null, 2)}

Visualizations: ${JSON.stringify(synthesis.visualizations, null, 2)}

Interactive Elements: ${JSON.stringify(synthesis.interactiveElements, null, 2)}

The Next.js application should:
1. Use Tailwind CSS for styling
2. Implement all the suggested visualizations using a library like Chart.js, D3.js, or React-Vis
3. Implement all the suggested interactive elements
4. Include the executive summary and all key findings
5. Be well-structured and follow best practices for Next.js development
6. Include sample data that matches the structure of the real data
7. Be responsive and work well on mobile devices

Return only the code for the Next.js application, with no explanation.
`;

  return await askGPT(prompt);
}

/**
 * Generate code for a PDF report based on the synthesis results
 * @param synthesis The synthesis results
 * @returns The PDF generation code
 */
export async function generatePdfReport(synthesis: SynthesisResult): Promise<string> {
  const prompt = `
You are an expert Python developer specializing in PDF report generation.

Generate a complete, standalone Python script that creates a professional PDF report based on the following synthesis:

Summary: ${synthesis.summary}

Structure: ${JSON.stringify(synthesis.structure, null, 2)}

Visualizations: ${JSON.stringify(synthesis.visualizations, null, 2)}

The Python script should:
1. Use a library like ReportLab or FPDF
2. Create a well-formatted PDF with a cover page, table of contents, and page numbers
3. Include all the visualizations as static images
4. Include the executive summary and all key findings
5. Be well-structured and follow best practices for PDF generation
6. Include sample data that matches the structure of the real data

Return only the Python code for generating the PDF, with no explanation.
`;

  return await askGPT(prompt);
}