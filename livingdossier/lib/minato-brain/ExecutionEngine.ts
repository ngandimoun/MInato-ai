//livingdossier/lib/minato-brain/ExecutionEngine.ts

import { PlaybookTask } from './PlaybookGenerator';
import { askGPT, generateStructuredData } from '../../services/llm/openai';
import { BrowserTool } from '../../services/tools-livings/BrowserTool';
import { addKnowledgeItem } from '../../services/database/knowledgeBase';
import { updateDossier as updateDossierFromDB, LivingDossier } from '../../services/database/living_dossier';
import { config } from '../../config/config';
import { executeTool } from '../../services/tools-livings/toolRegistry';
import { logger } from '../../memory-framework/config';

export interface TaskResult {
  taskId: string;
  success: boolean;
  result: any;
  error?: string;
}

/**
 * Execute an LLM task
 * @param task The task to execute
 * @param dossierId The ID of the dossier
 * @param previousResults The results of previous tasks
 * @returns The result of the task
 */
async function executeLLMTask(
  task: PlaybookTask,
  dossierId: string,
  previousResults: TaskResult[]
): Promise<TaskResult> {
  try {
    if (!task.prompt) {
      throw new Error('LLM task requires a prompt');
    }
    
    // Replace {all_task_outputs} with the results of previous tasks
    let prompt = task.prompt;
    if (prompt.includes('{all_task_outputs}')) {
      const allOutputs = previousResults
        .filter(r => r.success)
        .map(r => `Task "${r.taskId}" output:\n${JSON.stringify(r.result, null, 2)}`)
        .join('\n\n');
      
      prompt = prompt.replace('{all_task_outputs}', allOutputs);
    }
    
    // Execute the LLM task
    const result = await askGPT(prompt);
    
    // Add the result to the knowledge base
    await addKnowledgeItem({
      dossier_id: dossierId,
      title: `LLM Task: ${task.id}`,
      content: result,
      source: 'LLM',
      source_type: 'llm',
      metadata: {
        task_id: task.id,
        task_type: task.type,
        prompt
      }
    });
    
    return {
      taskId: task.id,
      success: true,
      result
    };
  } catch (error: any) {
    console.error(`Error executing LLM task ${task.id}:`, error);
    return {
      taskId: task.id,
      success: false,
      result: null,
      error: error.message
    };
  }
}

/**
 * Execute a browser task
 * @param task The task to execute
 * @param dossierId The ID of the dossier
 * @param previousResults The results of previous tasks
 * @returns The result of the task
 */
async function executeBrowserTask(
  task: PlaybookTask,
  dossierId: string,
  previousResults: TaskResult[]
): Promise<TaskResult> {
  try {
    if (!task.goal) {
      throw new Error('Browser task requires a goal');
    }
    
    // Execute the browser task
    const browserTool = new BrowserTool();
    const results = await browserTool.execute({
      operation: "run_raw_task",
      raw_task_description: task.goal,
      context: { dossierId }
    });
    
    return {
      taskId: task.id,
      success: true,
      result: results
    };
  } catch (error: any) {
    console.error(`Error executing browser task ${task.id}:`, error);
    return {
      taskId: task.id,
      success: false,
      result: null,
      error: error.message
    };
  }
}

/**
 * Execute an API task
 * @param task The task to execute
 * @param dossierId The ID of the dossier
 * @param previousResults The results of previous tasks
 * @returns The result of the task
 */
async function executeAPITask(
  task: PlaybookTask,
  dossierId: string,
  previousResults: TaskResult[]
): Promise<TaskResult> {
  try {
    if (!task.tool_name) {
      throw new Error('API task requires a tool_name');
    }
    
    if (!task.goal) {
      throw new Error('API task requires a goal');
    }
    
    // Check if the tool is available
    // Instead of checking hasToolAvailable, we'll try/catch the execution
    
    // Prepare the input for the tool
    const toolInput = {
      query: task.goal,
      userId: dossierId, // Use dossier ID as user ID for tracking
      context: {
        dossierId,
        taskId: task.id
      }
    };
    
    // Execute the tool
    const toolOutput = await executeTool(task.tool_name, toolInput);
    
    let result = toolOutput.result || JSON.stringify(toolOutput.structuredData);

    // Add the result to the knowledge base
    await addKnowledgeItem({
      dossier_id: dossierId,
      title: `API Task: ${task.id}`,
      content: result,
      source: task.tool_name,
      source_type: 'api',
      metadata: {
        task_id: task.id,
        task_type: task.type,
        tool_name: task.tool_name,
        goal: task.goal,
        structured_data: toolOutput.structuredData
      }
    });
    
    return {
      taskId: task.id,
      success: true,
      result
    };
  } catch (error: any) {
    console.error(`Error executing API task ${task.id}:`, error);
    return {
      taskId: task.id,
      success: false,
      result: null,
      error: error.message
    };
  }
}

/**
 * Execute a code execution task
 * @param task The task to execute
 * @param dossierId The ID of the dossier
 * @param previousResults The results of previous tasks
 * @returns The result of the task
 */
async function executeCodeTask(
  task: PlaybookTask,
  dossierId: string,
  previousResults: TaskResult[]
): Promise<TaskResult> {
  try {
    if (!task.runtime_environment) {
      throw new Error('Code execution task requires a runtime_environment');
    }
    
    if (!task.goal) {
      throw new Error('Code execution task requires a goal');
    }
    
    // Generate code using LLM
    const codePrompt = `
You are an expert ${task.runtime_environment} developer. 
Generate code to achieve the following goal:
${task.goal}

The code should be complete, self-contained, and ready to execute.
Only provide the code, no explanations or comments.
`;
    
    const code = await askGPT(codePrompt);
    
    // This is a placeholder - in a real implementation, you would execute the code in the appropriate runtime environment
    const result = `Code execution task for ${task.runtime_environment} executed with code:\n${code}`;
    
    // Add the result to the knowledge base
    await addKnowledgeItem({
      dossier_id: dossierId,
      title: `Code Execution Task: ${task.id}`,
      content: result,
      source: 'Code Execution',
      source_type: 'tool',
      metadata: {
        task_id: task.id,
        task_type: task.type,
        runtime_environment: task.runtime_environment,
        goal: task.goal,
        code
      }
    });
    
    return {
      taskId: task.id,
      success: true,
      result
    };
  } catch (error: any) {
    console.error(`Error executing code task ${task.id}:`, error);
    return {
      taskId: task.id,
      success: false,
      result: null,
      error: error.message
    };
  }
}

/**
 * Execute a project sandbox task
 * @param task The task to execute
 * @param dossierId The ID of the dossier
 * @param previousResults The results of previous tasks
 * @returns The result of the task
 */
async function executeProjectSandboxTask(
  task: PlaybookTask,
  dossierId: string,
  previousResults: TaskResult[]
): Promise<TaskResult> {
  try {
    if (!task.runtime_environment) {
      throw new Error('Project sandbox task requires a runtime_environment');
    }
    
    if (!task.goal) {
      throw new Error('Project sandbox task requires a goal');
    }
    
    // Generate code using LLM
    const codePrompt = `
You are an expert ${task.runtime_environment} developer specializing in data visualization and interactive applications.
Generate a complete, self-contained application to achieve the following goal:
${task.goal}

The application should be interactive, user-friendly, and visually appealing.
Include all necessary imports, setup, and code to run the application.
Only provide the code, no explanations or comments.
`;
    
    const code = await askGPT(codePrompt);
    
    // This is a placeholder - in a real implementation, you would deploy the application and return the URL
    const projectUrl = `https://example.com/projects/${dossierId}/${task.id}`;
    
    // Add the result to the knowledge base
    await addKnowledgeItem({
      dossier_id: dossierId,
      title: `Project Sandbox Task: ${task.id}`,
      content: `Project deployed at ${projectUrl}`,
      source: 'Project Sandbox',
      source_type: 'tool',
      metadata: {
        task_id: task.id,
        task_type: task.type,
        runtime_environment: task.runtime_environment,
        goal: task.goal,
        code,
        project_url: projectUrl
      }
    });
    
    return {
      taskId: task.id,
      success: true,
      result: {
        project_url: projectUrl,
        code
      }
    };
  } catch (error: any) {
    console.error(`Error executing project sandbox task ${task.id}:`, error);
    return {
      taskId: task.id,
      success: false,
      result: null,
      error: error.message
    };
  }
}

/**
 * Execute a task
 * @param task The task to execute
 * @param dossierId The ID of the dossier
 * @param previousResults The results of previous tasks
 * @returns The result of the task
 */
export async function executeTask(
  task: PlaybookTask,
  dossierId: string,
  previousResults: TaskResult[] = []
): Promise<TaskResult> {
  try {
    // Update the dossier status to processing
    await updateDossierFromDB(dossierId, {
      status: 'processing'
    });
    
    // Execute the task based on its type
    switch (task.type) {
      case 'llm_task':
        return await executeLLMTask(task, dossierId, previousResults);
      case 'browser_task':
        return await executeBrowserTask(task, dossierId, previousResults);
      case 'api_task':
        return await executeAPITask(task, dossierId, previousResults);
      case 'code_execution_task':
        return await executeCodeTask(task, dossierId, previousResults);
      case 'project_sandbox_task':
        return await executeProjectSandboxTask(task, dossierId, previousResults);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  } catch (error: any) {
    console.error(`Error executing task ${task.id}:`, error);
    return {
      taskId: task.id,
      success: false,
      result: null,
      error: error.message
    };
  }
}

/**
 * Generate a dynamic task based on a query for domains not covered by existing tasks
 * @param query The user query
 * @param domain The identified domain
 * @returns A dynamically generated task
 */
export async function generateDynamicTask(query: string, domain: string): Promise<PlaybookTask> {
  const prompt = `
Create a task definition for analyzing the following query in a domain that may not be covered by our predefined tasks:

Query: "${query}"
Domain: "${domain}"

Generate a task definition with the following structure:
{
  "id": "dynamic_task_[unique_identifier]",
  "description": "A clear description of what this task will do",
  "type": "llm",
  "prompt": "A detailed prompt that will guide an LLM to generate a comprehensive analysis of the query",
  "parameters": {}
}

The prompt should be comprehensive and designed to produce a detailed analysis of the topic, including:
1. Overview of the domain/field
2. Key concepts and terminology
3. Current trends and developments
4. Important metrics and frameworks
5. Challenges and opportunities
6. Relevant stakeholders and organizations
7. Future outlook

Make the task as specific as possible to the query while being adaptable enough to handle variations within the domain.
`;

  try {
    const taskDefinition = await generateStructuredData<PlaybookTask>(prompt);
    
    // Ensure the task has the necessary properties
    return {
      id: taskDefinition.id || `dynamic_task_${Date.now()}`,
      description: taskDefinition.description || `Dynamic analysis of ${domain}`,
      type: "llm",
      prompt: taskDefinition.prompt || `Analyze "${query}" in the context of ${domain}`,
      parameters: taskDefinition.parameters || {}
    };
  } catch (error) {
    console.error('Error generating dynamic task:', error);
    // Fallback to a simple task if generation fails
    return {
      id: `dynamic_task_${Date.now()}`,
      description: `Dynamic analysis of ${domain}`,
      type: "llm",
      prompt: `
Provide a comprehensive analysis of "${query}" in the domain of "${domain}".

Include:
1. Overview of the topic and its importance
2. Key concepts and terminology
3. Current state and trends
4. Important metrics and frameworks
5. Challenges and opportunities
6. Relevant stakeholders
7. Future outlook and recommendations

Be thorough, accurate, and provide actionable insights.
      `,
      parameters: {}
    };
  }
}

/**
 * Execute a zero-shot task for queries that don't match existing task definitions
 * @param query The user query
 * @param dossierId The ID of the dossier
 * @returns The result of the task
 */
export async function executeZeroShotTask(query: string, dossierId: string): Promise<TaskResult> {
  try {
    const taskId = `zero_shot_${Date.now()}`;
    
    const prompt = `
You are tasked with creating a comprehensive analysis on a topic that doesn't fit neatly into our predefined categories.

Query: "${query}"

Please provide a detailed analysis that includes:
1. Identification of the domain/field this query belongs to
2. Overview of the topic and its context
3. Key concepts, terminology, and frameworks relevant to understanding this topic
4. Current state of knowledge and developments in this area
5. Important stakeholders, organizations, or individuals in this field
6. Challenges, opportunities, and future outlook
7. Relevant metrics, data points, or quantitative aspects
8. Recommendations or insights based on the analysis

Your analysis should be structured, thorough, and provide valuable insights even without predefined templates for this specific domain.
`;

    // Execute the zero-shot task
    const result = await askGPT(prompt);
    
    // Add the result to the knowledge base
    await addKnowledgeItem({
      dossier_id: dossierId,
      title: `Zero-Shot Analysis: ${query}`,
      content: result,
      source: 'LLM',
      source_type: 'llm',
      metadata: {
        task_id: taskId,
        task_type: 'llm',
        prompt,
        query
      }
    });
    
    return {
      taskId,
      success: true,
      result
    };
  } catch (error: any) {
    console.error(`Error executing zero-shot task:`, error);
    return {
      taskId: `zero_shot_${Date.now()}`,
      success: false,
      result: null,
      error: error.message
    };
  }
}

/**
 * Execute a playbook of tasks
 * @param tasks The tasks to execute
 * @param dossierId The ID of the dossier
 * @returns The results of the tasks
 */
export async function executePlaybook(
  tasks: PlaybookTask[],
  dossierId: string
): Promise<TaskResult[]> {
  const results: TaskResult[] = [];
  
  // Execute each task in sequence
  for (const task of tasks) {
    const result = await executeTask(task, dossierId, results);
    results.push(result);
    
    // If a task fails, log the error but continue with the next task
    if (!result.success) {
      console.error(`Task ${task.id} failed: ${result.error}`);
    }
  }
  
  // Update the dossier with the results
  await updateDossierFromDB(dossierId, {
    status: 'completed',
    results: results
  });
  
  return results;
}

/**
 * Update a living dossier with new data
 * @param dossierId The ID of the dossier to update
 * @param data The data to update the dossier with
 * @returns The updated dossier
 */
async function updateDossier(dossierId: string, data: any): Promise<LivingDossier> {
  try {
    // Update the dossier with the new data
    const updatedDossier = await updateDossierFromDB(dossierId, {
      title: data.title,
      status: data.status,
      progress: data.progress,
      error: data.error,
      results: data.results
    });
    
    return updatedDossier;
  } catch (error) {
    logger.error(`Failed to update dossier: ${error}`);
    throw error;
  }
}

//The "Factory Floor Manager"