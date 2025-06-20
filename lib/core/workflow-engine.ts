// FILE: lib/core/workflow-engine.ts
import {
WorkflowDefinition,
WorkflowStep,
ToolCallStep,
LLMProcessStep,
ClarificationQueryStep,
DynamicWorkflowPlan,
WorkflowState,
ChatMessage,
AnyToolStructuredData,
OpenAIPlanningModel,
OpenAILLMFast,
OpenAILLMBalanced,
UserState,
OrchestratorResponse,
ToolOutput,
} from "@/lib/types/index";
import { BaseTool, ToolInput, OpenAIToolParameterProperties } from "@/lib/tools/base-tool";
import {
generateStructuredJson,
generateResponseWithIntent,
} from "@/lib/providers/llm_clients";
import { logger } from "../../memory-framework/config";
import { appConfig, injectPromptVariables, featureFlags } from "@/lib/config";
import { TOOL_ROUTER_PROMPT_TEMPLATE } from "@/lib/prompts";
import OpenAI from "openai";
import { getProperty } from "dot-prop";
import { CompletionUsage } from "openai/resources";
import { enhanceUserMemoryContext } from "./personalization";
// Comment out the problematic import for now as it seems to be missing
// import { processTextMessageWithPersonalization } from "./role-based-responses";
import { CompanionCoreMemory } from "@/memory-framework/core/CompanionCoreMemory";

// Default values for configuration
const WORKFLOW_MAX_TOOLS_PER_TURN = 3;
const DEFAULT_LLM_STEP_MODEL: OpenAILLMFast = appConfig.llm.extractionModel || "gpt-4.1-nano-2025-04-14";
export const DYNAMIC_WORKFLOW_DESIGN_MODEL: OpenAIPlanningModel | OpenAILLMBalanced = appConfig.llm.chatModel || "gpt-4o-2024-08-06";

type WorkflowStatus = "pending" | "running" | "waiting_for_user" | "completed" | "failed" | "paused_for_continuation";

interface WorkflowStateWithPartial extends Omit<WorkflowState, 'status'> {
    isPartialPlan?: boolean;
    continuationSummary?: string | null;
    fullPlanGoal?: string;
    status: WorkflowStatus;
    dynamicPlan: DynamicWorkflowPlanWithPartial | null;
    variables: Record<string, any>;
    currentStepIndex: number;
    lastUserInput: string;
    lastToolOutput?: ToolOutput | null;
}

interface DynamicWorkflowPlanWithPartial extends DynamicWorkflowPlan {
    is_partial_plan: boolean;
    continuation_summary: string | null;
    goal: string;
    reasoning: string;
    steps: WorkflowStep[];
}

export interface WorkflowResponse {
    responseText: string | null;
    structuredData: AnyToolStructuredData | null;
    workflowFeedback: OrchestratorResponse["workflowFeedback"];
    error?: string | null;
    isComplete: boolean;
    isPartialPlan?: boolean;
    continuationSummary?: string | null;
    clarificationQuestion?: string | null;
    llmUsage: OpenAI.CompletionUsage | null;
    intentType?: string | null;
    ttsInstructions?: string | null;
    variables?: Record<string, any>;
}

function summarizeChatHistoryForWorkflow(history: ChatMessage[], maxLength: number = 300): string {
if (!history || history.length === 0) return "No recent history.";
return history.slice(-3).map(m => {
let contentPreview = "";
if (typeof m.content === 'string') {
contentPreview = m.content.substring(0, 50) + (m.content.length > 50 ? "..." : "");
} else if (Array.isArray(m.content)) {
const textPart = m.content.find(p => p.type === 'text')?.text;
contentPreview = textPart ? textPart.substring(0, 40) + (textPart.length > 40 ? "..." : "") : "[multimodal]";
}
return `${m.role}: ${contentPreview || "[no text content]"}`;
}).join("\n").substring(0, maxLength);
}
function summarizeUserStateForWorkflow(userState: UserState | null, maxLength: number = 200): string {
if (!userState) return "No user state.";
const parts: string[] = [];
if (userState.user_first_name) parts.push(`Name: ${userState.user_first_name}`);
if (userState.preferred_locale) parts.push(`Locale: ${userState.preferred_locale}`);
if (userState.latitude && userState.longitude) parts.push(`Loc: ~${userState.latitude.toFixed(1)},${userState.longitude.toFixed(1)}`);
if (userState.timezone) parts.push(`TZ: ${userState.timezone}`);
if (userState.active_persona_id) parts.push(`Persona: ${userState.active_persona_id}`);
const personaTraits = (userState as any)?.active_persona_traits?.join(', ') || 'helpful, friendly';
parts.push(`Traits: ${personaTraits}`);
return parts.join(" | ").substring(0, maxLength) || "Basic user state.";
}
const WORKFLOW_LLM_PROMPT_TEMPLATES: Record<string, string> = {
summarizeToolResults: "Synthesize these tool outputs into a brief summary for {userName}: {toolOutputVar}",
};
function autoParallelizeWorkflowSteps(stepsInBatch: WorkflowStep[], variables: Record<string, any>): WorkflowStep[] {
let i = 0;
const batchSize = stepsInBatch.length;
const stepsCopy = [...stepsInBatch];
while (i < batchSize) {
const currentStep = stepsCopy[i];
if (
currentStep.type === "tool_call" &&
(!(currentStep as ToolCallStep).depends_on_var ||
getProperty(variables, (currentStep as ToolCallStep).depends_on_var || "") !== undefined)
) {
(stepsCopy[i] as ToolCallStep).parallel = true;
let j = i + 1;
while (
j < batchSize &&
stepsCopy[j].type === "tool_call" &&
(!(stepsCopy[j] as ToolCallStep).depends_on_var ||
getProperty(variables, (stepsCopy[j] as ToolCallStep).depends_on_var || "") !== undefined)
) {
(stepsCopy[j] as ToolCallStep).parallel = true;
j++;
}
i = j;
} else {
if (currentStep.type === "tool_call") {
(stepsCopy[i] as ToolCallStep).parallel = false;
}
i++;
}
}
return stepsCopy;
}
export class WorkflowEngine {
    private toolRegistry: { [key: string]: BaseTool };
    private activeWorkflows: Map<string, WorkflowStateWithPartial>;
    private readonly logger = logger;
    private memoryFramework?: CompanionCoreMemory;

    constructor(toolRegistry: { [key: string]: BaseTool }, memoryFramework?: CompanionCoreMemory) {
        this.toolRegistry = toolRegistry;
        this.activeWorkflows = new Map<string, WorkflowStateWithPartial>();
        this.memoryFramework = memoryFramework;
        this.logger.info(`[WorkflowEngine] Initialized with ${Object.keys(this.toolRegistry).length} tools.`);
    }

    private getLogPrefix(userId: string, sessionId: string): string {
        return `[WF Engine Exec User:${userId.substring(0,8)} Sess:${sessionId.substring(0,6)}]`;
    }

    public async selectAndPlanWorkflow( userQuery: string, userId: string, history: ChatMessage[], userName: string, userState: UserState | null ): Promise<{ plan: DynamicWorkflowPlan | null; clarificationQuestion?: string | null; actionType: "generate_dynamic_workflow" | "request_clarification" | "no_workflow_needed" | "error"; isPartialPlan?: boolean; continuationSummary?: string | null; llmUsage?: CompletionUsage | null; error?: string | null; }> {
        const logPrefix = `[WF SelectAndPlan User:${userId.substring(0,8)}] Query:"${userQuery.substring(0,30)}..."`;
        this.logger.info(`${logPrefix} Using LLM for dynamic workflow planning (Model: ${DYNAMIC_WORKFLOW_DESIGN_MODEL}).`);
        const enhancedToolsForPlanning = Object.values(this.toolRegistry)
          .filter(t => (t as any).enabled !== false)
          .map(t => {
            const argsSchemaObj = t.argsSchema as { properties?: Record<string, OpenAIToolParameterProperties>; required?: string[] };
            const args = argsSchemaObj.properties ? Object.keys(argsSchemaObj.properties) : [];
            const reqArgs = argsSchemaObj.required || [];
            const argSummary = args.map(arg => {
              let enumNote = '';
              if (argsSchemaObj.properties && argsSchemaObj.properties[arg] && argsSchemaObj.properties[arg].enum) {
                enumNote = ` (enum: ${argsSchemaObj.properties[arg].enum.join(', ')})`;
              }
              return `${arg}${reqArgs.includes(arg) ? '*' : ''}${enumNote}`;
            }).join(', ');
            let extraNote = '';
            if (t.name === 'WebSearchTool' && argsSchemaObj.properties && argsSchemaObj.properties['mode'] && argsSchemaObj.properties['mode'].enum) {
              extraNote += `\n  NOTE: Always provide a value for 'mode'. If unsure, use '${argsSchemaObj.properties['mode'].enum[0]}'.`;
            }
            return `- ${t.name}: ${t.description.substring(0,100)}... Required arguments: ${reqArgs.length > 0 ? reqArgs.join(', ') : 'None'}${argSummary ? ' | Args: ' + argSummary : ''}${extraNote}`;
          }).join("\n");
        const language = userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en";
        const personaContext: Record<string, any> = {
        userPersona: userState?.active_persona_id || 'Default Minato Persona',
        personaTraits: (userState as any)?.active_persona_traits?.join(', ') || 'helpful, friendly',
        preferredTools: (userState as any)?.active_persona_preferredTools?.join(', ') || 'any available',
        avoidTools: (userState as any)?.active_persona_avoidTools?.join(', ') || 'none specified',
        style: (userState as any)?.active_persona_style || 'conversational',
        tone: (userState as any)?.active_persona_tone || 'neutral and helpful',
        };
        const canonicalNameInstruction = `IMPORTANT: When specifying a tool in your plan, ALWAYS use the exact canonical tool name as shown in the available_tools_for_planning list. DO NOT invent, abbreviate, or use variants/aliases. Only use the exact name (case-sensitive) from the list.\n\nIMPORTANT: For each tool, you MUST provide ALL required arguments as specified below. Do NOT omit any required fields. If a field is an enum, always provide a valid value.\n\nExamples:\n✅ Correct: { tool_name: "WebSearchTool", toolArgs: { query: "cheap flights to Paris", mode: "product_search" } }\n❌ Incorrect: { tool_name: "WebSearchTool", toolArgs: { query: "latest news" } } // missing 'mode'\n✅ Correct: { tool_name: "NewsAggregatorTool", toolArgs: { query: "AI research", sources: "all" } }\n❌ Incorrect: { tool_name: "NewsAggregatorTool", toolArgs: { query: "AI research" } } // missing 'sources'\n\nRepeat: DO NOT invent, abbreviate, or use variants/aliases. ALWAYS provide all required arguments. NEVER omit required fields.`;
        const availableToolsSection = `\nIMPORTANT: USE ONLY THE EXACT TOOL NAMES BELOW. DO NOT INVENT OR ABBREVIATE.\n\n${enhancedToolsForPlanning}\n\n${canonicalNameInstruction}\n`;
        const injectedPrompt = injectPromptVariables(TOOL_ROUTER_PROMPT_TEMPLATE, { 
            userQuery, 
            userName, 
            conversationHistorySummary: summarizeChatHistoryForWorkflow(history), 
            userStateSummary: summarizeUserStateForWorkflow(userState), 
            available_tools_for_planning: availableToolsSection,
            language, 
            ...personaContext 
        });
        const llmPlannerSchema = {
        type: "object" as const,
        properties: {
            action_type: { type: "string" as const, enum: ["generate_dynamic_workflow", "request_clarification", "no_workflow_needed"] },
            plan: {
            type: ["object", "null"] as const,
            properties: {
                goal: { type: "string" as const, description: "User's overall multi-turn objective, or immediate if simple. Max 150 chars." },
                reasoning: { type: "string" as const, description: "Brief rationale for this immediate plan. Max 100 chars." },
                steps: {
                type: "array" as const,
                items: {
                    type: "object" as const,
                    properties: {
                    type: { type: "string" as const, enum: ["tool_call", "llm_process", "clarification_query"], description: "Step type."},
                    toolName: { type: ["string", "null"] as const, description: "Tool name if type is 'tool_call'." },
                    toolArgs: {
                        type: ["object", "null"] as const,
                        properties: {},
                        additionalProperties: true,
                        description: "Args for tool_call. Must be a well-defined JSON object based on the tool's requirements."
                    } as OpenAIToolParameterProperties,
                    description: { type: "string" as const, description: "User-facing step description. Max 70 chars." },
                    outputVar: { type: "string" as const, description: "Variable name for step output." },
                    parallel: { type: ["boolean", "null"] as const, description: "True if step can run in parallel. Default false." },
                    depends_on_var: { type: ["string", "null"] as const, description: "OutputVar of a PREVIOUS step this step depends on." },
                    customPrompt: { type: ["string", "null"] as const, description: "Custom prompt if type is 'llm_process'." },
                    promptTemplateKey: { type: ["string", "null"] as const, description: "Key for predefined prompt if 'llm_process'." },
                    inputVars: { type: ["array", "null"] as const, items: { type: "string" as const }, description: "Input vars for 'llm_process'." },
                    outputSchemaName: { type: ["string", "null"] as const, description: "Schema name if 'llm_process' has structured output." },
                    outputSchema: { type: ["object", "null"] as const, additionalProperties: true, description: "JSON schema if 'llm_process' has structured output." },
                    questionToUser: { type: ["string", "null"] as const, description: "Question for user if 'clarification_query'." },
                    expectedResponseVar: { type: ["string", "null"] as const, description: "Var for user's answer if 'clarification_query'." },
                    reason: { type: ["string", "null"] as const, description: "Brief reason for choosing this tool step. Max 50 chars." } // Added reason
                    },
                    required: [ // Ensure all properties that LLM is asked to provide are listed here or handled as truly optional (nullable in schema)
                    "type", "description", "outputVar",
                    "toolName", "toolArgs", "reason", // Added reason to required
                    "customPrompt", "promptTemplateKey", "inputVars", "outputSchemaName",
                    "outputSchema", "questionToUser", "expectedResponseVar", "parallel",
                    "depends_on_var"
                    ],
                    additionalProperties: false,
                },
                maxItems: WORKFLOW_MAX_TOOLS_PER_TURN,
                },
            is_partial_plan: { type: "boolean" as const, description: "True if this plan is part of a larger goal." },
            continuation_summary: { type: ["string", "null"] as const, description: "If partial, brief summary of next steps. Max 100 chars." }
            },
            required: ["goal", "reasoning", "steps", "is_partial_plan", "continuation_summary"],
            additionalProperties: false,
            },
            clarification_question: { type: ["string", "null"] as const, description: "Question for user if action_type is 'request_clarification'. Max 150 chars." },
            reasoning: { type: "string" as const, description: "Reasoning for the overall action_type decision. Max 100 chars." }
        },
        required: ["action_type", "reasoning", "plan", "clarification_question"], // Added plan and clarification_question here as they can be null from LLM
        additionalProperties: false,
        };
        const schemaNameForLLMPlanner = "minato_dynamic_workflow_planner_v19_full_strict";
        const llmChoiceResult = await generateStructuredJson<any>( injectedPrompt, "Based on the user query and context, decide the immediate action plan using the provided schemas.", llmPlannerSchema, schemaNameForLLMPlanner, [], DYNAMIC_WORKFLOW_DESIGN_MODEL as string, userId );
        const plannerLlmUsage = (llmChoiceResult as any).usage as CompletionUsage | undefined;
        if ("error" in llmChoiceResult || !llmChoiceResult || !llmChoiceResult.action_type) {
        const errorMsg = (llmChoiceResult as any)?.error || "Invalid response structure from planner";
        this.logger.error(`${logPrefix} LLM planner failed: ${errorMsg}. Raw: ${JSON.stringify(llmChoiceResult).substring(0, 500)}`);
        return { plan: null, actionType: "error", llmUsage: plannerLlmUsage, error: errorMsg };
        }
        this.logger.debug(`${logPrefix} LLM planner decision: ${JSON.stringify(llmChoiceResult, null, 2)}`);
        const plan = llmChoiceResult.plan as DynamicWorkflowPlanWithPartial | null; // Can be null if action_type is not 'generate_dynamic_workflow'
        if (plan && plan.steps) {
        plan.steps = plan.steps.filter(step => {
            if (!step || typeof step.type !== 'string' || typeof step.description !== 'string') return false;
            if (step.type === 'tool_call') {
                return typeof (step as ToolCallStep).toolName === 'string' &&
                    (step as ToolCallStep).toolName.trim() !== '' &&
                    typeof (step as ToolCallStep).outputVar === 'string';
            }
            if (step.type === 'llm_process') {
                return typeof (step as LLMProcessStep).outputVar === 'string';
            }
            if (step.type === 'clarification_query') {
                return typeof (step as ClarificationQueryStep).questionToUser === 'string' &&
                    typeof (step as ClarificationQueryStep).expectedResponseVar === 'string';
            }
            return false;
        });
        if (plan.steps.some(step => step.type === 'tool_call' && (!step.toolName || typeof step.toolName !== 'string'))) {
            this.logger.error(`${logPrefix} Planner returned a tool_call step without a valid toolName.`);
            return { plan: null, actionType: "error", error: "Planner created an invalid tool_call step (missing toolName).", llmUsage: plannerLlmUsage };
        }
        }
        if (plan && Array.isArray(plan.steps) && plan.steps.length > WORKFLOW_MAX_TOOLS_PER_TURN) {
            this.logger.warn(`${logPrefix} LLM planner returned ${plan.steps.length} steps, exceeding max ${WORKFLOW_MAX_TOOLS_PER_TURN}. Truncating.`);
            plan.steps = plan.steps.slice(0, WORKFLOW_MAX_TOOLS_PER_TURN);
            if (!(plan as DynamicWorkflowPlanWithPartial).is_partial_plan) (plan as DynamicWorkflowPlanWithPartial).is_partial_plan = true;
            if (!(plan as DynamicWorkflowPlanWithPartial).continuation_summary) (plan as DynamicWorkflowPlanWithPartial).continuation_summary = "Minato can explore this further if you'd like.";
        }
        return {
        plan: plan,
        clarificationQuestion: llmChoiceResult.clarification_question || null,
        actionType: llmChoiceResult.action_type,
        isPartialPlan: (plan as DynamicWorkflowPlanWithPartial)?.is_partial_plan || false,
        continuationSummary: (plan as DynamicWorkflowPlanWithPartial)?.continuation_summary || null,
        llmUsage: plannerLlmUsage,
        };
    }
    private substituteVariables(argValue: any, variables: Record<string, any>, userQueryFromState: string): any {
        if (!argValue) return argValue;
        
        if (typeof argValue === 'string') {
            return argValue.replace(/\{([^}]+)\}/g, (match, key) => {
                if (key === 'userQuery') return userQueryFromState;
                return variables[key] !== undefined ? variables[key] : match;
            });
        }
        
        if (Array.isArray(argValue)) {
            return argValue.map(item => this.substituteVariables(item, variables, userQueryFromState));
        }
        
        if (typeof argValue === 'object') {
            const result: Record<string, any> = {};
            for (const [key, value] of Object.entries(argValue)) {
                result[key] = this.substituteVariables(value, variables, userQueryFromState);
            }
            return result;
        }
        
        return argValue;
    }
    public async startOrContinueWorkflow(
        sessionId: string,
        userId: string,
        userName: string,
        latestUserInput: string,
        history: ChatMessage[],
        userState: UserState | null,
        apiContext: Record<string, any> = {},
        _internal_initial_plan?: DynamicWorkflowPlan | null,
        _internal_workflow_state?: WorkflowState | null
    ): Promise<WorkflowResponse> {
        let responseIntentType: string = "neutral";
        let lastToolOutputData: AnyToolStructuredData | null = null;
        let totalLlmUsage: OpenAI.CompletionUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const logPrefix = this.getLogPrefix(userId, sessionId);
        let wfState: WorkflowStateWithPartial | undefined;
        let currentDynamicPlan: DynamicWorkflowPlanWithPartial | null = null;

        if (!this.activeWorkflows) {
            this.activeWorkflows = new Map<string, WorkflowStateWithPartial>();
        }

        if (_internal_workflow_state) {
            wfState = {
                ..._internal_workflow_state,
                dynamicPlan: (_internal_workflow_state as WorkflowStateWithPartial).dynamicPlan || null,
                status: _internal_workflow_state.status as WorkflowState['status'] | 'paused_for_continuation',
                lastUserInput: (_internal_workflow_state as any).lastUserInput || "",
                lastToolOutput: (_internal_workflow_state as any).lastToolOutput || null,
            } as WorkflowStateWithPartial;
            currentDynamicPlan = wfState.dynamicPlan;
            this.activeWorkflows.set(sessionId, wfState);
            this.logger.info(`${logPrefix} Initialized and stored new workflow state from _internal_workflow_state. Goal: ${wfState.fullPlanGoal || currentDynamicPlan?.goal}`);
        } else {
            wfState = this.activeWorkflows.get(sessionId);
            if (wfState) {
                currentDynamicPlan = wfState.dynamicPlan;
                this.logger.info(`${logPrefix} Resuming existing workflow state. Status: ${wfState.status}, Next Step Index: ${wfState.currentStepIndex}, Goal: ${wfState.fullPlanGoal || currentDynamicPlan?.goal}`);
            }
        }
        if (!wfState) {
            this.logger.error(`${logPrefix} Workflow state is MISSING for session ${sessionId}. Cannot proceed.`);
            return {
                responseText: null, structuredData: null,
                workflowFeedback: { status: "failed", currentStepDescription: "Minato lost track of this task (state error)." },
                error: "Workflow state missing or failed to initialize.", isComplete: true,
                llmUsage: totalLlmUsage, intentType: "error", ttsInstructions: null, variables: {}
            };
        }
        if (!wfState.fullPlanGoal && currentDynamicPlan?.goal) {
            wfState.fullPlanGoal = currentDynamicPlan.goal;
        }
        if (!currentDynamicPlan || !currentDynamicPlan.steps || currentDynamicPlan.steps.length === 0) {
            this.logger.error(`${logPrefix} Workflow state for session ${sessionId} is inconsistent: No dynamic plan or steps found. Full Plan Goal: ${wfState.fullPlanGoal || "Not set"}`);
            this.clearWorkflowState(sessionId);
            return {
                responseText: null, structuredData: null,
                workflowFeedback: { status: "failed", currentStepDescription: "Minato lost the current plan (no steps)." },
                error: "Internal plan error within workflow state (no steps).", isComplete: true,
                llmUsage: totalLlmUsage, intentType: "error", ttsInstructions: null,
                variables: wfState.variables || {}
            };
        }
        if (wfState.status === "waiting_for_user" && wfState.clarificationPending) {
            const currentPlanSteps = currentDynamicPlan.steps;
            if (wfState.currentStepIndex < currentPlanSteps.length) {
                const stepAwaitingClarification = currentPlanSteps[wfState.currentStepIndex];
                if (stepAwaitingClarification.type === "clarification_query") {
                    const clarificationStep = stepAwaitingClarification as ClarificationQueryStep;
                    wfState.variables[clarificationStep.expectedResponseVar] = latestUserInput;
                    wfState.status = "running";
                    wfState.clarificationPending = undefined;
                    this.logger.info(`${logPrefix} Received user clarification: "${latestUserInput.substring(0,30)}...". Resuming current batch from step ${wfState.currentStepIndex}.`);
                } else {
                    wfState.status = "running";
                    this.logger.warn(`${logPrefix} Resumed 'waiting_for_user' but current step (${wfState.currentStepIndex}) not 'clarification_query'. Forcing 'running'.`);
                }
            } else if (wfState.isPartialPlan && wfState.continuationSummary) {
                this.logger.info(`${logPrefix} User confirmed continuation. User Input for next plan: "${latestUserInput.substring(0,30)}...". Planning next batch for goal: "${wfState.fullPlanGoal || 'unknown goal'}".`);
                wfState.variables.latestUserInputForStep = latestUserInput;
                const planResult = await this.selectAndPlanWorkflow(
                    wfState.fullPlanGoal || latestUserInput,
                    userId,
                    [
                        ...history,
                        { role: "assistant", content: `Previously: ${wfState.continuationSummary}` },
                        { role: "user", content: latestUserInput }
                    ],
                    userName,
                    userState
                );
                if (planResult.llmUsage) { totalLlmUsage.prompt_tokens += planResult.llmUsage.prompt_tokens || 0; totalLlmUsage.completion_tokens += planResult.llmUsage.completion_tokens || 0; totalLlmUsage.total_tokens += planResult.llmUsage.total_tokens || 0; }
                if (planResult.actionType === "generate_dynamic_workflow" && planResult.plan && planResult.plan.steps.length > 0) {
                    currentDynamicPlan = planResult.plan as DynamicWorkflowPlanWithPartial; 
                    wfState.dynamicPlan = currentDynamicPlan; 
                    wfState.currentStepIndex = 0; 
                    wfState.isPartialPlan = currentDynamicPlan.is_partial_plan; 
                    wfState.continuationSummary = currentDynamicPlan.continuation_summary;
                    wfState.status = "running";
                    wfState.executedStepsHistory.push(...(wfState.dynamicPlan?.steps || []).map(s => s.description || s.type)); 
                } else if (planResult.actionType === "request_clarification") {
                    wfState.status = "waiting_for_user";
                    wfState.clarificationPending = planResult.clarificationQuestion;
                    this.activeWorkflows.set(sessionId, wfState);
                    responseIntentType = "questioning";
                    return { responseText: null, structuredData: null, workflowFeedback: { workflowName: wfState.fullPlanGoal, currentStepDescription: "Minato needs more details for the next part...", status: "waiting_for_user" }, clarificationQuestion: injectPromptVariables(planResult.clarificationQuestion || "Minato needs more details for next steps, {userName}.", { userName }), isComplete: false, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null, variables: wfState.variables, isPartialPlan: wfState.isPartialPlan, continuationSummary: wfState.continuationSummary };
                } else { 
                    this.logger.info(`${logPrefix} Planner decided no more steps or erred for continuation. Ending workflow. ActionType: ${planResult.actionType}`);
                    wfState.status = "completed";
                    this.clearWorkflowState(sessionId);
                    responseIntentType = planResult.actionType === "error" ? "error" : "neutral";
                    return { responseText: "Okay, Minato will stop there.", structuredData: null, workflowFeedback: {
                        workflowName: wfState.fullPlanGoal, status: "completed",
                        currentStepDescription: ""
                    }, isComplete: true, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null, error: planResult.actionType === "error" ? (planResult.error || "Planner error on continuation") : undefined, variables: wfState.variables };
                }
            } else { 
                this.logger.warn(`${logPrefix} Resumed 'waiting_for_user' but currentStepIndex out of bounds or no partial plan continuation. Resetting workflow state.`); 
                this.clearWorkflowState(sessionId); 
                return { 
                    responseText: "Minato seems to have lost track of the current task. Could you please start over or rephrase?", 
                    structuredData: null, 
                    workflowFeedback: { 
                        status: "failed", 
                        currentStepDescription: "Lost task context."
                    }, 
                    error: "Workflow state error: waiting for user but no valid continuation path.",
                    isComplete: true, 
                    llmUsage: totalLlmUsage, 
                    intentType: "error", 
                    ttsInstructions: null, 
                    variables: wfState.variables || {} 
                };
            }
        }
        this.activeWorkflows.set(sessionId, wfState);
        const stepsToExecuteThisTurn = currentDynamicPlan.steps.slice(wfState.currentStepIndex);
        const parallelizedBatch = autoParallelizeWorkflowSteps(stepsToExecuteThisTurn, wfState.variables);
        wfState.status = "running";
        wfState.variables.latestUserInputForStep = latestUserInput;
        for (let i = 0; i < parallelizedBatch.length; ) {
            const step = parallelizedBatch[i];
            const stepDescriptionForLog = step.description || step.type;
            const userFacingStepDescription = injectPromptVariables(
                stepDescriptionForLog || `Minato is working on step ${wfState.currentStepIndex + 1} for you, {userName}`, 
                { userName, ...wfState.variables }
            );
            const currentStepFeedback: OrchestratorResponse['workflowFeedback'] = {
                workflowName: wfState.fullPlanGoal || currentDynamicPlan.goal,
                currentStepDescription: userFacingStepDescription,
                status: "in_progress",
                progress: Math.round(((wfState.currentStepIndex + 1) / (currentDynamicPlan.steps.length || 1)) * 100) 
            };
            wfState.variables[`_workflowFeedback_step_${wfState.currentStepIndex}`] = currentStepFeedback;

            const parallelExecutionGroup: ToolCallStep[] = [];
            if (step.type === "tool_call" && (step as ToolCallStep).parallel) {
                let k = i;
                while (k < parallelizedBatch.length && parallelizedBatch[k].type === "tool_call" && (parallelizedBatch[k] as ToolCallStep).parallel) {
                    parallelExecutionGroup.push(parallelizedBatch[k] as ToolCallStep);
                    k++;
                }
            }

            if (parallelExecutionGroup.length > 0) {
                const groupDesc = parallelExecutionGroup.map(s => s.description || s.toolName).join(" & ");
                this.logger.info(`${logPrefix} Executing parallel group (${parallelExecutionGroup.length} tools): ${groupDesc}`);
                const toolPromises = parallelExecutionGroup.map(async (toolCallStep) => {
                    const tool = this.toolRegistry[toolCallStep.toolName];
                    if (!tool) return Promise.reject(new Error(`Tool '${toolCallStep.toolName}' not found.`)); 
                    let actualToolArgs = this.substituteVariables(toolCallStep.toolArgs, wfState.variables, wfState.variables.userInput as string); 
                    if (typeof actualToolArgs !== "object" || actualToolArgs === null) actualToolArgs = { loneArg: actualToolArgs };
                    
                    if (tool.name === "InternalTaskTool") {
                        if (!actualToolArgs.action && toolCallStep.toolArgs?.action) {
                            actualToolArgs.action = toolCallStep.toolArgs.action; 
                            this.logger.warn(`${logPrefix} [Parallel Fallback] 'action' for InternalTaskTool was missing after substitution, restored from original plan's toolArgs: '${actualToolArgs.action}'`);
                        }
                        if (!actualToolArgs.action) { 
                            const errorMsg = `[Parallel CRITICAL] 'action' argument missing or invalid for InternalTaskTool in step '${toolCallStep.description}'. Cannot execute. Tool Args from Plan: ${JSON.stringify(toolCallStep.toolArgs)}`;
                            this.logger.error(logPrefix + " " + errorMsg);
                            return Promise.reject(new Error(errorMsg)); 
                        }
                    }
                    
                    const toolInput: ToolInput = { ...(actualToolArgs as Record<string, any>), userId, lang: userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0], sessionId, context: { ...(apiContext || {}), userState, sessionId, runId: sessionId, userName, workflowVariables: { ...wfState.variables } },};
                    this.logger.debug(`${logPrefix} [Parallel] Calling ${tool.name} with args: ${JSON.stringify(toolInput).substring(0,200)}`);
                    const toolOutput = await tool.execute(toolInput);
                    return { toolCallStep, toolOutput, toolName: tool.name };
                });
                try {
                    const results = await Promise.all(toolPromises);
                    for (const { toolCallStep, toolOutput, toolName } of results) {
                        if (toolOutput.error) throw new Error(`Parallel tool '${toolName}' error: ${toolOutput.error}`);
                        if (toolCallStep.outputVar) wfState.variables[toolCallStep.outputVar] = toolOutput;
                        if (toolOutput.structuredData) lastToolOutputData = toolOutput.structuredData;
                        wfState.executedStepsHistory.push(toolCallStep.description || toolCallStep.toolName);
                        wfState.currentStepIndex++; 
                    }
                    i += parallelExecutionGroup.length; 
                } catch (err: any) {
                     let detailedErrorMessage = "Unknown parallel tool execution error";
                    if (err instanceof Error) { detailedErrorMessage = err.message; }
                    else if (typeof err === 'string') { detailedErrorMessage = err; }
                    else if (err && typeof err === 'object' && typeof (err as any).message === 'string') { detailedErrorMessage = (err as any).message; }
                    else { try { detailedErrorMessage = JSON.stringify(err); } catch { detailedErrorMessage = String(err); } }
                    detailedErrorMessage = String(detailedErrorMessage || "Failsafe: Unknown parallel error detail");

                    this.logger.error(`${logPrefix} Error in parallel tool execution: ${detailedErrorMessage}`, err); 
                    wfState.status = "failed"; wfState.error = `Parallel tool error: ${detailedErrorMessage.substring(0, 250)}`;
                    this.activeWorkflows.set(sessionId, wfState); responseIntentType = "error";
                    return { responseText: `Minato encountered an issue with a parallel task, ${userName}: ${detailedErrorMessage.substring(0, 150)}.`, structuredData: lastToolOutputData, workflowFeedback: { workflowName: wfState.fullPlanGoal, currentStepDescription: `Error during parallel tasks: ${detailedErrorMessage.substring(0, 100)}`, status: "failed" }, error: wfState.error, isComplete: true, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null, variables: wfState.variables };
                }
            } else { 
                try {
                    if (step.type === "tool_call") {
                        const toolCallStep = step as ToolCallStep; const tool = this.toolRegistry[toolCallStep.toolName]; if (!tool) throw new Error(`Tool '${toolCallStep.toolName}' not found.`);
                        let actualToolArgs = this.substituteVariables(toolCallStep.toolArgs, wfState.variables, wfState.variables.userInput as string); if (typeof actualToolArgs !== "object" || actualToolArgs === null) actualToolArgs = { loneArg: actualToolArgs };
                        
                        if (tool.name === "InternalTaskTool") {
                            if (!actualToolArgs.action && toolCallStep.toolArgs?.action) {
                                actualToolArgs.action = toolCallStep.toolArgs.action;
                                this.logger.warn(`${logPrefix} [Single Fallback] 'action' for InternalTaskTool was missing after substitution, restored from original plan's toolArgs: '${actualToolArgs.action}'`);
                            }
                             if (!actualToolArgs.action) { 
                                 const errorMsg = `[Single CRITICAL] 'action' argument missing or invalid for InternalTaskTool in step '${toolCallStep.description}'. Cannot execute. Tool Args from Plan: ${JSON.stringify(toolCallStep.toolArgs)}`;
                                 this.logger.error(logPrefix + " " + errorMsg);
                                 throw new Error(errorMsg); 
                            }
                        }
                        
                        const toolInput: ToolInput = { ...(actualToolArgs as Record<string, any>), userId, lang: userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0], sessionId, context: { ...(apiContext || {}), userState, sessionId, runId: sessionId, userName, workflowVariables: { ...wfState.variables } },};
                        this.logger.debug(`${logPrefix} Calling tool ${tool.name} with args: ${JSON.stringify(toolInput).substring(0,200)}`);
                        const toolOutput: ToolOutput = await tool.execute(toolInput); if (toolOutput.error) throw new Error(`Tool '${tool.name}' error: ${toolOutput.error}`);
                        if (toolCallStep.outputVar) wfState.variables[toolCallStep.outputVar] = toolOutput; if (toolOutput.structuredData) lastToolOutputData = toolOutput.structuredData;
                        wfState.executedStepsHistory.push(toolCallStep.description || toolCallStep.toolName);
                    } else if (step.type === "llm_process") {
                        const llmStep = step as LLMProcessStep; const promptInputs: Record<string, any> = { userName }; (llmStep.inputVars || []).forEach(varName => { let value: any = getProperty(wfState!.variables, varName); if (value === undefined) value = `[Data for ${varName} unavailable]`; promptInputs[varName.replace(/\./g, "_")] = value; });
                        const promptTemplate = llmStep.customPrompt || WORKFLOW_LLM_PROMPT_TEMPLATES[llmStep.promptTemplateKey || ""] || "Process inputs: {inputVars[0]}";
                        const systemInstructionsForLLMStep = injectPromptVariables(promptTemplate, promptInputs); const llmModelForStep = llmStep.model || DEFAULT_LLM_STEP_MODEL;
                        this.logger.debug(`${logPrefix} LLM Process with ${llmModelForStep}. Template: '${llmStep.promptTemplateKey || "custom"}'`);
                        const llmResponse = await generateResponseWithIntent(systemInstructionsForLLMStep, "Generate output.", [], llmModelForStep, appConfig.llm.maxTokens, userId);
                        if ("error" in llmResponse) throw new Error(`LLM process step failed: ${llmResponse.error}`);
                        if (llmStep.outputVar) wfState!.variables[llmStep.outputVar] = llmResponse.responseText; 
                        responseIntentType = llmResponse.intentType || responseIntentType; 
                        const usage = (llmResponse as any).usage as OpenAI.CompletionUsage | undefined; if (usage) { totalLlmUsage.prompt_tokens += usage.prompt_tokens || 0; totalLlmUsage.completion_tokens += usage.completion_tokens || 0; totalLlmUsage.total_tokens += usage.total_tokens || 0; }
                        wfState.executedStepsHistory.push(llmStep.description || `LLM Processing: ${llmStep.promptTemplateKey || "Custom"}`);
                    } else if (step.type === "clarification_query") {
                        const clarificationStep = step as ClarificationQueryStep; const questionToUser = injectPromptVariables(clarificationStep.questionToUser, { userName, ...wfState.variables });
                        this.logger.info(`${logPrefix} Workflow needs mid-batch clarification: ${questionToUser}`);
                        wfState.status = "waiting_for_user"; wfState.clarificationPending = questionToUser;
                        this.activeWorkflows.set(sessionId, wfState); responseIntentType = "questioning";
                        return { responseText: null, structuredData: lastToolOutputData, workflowFeedback: currentStepFeedback, clarificationQuestion: questionToUser, isComplete: false, isPartialPlan: wfState.isPartialPlan, continuationSummary: wfState.continuationSummary, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null, variables: wfState.variables };
                    }
                } catch (error: any) { 
                    const stepDesc = step.description || step.type; 
                    const errorMessageString = String(error?.message || error || "Unknown error in single step execution");
                    this.logger.error(`${logPrefix} Error in step (${stepDesc || 'N/A'}): ${errorMessageString}`); 
                    wfState.status = "failed"; 
                    wfState.error = `Error during '${stepDesc || 'N/A'}': ${errorMessageString.substring(0,100)}`; 
                    this.activeWorkflows.set(sessionId, wfState); 
                    responseIntentType = "error"; 
                    return { 
                        responseText: `Minato hit an issue while ${injectPromptVariables(stepDesc || 'processing your request', {userName})}, ${userName}. The error was: ${errorMessageString.substring(0,70)}.`, 
                        structuredData: lastToolOutputData, 
                        workflowFeedback: { 
                            workflowName: wfState.fullPlanGoal, 
                            currentStepDescription: `Error at ${stepDesc || 'N/A'}`, 
                            status: "failed" 
                        }, 
                        error: wfState.error, 
                        isComplete: true, 
                        llmUsage: totalLlmUsage, 
                        intentType: responseIntentType, 
                        ttsInstructions: null, 
                        variables: wfState.variables 
                    }; 
                }
                wfState.currentStepIndex++; 
                i++; 
            }
        }
        this.activeWorkflows.set(sessionId, wfState);
        if (wfState.isPartialPlan && wfState.continuationSummary && wfState.currentStepIndex >= currentDynamicPlan.steps.length) {
            wfState.status = "paused_for_continuation";
            this.activeWorkflows.set(sessionId, wfState);
            this.logger.info(`${logPrefix} Batch complete. Workflow partial. Offering continuation: "${wfState.continuationSummary}"`);
            return {
                responseText: null,
                structuredData: lastToolOutputData,
                workflowFeedback: {
                    workflowName: wfState.fullPlanGoal,
                    status: "in_progress",
                    currentStepDescription: `Minato finished some steps for: ${wfState.fullPlanGoal}. Ready for the next part.`,
                    progress: Math.round(((wfState.currentStepIndex) / (currentDynamicPlan.steps.length || 1)) * 100)
                },
                isComplete: false,
                isPartialPlan: true,
                continuationSummary: wfState.continuationSummary,
                llmUsage: totalLlmUsage,
                intentType: "questioning",
                ttsInstructions: null,
                variables: wfState.variables
            };
        } else if (wfState.currentStepIndex >= currentDynamicPlan.steps.length) {
            wfState.status = "completed";
            this.logger.info(`${logPrefix} Workflow dynamic plan completed. Goal: "${wfState.fullPlanGoal || currentDynamicPlan.goal}`);
            this.clearWorkflowState(sessionId);
            let finalResponse = lastToolOutputData ?
                `Minato has finished: ${wfState.fullPlanGoal || currentDynamicPlan.goal}. The final result is available.` :
                `Minato has finished: ${wfState.fullPlanGoal || currentDynamicPlan.goal}.`;

            // Apply role-based personalization to workflow response
            if (appConfig.minato?.useDynamicPersonalization && featureFlags.useDynamicPersonalization && finalResponse) {
                try {
                    // Get user state
                    const userState = await this.getUserState(userId);
                    
                    // Get or compute enhanced memory context
                    let enhancedMemoryContext = "";
                    if (apiContext?.enhancedMemoryContext) {
                        enhancedMemoryContext = apiContext.enhancedMemoryContext;
                    } else if (this.memoryFramework) {
                        try {
                            // Generate memory context if not already available
                            const { enhancedMemoryContext: memContext } = await enhanceUserMemoryContext(
                                userId,
                                latestUserInput || "",
                                history,
                                userState,
                                this.memoryFramework
                            );
                            enhancedMemoryContext = memContext;
                        } catch (error) {
                            logger.error(`[WorkflowEngine:${userId.slice(0, 6)}] Memory context enrichment error:`, error);
                        }
                    }
                    
                    // We can't use processTextMessageWithPersonalization as it seems to be missing
                    // For now, we'll just keep the original response
                    // const personalizedResponse = await processTextMessageWithPersonalization(...);
                    
                    // Leave finalResponse unchanged since we can't personalize it
                    logger.info(`[WorkflowEngine:${userId.slice(0, 6)}] Personalization skipped due to missing module`);
                } catch (error) {
                    logger.error(`[WorkflowEngine:${userId.slice(0, 6)}] Role-based personalization error:`, error);
                    // Keep original response if personalization fails
                }
            }

            // Enhanced reasoning for multi-tool orchestration
            let responseIntentType = "confirmation_positive";
            
            // Check for enhanced reasoning data in apiContext
            if (apiContext.enhancedReasoning || apiContext.orchestrationExplanation) {
                // Add enhanced reasoning if available
                if (apiContext.enhancedReasoning) {
                    responseIntentType = "enhanced_reasoning";
                    this.logger.info(`${logPrefix} Enhanced reasoning added to workflow response`);
                }
                
                // Add orchestration explanation if available
                if (apiContext.orchestrationExplanation) {
                    responseIntentType = "orchestration_explanation";
                    this.logger.info(`${logPrefix} Orchestration explanation added to workflow response`);
                }
                
                // Add flag to indicate UI cards should have reasoning
                if (apiContext.generateUICardReasoning === true) {
                    responseIntentType = "confirmation_positive_with_reasoning";
                    this.logger.info(`${logPrefix} UI Card reasoning flag set in workflow response`);
                }
            }

            return {
                responseText: finalResponse,
                structuredData: lastToolOutputData,
                workflowFeedback: {
                    workflowName: wfState.fullPlanGoal || currentDynamicPlan.goal,
                    status: "completed",
                    currentStepDescription: `Minato has completed all steps for: ${wfState.fullPlanGoal || currentDynamicPlan.goal}`
                },
                isComplete: true,
                llmUsage: totalLlmUsage,
                intentType: responseIntentType,
                ttsInstructions: null,
                variables: wfState.variables
            };
        } else {
            this.logger.error(`${logPrefix} Workflow ended in unexpected state. Index: ${wfState.currentStepIndex}, Steps: ${currentDynamicPlan.steps.length}`);
            wfState.status = "failed"; 
            wfState.error = "Workflow ended in unexpected state.";
            this.clearWorkflowState(sessionId);
            return {
                responseText: "Minato encountered an unexpected internal state issue.",
                structuredData: null,
                workflowFeedback: { workflowName: wfState.fullPlanGoal, status: "failed", currentStepDescription: "Unexpected state" },
                error: wfState.error,
                isComplete: true,
                llmUsage: totalLlmUsage,
                intentType: "error",
                ttsInstructions: null,
                variables: wfState.variables
            };
        }

        // Add default return in case no other condition is met
        return {
            responseText: "Minato encountered an unexpected state.",
            structuredData: null,
            workflowFeedback: { 
                status: "failed", 
                currentStepDescription: "Unknown state",
                workflowName: "Unknown",
            },
            error: "Workflow reached an unexpected execution path",
            isComplete: true,
            llmUsage: { 
                prompt_tokens: 0, 
                completion_tokens: 0, 
                total_tokens: 0,
            },
            intentType: "error",
            ttsInstructions: null,
            variables: {},
        } as WorkflowResponse;
    }
    public createAndStoreWorkflowState(
        sessionId: string,
        userId: string,
        initialPlan: DynamicWorkflowPlan,
        initialVariables: Record<string, any> = {}
    ): WorkflowStateWithPartial {
        const newState: WorkflowStateWithPartial = {
            sessionId,
            userId,
            currentStepIndex: 0,
            variables: { ...initialVariables, userInput: initialVariables.userInput || "" },
            status: "pending",
            error: null,
            clarificationPending: null,
            isPartialPlan: (initialPlan as DynamicWorkflowPlanWithPartial).is_partial_plan || false,
            continuationSummary: (initialPlan as DynamicWorkflowPlanWithPartial).continuation_summary || null,
            fullPlanGoal: initialPlan.goal,
            executedStepsHistory: [],
            startTime: Date.now(),
            activeWorkflowId: initialPlan.id || null,
            dynamicPlan: initialPlan as DynamicWorkflowPlanWithPartial,
            lastUserInput: "",
            lastToolOutput: null,
        };
        this.activeWorkflows.set(sessionId, newState);
        this.logger.info(`[WF Engine] Created and stored new workflow state for Sess:${sessionId.substring(0,6)}, User:${userId.substring(0,8)}. Goal: "${initialPlan.goal}"`);
        return newState;
    }
    public clearWorkflowState(sessionId: string): void {
        if (!this.activeWorkflows) return;
        this.activeWorkflows.delete(sessionId);
        this.logger.info(`[WF Engine] Cleared active workflow state for session ${sessionId}`);
    }
    public getActiveWorkflowState(sessionId: string): WorkflowStateWithPartial | undefined {
        if (!this.activeWorkflows) return undefined;
        return this.activeWorkflows.get(sessionId);
    }
    private async getUserState(userId: string): Promise<UserState | null> {
        try {
            // Check if we can access the memory framework
            if (this.memoryFramework) {
                // Try to get user state from memory framework
                // Since getUserState may not exist directly on CompanionCoreMemory,
                // let's work with a more generic approach
                try {
                    // Try to get it from search_memory
                    const userStateResults = await this.memoryFramework.search_memory(
                        "user state preferences settings profile",
                        userId,
                        { limit: 5, offset: 0 }
                    );
                    
                    if (userStateResults && userStateResults.results.length > 0) {
                        // Try to construct a basic user state from the results
                        const basicState: Partial<UserState> = {
                            user_id: userId,
                            // Add other fields as needed
                        };
                        
                        return basicState as UserState;
                    }
                } catch (searchError) {
                    logger.error(`[WorkflowEngine] getUserState search error:`, searchError);
                }
            }
            return null;
        } catch (error) {
            logger.error(`[WorkflowEngine] getUserState error for ${userId}:`, error);
            return null;
        }
    }
}