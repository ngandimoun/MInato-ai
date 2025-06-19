//livingdossier/services/tools-livings/BrowserTool.ts


import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { generateStructuredJson } from "../providers/llm_clients";
import { addKnowledgeItem } from '../database/knowledgeBase';
// Simulating access to other Minato tools for orchestration logic
import { SerperWebSearchTool } from './Serper_WebSearchTool'; 
// SandboxWebSearchTool is a Python module, not a TypeScript class

type BrowserOperation = "find_leads" | "investigate_entity" | "run_raw_task";
type LeadPlatform = "LinkedIn" | "Twitter" | "News & Company Websites" | "Reddit" | "TikTok" | "Hacker News" | "Sports News & Journalists" | "Niche Communities & Forums";
type TaskStatus = "created" | "running" | "finished" | "stopped" | "paused" | "failed";

interface BrowserToolInput extends ToolInput {
  operation: BrowserOperation;
  // Parameters for 'find_leads'
  lead_platform?: LeadPlatform;
  search_topic?: string; // e.g., "AI startups that recently got funding"
  lead_criteria?: string; // e.g., "hiring for a 'Head of Growth', or 'looking for a new cafe spot'"
  
  // Parameters for 'investigate_entity'
  target_url?: string; // A specific URL for a company website or social media profile
  information_to_extract?: string; // e.g., "Key executives, recent announcements, and contact email"

  // Parameters for 'run_raw_task'
  raw_task_description?: string;
  structured_output_schema?: string;
}

// Interfaces for API responses
interface RunTaskResponse {
  id: string;
  live_url: string;
  status: TaskStatus;
}

interface TaskDetailsResponse {
  id: string;
  status: TaskStatus;
  output: string | any; // Output can be a string or structured JSON
  live_url: string;
  steps: { description: string; screenshot_url?: string }[];
}

export class BrowserTool extends BaseTool {
  name = "BrowserTool";
  description = "A powerful web intelligence agent that performs high-level, goal-oriented tasks. It can generate leads from a wide variety of platforms (including social media, news, and niche forums), perform deep-dive investigations of websites, and orchestrate complex web automation to achieve its goals.";
  argsSchema = {
    type: "object" as const,
    properties: {
      operation: {
        type: "string" as const,
        description: "The primary goal-oriented operation to perform.",
        enum: ["find_leads", "investigate_entity", "run_raw_task"],
      } as OpenAIToolParameterProperties,
      lead_platform: {
        type: ["string", "null"] as const,
        description: "The platform or environment to search for leads on. Required for 'find_leads'.",
        enum: ["LinkedIn", "Twitter", "News & Company Websites", "Reddit", "TikTok", "Hacker News", "Sports News & Journalists", "Niche Communities & Forums"],
      } as OpenAIToolParameterProperties,
      search_topic: {
        type: ["string", "null"] as const,
        description: "A description of the target audience, companies, or niche to find. Example: 'local coffee shops in Brooklyn' or 'early-stage SaaS companies'.",
      } as OpenAIToolParameterProperties,
      lead_criteria: {
        type: ["string", "null"] as const,
        description: "Specific criteria the lead must meet. Example: 'complaining about their current software', 'looking for a striker', 'has mentioned \"AI automation\" in the last month'.",
      } as OpenAIToolParameterProperties,
      target_url: {
        type: ["string", "null"] as const,
        description: "The specific URL of a company, article, or social profile to investigate.",
      } as OpenAIToolParameterProperties,
      information_to_extract: {
          type: ["string", "null"] as const,
          description: "A natural language description of the specific data points to find and extract from the target URL."
      } as OpenAIToolParameterProperties,
      raw_task_description: {
          type: ["string", "null"] as const,
          description: "For advanced use: a detailed, low-level instruction for the browser automation engine. Use for simple tasks not covered by other operations."
      } as OpenAIToolParameterProperties,
    },
    required: ["operation"],
    additionalProperties: false as false,
  };

  cacheTTLSeconds = 0; // Tasks are dynamic, so no caching
  private readonly API_KEY: string;
  private readonly API_BASE = "https://api.browser-use.com/api/v1";
  private readonly USER_AGENT: string;
  // Instantiate other tools for internal orchestration
  private readonly searcher: SerperWebSearchTool;

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys?.browserUse || "";
    this.USER_AGENT = `MinatoAI-Dossier/1.0 (${appConfig.app?.url || ''})`;
    if (!this.API_KEY) {
      this.log("error", "Browser Use API Key (BROWSER_USE_API_KEY) is missing. Tool will fail.");
    }
    // In a real DI system, these would be injected. We simulate it here.
    this.searcher = new SerperWebSearchTool();
  }

  // This internal method runs the browser automation task and waits for it to finish.
  private async _runAndWaitForTask(task_description: string, dossierId: string, structured_output_schema?: any): Promise<TaskDetailsResponse> {
      const payload: any = { task: task_description };
      if (structured_output_schema) {
          payload.structured_output_json = JSON.stringify(structured_output_schema);
      }
      
      const startResponse = await fetch(`${this.API_BASE}/run-task`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.API_KEY}`, 'Content-Type': 'application/json', 'User-Agent': this.USER_AGENT },
          body: JSON.stringify(payload),
      });

      if (!startResponse.ok) throw new Error(`Browser API Error on start: ${await startResponse.text()}`);
      const startData: RunTaskResponse = await startResponse.json() as RunTaskResponse;

      // Polling logic to wait for the task to complete
      let attempts = 0;
      const maxAttempts = 45; // 7.5 minutes max wait (45 * 10s) for complex tasks
      while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10 seconds
          
          const statusResponse = await fetch(`${this.API_BASE}/task/${startData.id}`, {
              headers: { 'Authorization': `Bearer ${this.API_KEY}`, 'User-Agent': this.USER_AGENT },
          });

          if (!statusResponse.ok) continue; // Retry on transient errors
          
          const statusData: TaskDetailsResponse = await statusResponse.json() as TaskDetailsResponse;
          if (['finished', 'failed', 'stopped'].includes(statusData.status)) {
              return statusData;
          }
          attempts++;
      }
      throw new Error(`Task ${startData.id} did not complete within the time limit.`);
  }

  // DYNAMIC STRATEGY GENERATION
  private async _generateLeadGenerationStrategy(platform: LeadPlatform, topic: string, criteria: string): Promise<{ task_description: string }> {
      const prompt = `
You are a world-class intelligence analyst and lead generation expert. Your task is to create a precise, step-by-step, natural language instruction set (a 'task description') for an AI browser automation tool. The tool can search, click, scroll, extract text, and navigate websites.

The goal is to find leads matching specific criteria on a given platform. Be creative and think like an expert human analyst performing the task manually.

Platform: "${platform}"
Topic: "${topic}"
Criteria: "${criteria}"

Here are examples of excellent task descriptions:

- For TikTok & local business: "Go to TikTok. Use the search bar to find videos related to '${topic}'. Filter by 'Top' or 'Most Recent'. For up to 10 relevant videos, navigate to the creator's profile page. Scrutinize their bio for any links to a business website, an email address, or other contact info. Extract the username, the profile URL, and any contact information you discover. Focus on accounts that appear to be small businesses, not large corporations."
- For Reddit & niche finding: "Go to Reddit. First, use the main search to find relevant subreddits for '${topic}'. From the search results, pick the top 3 most active and relevant communities. For each of these subreddits, perform a new search within that community for posts or comments that mention terms related to '${criteria}'. For each of the top 5 matching posts/comments, extract the username, a direct permalink to their post or comment, and the full text of their message for context."
- For Hacker News & tech trends: "Go to news.ycombinator.com. Use its Algolia-powered search. Search for stories about '${topic}' that also meet the criteria '${criteria}'. Filter results to the 'past year'. For the top 5 most relevant stories, extract the story title, the direct URL to the article, and the URL for the Hacker News comments thread."
- For Sports News & Journalists (Football Transfers): "First, perform a web search to identify 'the top 5 most reliable football transfer news journalists on Twitter'. After identifying them, go to Twitter (X.com) and visit each journalist's profile page one by one. On each profile, carefully scroll through their timeline, loading more tweets as you go, to cover at least the last 7 days of activity. Search for any tweets that specifically mention players or teams related to '${topic}' and the context '${criteria}'. For any matching tweet, extract the journalist's name, the full text of the tweet, and the direct link to that tweet."

Now, generate the optimal task description for the user's request.
RESPOND ONLY WITH A SINGLE JSON OBJECT containing one key: "task_description".
      `;
      const schema = {
          type: "object",
          properties: {
              task_description: { type: "string" }
          },
          required: ["task_description"]
      };

      const result = await generateStructuredJson<{ task_description: string }>(prompt, `Platform: ${platform}, Topic: ${topic}, Criteria: ${criteria}`, schema, { model: "LeadGenStrategy" });
      if (!result || !result.task_description) {
          throw new Error("Failed to generate a dynamic lead generation strategy.");
      }
      return result;
  }
  
  async execute(input: BrowserToolInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { operation } = input;
    const dossierId = input.context?.dossierId as string;

    if (!this.API_KEY) {
      return { error: "BrowserTool is not configured.", result: "Sorry, Minato cannot perform browser tasks right now." };
    }
    if (!dossierId) {
        return { error: "Dossier context is missing.", result: "I need to be working on a dossier to save my findings." };
    }

    try {
      switch (operation) {
        case "find_leads":
          return this.findLeads(input, dossierId);
        case "investigate_entity":
          return this.investigateEntity(input, dossierId);
        case "run_raw_task":
           if (!input.raw_task_description) return { error: "Missing raw_task_description for this operation." };
           const taskResult = await this._runAndWaitForTask(input.raw_task_description, dossierId, input.structured_output_schema);
           return { result: `Raw task completed with status: ${taskResult.status}`, structuredData: taskResult };
        default:
          return { error: "Invalid operation", result: "I'm not sure which browser action you want to perform." };
      }
    } catch (error: any)      {
      this.log("error", "[BrowserTool] Execution failed:", error);
      return { error: `BrowserTool orchestration failed: ${error.message}`, result: "Sorry, I encountered an error while performing the browser task." };
    }
  }

  private async findLeads(input: BrowserToolInput, dossierId: string): Promise<ToolOutput> {
      const { lead_platform, search_topic, lead_criteria } = input;
      if (!lead_platform || !search_topic || !lead_criteria) {
          return { error: "Missing parameters for find_leads operation. I need a platform, a topic, and criteria." };
      }
      
      const strategy = await this._generateLeadGenerationStrategy(lead_platform, search_topic, lead_criteria);
      const task_description = strategy.task_description;
      
      const output_schema = {
          type: "array",
          items: {
              type: "object",
              properties: {
                  name: { type: "string", description: "Full name of the person or company." },
                  profile_url: { type: "string", description: "Direct URL to their profile, website, post, or article." },
                  relevance_reason: { type: "string", description: "A brief explanation of why this lead matches the criteria, based on the task." },
                  extracted_data: { type: "string", description: "Key data points extracted, like job title, bio, tweet text, or post content." }
              },
              required: ["name", "profile_url", "relevance_reason"]
          }
      };
      
      this.log("info", `Executing dynamically generated strategy for lead generation on ${lead_platform}.`);
      const taskResult = await this._runAndWaitForTask(task_description, dossierId, output_schema);

      if (taskResult.status === 'finished' && taskResult.output) {
          const leads = Array.isArray(taskResult.output) ? taskResult.output : (typeof taskResult.output === 'string' ? JSON.parse(taskResult.output) : []);
          
          if(leads.length === 0) {
              return { result: `The browser task finished successfully but did not find any leads matching the criteria on ${lead_platform}. The underlying data might be sparse.` };
          }

          for (const lead of leads) {
              await addKnowledgeItem({
                  dossier_id: dossierId,
                  title: `Lead Found: ${lead.name}`,
                  content: `Platform: ${lead_platform}\nCriteria: ${lead_criteria}\nReason: ${lead.relevance_reason}\nData: ${lead.extracted_data}`,
                  source: lead.profile_url,
                  source_type: 'tool',
                  metadata: { lead_platform, ...lead }
              });
          }
          const message = `I found ${leads.length} potential leads on ${lead_platform} and saved them to the dossier.`;
          return { result: message, structuredData: leads };
      }
      
      return { error: "Lead generation task failed or returned no output.", result: `The browser task failed. Status: ${taskResult.status}. It may have timed out or encountered an issue on the target website.` };
  }

  private async investigateEntity(input: BrowserToolInput, dossierId: string): Promise<ToolOutput> {
      const { target_url, information_to_extract } = input;
      if (!target_url || !information_to_extract) {
          return { error: "Missing parameters for investigate_entity operation." };
      }

      const output_schema = {
          type: "object",
          properties: {
              entity_name: { type: "string", description: "The name of the company or person being investigated." },
              summary: { type: "string", description: "A concise summary of the entity based on the page content." },
              extracted_points: { 
                  type: "array",
                  description: "A list of specific data points found that match the user's request.",
                  items: { type: "string" }
              }
          },
          required: ["entity_name", "summary", "extracted_points"]
      };

      const task_description = `Go to the URL ${target_url}. Thoroughly analyze the page to find information related to: "${information_to_extract}". Extract all relevant details into the structured output format.`;
      
      this.log("info", `Running browser task for investigation: ${task_description}`);
      const taskResult = await this._runAndWaitForTask(task_description, dossierId, output_schema);
      
      if (taskResult.status === 'finished' && taskResult.output) {
          const investigationData = typeof taskResult.output === 'string' ? JSON.parse(taskResult.output) : taskResult.output;
          
          await addKnowledgeItem({
              dossier_id: dossierId,
              title: `Investigation Summary: ${investigationData.entity_name}`,
              content: `${investigationData.summary}\n\nKey Findings:\n- ${investigationData.extracted_points.join("\n- ")}`,
              source: target_url,
              source_type: 'tool',
              metadata: { request: information_to_extract }
          });

          const message = `I've completed the investigation of ${investigationData.entity_name} and saved a summary to the dossier.`;
          return { result: message, structuredData: investigationData };
      }

      return { error: "Investigation task failed or returned no output.", result: `The browser task failed. Status: ${taskResult.status}` };
  }
}