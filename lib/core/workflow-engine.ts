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
import { appConfig, injectPromptVariables } from "@/lib/config";
import { DYNAMIC_WORKFLOW_GENERATION_PROMPT_TEMPLATE } from "@/lib/prompts";
import OpenAI from "openai";
import { getProperty } from "dot-prop";
import { CompletionUsage } from "openai/resources";

const DYNAMIC_WORKFLOW_DESIGN_MODEL: OpenAIPlanningModel = appConfig.llm.planningModel || "o4-mini-2025-04-16";
const DEFAULT_LLM_STEP_MODEL: OpenAILLMFast = appConfig.llm.extractionModel || "gpt-4.1-nano-2025-04-14";
const WORKFLOW_MAX_TOOLS_PER_TURN = 3;

type DynamicWorkflowPlanWithPartial = DynamicWorkflowPlan & {
  is_partial_plan?: boolean;
  continuation_summary?: string | null;
};

// Adjusted WorkflowStateWithPartial to better match WorkflowState from types/index.ts
type WorkflowStateWithPartial = Omit<WorkflowState, 'status' | 'dynamicPlan'> & {
  status: WorkflowState['status'] | 'paused_for_continuation';
  dynamicPlan: DynamicWorkflowPlanWithPartial | null; // Allows dynamicPlan to be explicitly DynamicWorkflowPlanWithPartial
  // No need to redeclare fullPlanGoal, isPartialPlan, continuationSummary if they are part of WorkflowState
};


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
    const parts = [];
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
    if (currentStep.type === "tool_call" &&
        (!(currentStep as ToolCallStep).depends_on_var ||
         getProperty(variables, (currentStep as ToolCallStep).depends_on_var || "") !== undefined)
       ) {
      (stepsCopy[i] as ToolCallStep).parallel = true;
      let j = i + 1;
      while ( j < batchSize &&
              stepsCopy[j].type === "tool_call" &&
              (!(stepsCopy[j] as ToolCallStep).depends_on_var ||
               getProperty(variables, (stepsCopy[j] as ToolCallStep).depends_on_var || "") !== undefined)
            ) {
        (stepsCopy[j] as ToolCallStep).parallel = true;
        j++;
      }
      i = j;
    } else {
      if (currentStep.type === "tool_call") (stepsCopy[i] as ToolCallStep).parallel = false;
      i++;
    }
  }
  return stepsCopy;
}

export class WorkflowEngine {
  private toolRegistry: { [key: string]: BaseTool };
  private activeWorkflows: Map<string, WorkflowStateWithPartial> = new Map();

  constructor(toolRegistry: { [key: string]: BaseTool }) {
    this.toolRegistry = toolRegistry;
    logger.info(`[WorkflowEngine] Initialized with ${Object.keys(this.toolRegistry).length} tools.`);
  }

  public async selectAndPlanWorkflow( userQuery: string, userId: string, history: ChatMessage[], userName: string, userState: UserState | null ): Promise<{ plan: DynamicWorkflowPlan | null; clarificationQuestion?: string | null; actionType: "generate_dynamic_workflow" | "request_clarification" | "no_workflow_needed" | "error"; isPartialPlan?: boolean; continuationSummary?: string | null; llmUsage?: CompletionUsage | null; }> {
    const logPrefix = `[WF SelectAndPlan User:${userId.substring(0,8)}] Query:"${userQuery.substring(0,30)}..."`;
    logger.info(`${logPrefix} Using LLM for dynamic workflow planning (Model: ${DYNAMIC_WORKFLOW_DESIGN_MODEL}).`);
    const availableToolsForPlanning = Object.values(this.toolRegistry)
        .filter(t => (t as any).enabled !== false)
        .map(t => {
            const argsSchemaObj = t.argsSchema as { properties?: Record<string, OpenAIToolParameterProperties>; required?: string[] };
            const args = argsSchemaObj.properties ? Object.keys(argsSchemaObj.properties) : [];
            const reqArgs = argsSchemaObj.required || [];
            const argSummary = args.map(arg => `${arg}${reqArgs.includes(arg) ? '*' : ''}`).join(', ');
            return `- ${t.name}: ${t.description.substring(0,100)}... Args: ${argSummary || 'None'}`;
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
    const injectedPrompt = injectPromptVariables(DYNAMIC_WORKFLOW_GENERATION_PROMPT_TEMPLATE, { userQuery, userName, conversationHistorySummary: summarizeChatHistoryForWorkflow(history), userStateSummary: summarizeUserStateForWorkflow(userState), available_tools_for_planning: availableToolsForPlanning, language: language, ...personaContext, });

    const llmPlannerSchema = {
      type: "object" as const,
      properties: {
        action_type: { type: "string" as const, enum: ["generate_dynamic_workflow", "request_clarification", "no_workflow_needed"] },
        plan: {
          type: ["object", "null"] as const,
          properties: {
            goal: { type: "string" as const },
            reasoning: { type: "string" as const },
            steps: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  type: { type: "string" as const, enum: ["tool_call", "llm_process", "clarification_query"]},
                  toolName: { type: ["string", "null"] as const },
                  toolArgs: { type: ["object", "null"] as const, additionalProperties: true },
                  customPrompt: { type: ["string", "null"] as const },
                  promptTemplateKey: { type: ["string", "null"] as const },
                  inputVars: { type: ["array", "null"] as const, items: { type: "string" as const } },
                  outputSchemaName: { type: ["string", "null"] as const },
                  outputSchema: { type: ["object", "null"] as const, additionalProperties: true },
                  questionToUser: { type: ["string", "null"] as const },
                  expectedResponseVar: { type: ["string", "null"] as const },
                  description: { type: "string" as const },
                  outputVar: { type: "string" as const },
                  parallel: { type: ["boolean", "null"] as const },
                  depends_on_var: { type: ["string", "null"] as const },
                },
                required: [
                    "type", "description", "outputVar", "toolName", "toolArgs", "customPrompt",
                    "promptTemplateKey", "inputVars", "outputSchemaName", "outputSchema",
                    "questionToUser", "expectedResponseVar", "parallel", "depends_on_var"
                ],
                additionalProperties: false,
              },
              maxItems: WORKFLOW_MAX_TOOLS_PER_TURN,
            },
            is_partial_plan: { type: "boolean" as const, description: "True if this plan is part of a larger user goal requiring more steps later." },
            continuation_summary: { type: ["string", "null"] as const, description: "If partial, a brief summary of what Minato could do next for the user." }
          },
          required: ["goal", "reasoning", "steps", "is_partial_plan", "continuation_summary"],
          additionalProperties: false,
        },
        clarification_question: { type: ["string", "null"] as const },
        reasoning: { type: "string" as const }
      },
      required: ["action_type", "reasoning", "plan", "clarification_question"],
      additionalProperties: false,
    };

    const schemaNameForLLMPlanner = "minato_dynamic_workflow_planner_v13_strict";
    const llmChoiceResult = await generateStructuredJson<any>( injectedPrompt, "Based on the user query and context, decide the immediate action plan using the provided schemas.", llmPlannerSchema, schemaNameForLLMPlanner, [], DYNAMIC_WORKFLOW_DESIGN_MODEL, userId );
    const plannerLlmUsage = (llmChoiceResult as any).usage as CompletionUsage | undefined;
    if ("error" in llmChoiceResult || !llmChoiceResult || !llmChoiceResult.action_type) { logger.error(`${logPrefix} LLM planner failed: ${(llmChoiceResult as any)?.error || "Invalid response structure"}. Raw: ${JSON.stringify(llmChoiceResult)}`); return { plan: null, actionType: "error", llmUsage: plannerLlmUsage }; }
    logger.debug(`${logPrefix} LLM planner decision: ${JSON.stringify(llmChoiceResult, null, 2)}`);
    const plan = llmChoiceResult.plan as DynamicWorkflowPlanWithPartial | null;
    if (plan && Array.isArray(plan.steps) && plan.steps.length > WORKFLOW_MAX_TOOLS_PER_TURN) { logger.warn(`${logPrefix} LLM planner returned ${plan.steps.length} steps, exceeding max ${WORKFLOW_MAX_TOOLS_PER_TURN}. Truncating.`); plan.steps = plan.steps.slice(0, WORKFLOW_MAX_TOOLS_PER_TURN); if (!plan.is_partial_plan) (plan as DynamicWorkflowPlanWithPartial).is_partial_plan = true; if (!plan.continuation_summary) (plan as DynamicWorkflowPlanWithPartial).continuation_summary = "Minato can explore this further if you'd like."; }
    return { plan: plan, clarificationQuestion: llmChoiceResult.clarification_question || null, actionType: llmChoiceResult.action_type, isPartialPlan: (plan as DynamicWorkflowPlanWithPartial)?.is_partial_plan || false, continuationSummary: (plan as DynamicWorkflowPlanWithPartial)?.continuation_summary || null, llmUsage: plannerLlmUsage, };
  }

  private substituteVariables(argValue: any, variables: Record<string, any>, userQueryFromState: string): any {
    if (typeof argValue === "string") {
        let substitutedValue = argValue; const currentTurnInput = variables.latestUserInputForStep || userQueryFromState;
        substitutedValue = substitutedValue.replace(/{userInput}/g, userQueryFromState); substitutedValue = substitutedValue.replace(/{latestUserInput}/g, currentTurnInput);
        const placeholderRegex = /\{([\w.-]+(?:\[\d+\])?(?:[.][\w-]+)*)\}/g;
        for (let i = 0; i < 5; i++) { // Limit iterations to prevent infinite loops
            let changedInIter = false; let matchResult; const currentIterRegex = new RegExp(placeholderRegex.source, "g");
            while ((matchResult = currentIterRegex.exec(substitutedValue)) !== null) {
                const fullPlaceholder = matchResult[0]; const varPath = matchResult[1]; if (varPath === "userInput" || varPath === "latestUserInput") continue;
                let value = getProperty(variables, varPath);
                if (value !== undefined) { if (substitutedValue === fullPlaceholder && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return value; const replacement = String(value ?? ""); if (substitutedValue.includes(fullPlaceholder)) { substitutedValue = substitutedValue.replace(fullPlaceholder, replacement); changedInIter = true; } }
                else { logger.warn(`[WF Engine Substitute] Variable path '${varPath}' for placeholder '${fullPlaceholder}' not found in variables. Known: ${Object.keys(variables).join(", ")}`); }
            }
            if (!changedInIter) break; // No more substitutions in this iteration
        }
        return substitutedValue;
    } else if (Array.isArray(argValue)) { return argValue.map(item => this.substituteVariables(item, variables, userQueryFromState));
    } else if (typeof argValue === "object" && argValue !== null) { const newObj: Record<string, any> = {}; for (const key in argValue) { if (Object.prototype.hasOwnProperty.call(argValue, key)) { newObj[key] = this.substituteVariables(argValue[key], variables, userQueryFromState); } } return newObj; }
    return argValue;
  }

  public async startOrContinueWorkflow(
    sessionId: string,
    userId: string,
    latestUserInput: string,
    history: ChatMessage[],
    userState: UserState | null,
    apiContext?: Record<string, any>,
    _internal_initial_plan?: DynamicWorkflowPlan | null,
    _internal_workflow_state?: WorkflowState | null
  ): Promise<{
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
  }> {
    const logPrefix = `[WF Engine Exec User:${userId.substring(0,8)} Sess:${sessionId.substring(0,6)}]`;
    let wfState: WorkflowStateWithPartial | undefined;
    let currentDynamicPlan: DynamicWorkflowPlanWithPartial | null = null;

    if (_internal_workflow_state) {
      wfState = _internal_workflow_state as WorkflowStateWithPartial;
      currentDynamicPlan = wfState.dynamicPlan as DynamicWorkflowPlanWithPartial | null;
      this.activeWorkflows.set(sessionId, wfState);
      logger.info(`${logPrefix} Initialized and stored new workflow state from _internal_workflow_state. Goal: ${wfState.fullPlanGoal}`);
    } else {
      wfState = this.activeWorkflows.get(sessionId);
      if (wfState) {
        currentDynamicPlan = wfState.dynamicPlan;
        logger.info(`${logPrefix} Resuming existing workflow state. Status: ${wfState.status}, Next Step Index: ${wfState.currentStepIndex}, Goal: ${wfState.fullPlanGoal}`);
      }
    }

    let totalLlmUsage: OpenAI.CompletionUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const userName = apiContext?.userName || userState?.user_first_name || "User";
    let responseIntentType: string | null = "neutral";

    if (!wfState) {
      logger.error(`${logPrefix} Workflow state is MISSING for session ${sessionId}. This is unexpected if a new plan was just created by Orchestrator.`);
      return {
        responseText: null,
        structuredData: null,
        workflowFeedback: { status: "failed", currentStepDescription: "Minato lost track of this task (state error)." },
        error: "Workflow state missing or failed to initialize.",
        isComplete: true,
        llmUsage: totalLlmUsage,
        intentType: "error",
        ttsInstructions: null,
        variables: {}
      };
    }
    
    // Ensure dynamicPlan and fullPlanGoal are correctly set from the start if it's a new state
    if (!wfState.fullPlanGoal && currentDynamicPlan?.goal) {
        wfState.fullPlanGoal = currentDynamicPlan.goal;
    }


    if (!currentDynamicPlan || !currentDynamicPlan.steps || currentDynamicPlan.steps.length === 0) {
      logger.error(`${logPrefix} Workflow state for session ${sessionId} is inconsistent: No dynamic plan or steps found. Full Plan Goal: ${wfState.fullPlanGoal}`);
      this.clearWorkflowState(sessionId);
      return {
        responseText: null,
        structuredData: null,
        workflowFeedback: { status: "failed", currentStepDescription: "Minato lost the current plan (no steps)." },
        error: "Internal plan error within workflow state (no steps).",
        isComplete: true,
        llmUsage: totalLlmUsage,
        intentType: "error",
        ttsInstructions: null,
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
                wfState.status = "running"; wfState.clarificationPending = undefined;
                logger.info(`${logPrefix} Received user clarification: "${latestUserInput.substring(0,30)}...". Resuming current batch.`);
            } else { wfState.status = "running"; logger.warn(`${logPrefix} Resumed 'waiting_for_user' but current step not 'clarification_query'. Forcing 'running'.`); }
        } else if (wfState.isPartialPlan && wfState.continuationSummary) {
            logger.info(`${logPrefix} User confirmed continuation. Planning next batch for goal: "${wfState.fullPlanGoal || 'unknown goal'}".`);
            wfState.variables.latestUserInputForStep = latestUserInput; // Update for planner
            const planResult = await this.selectAndPlanWorkflow( wfState.fullPlanGoal || latestUserInput, userId, [...history, {role: "assistant", content: `Previously: ${wfState.continuationSummary}`}, {role:"user", content:latestUserInput}], userName, userState );
            if (planResult.llmUsage) { totalLlmUsage.prompt_tokens += planResult.llmUsage.prompt_tokens || 0; totalLlmUsage.completion_tokens += planResult.llmUsage.completion_tokens || 0; totalLlmUsage.total_tokens += planResult.llmUsage.total_tokens || 0; }

            if (planResult.actionType === "generate_dynamic_workflow" && planResult.plan) {
                currentDynamicPlan = planResult.plan; wfState.dynamicPlan = currentDynamicPlan; wfState.currentStepIndex = 0; // Reset step index for new plan
                wfState.isPartialPlan = planResult.isPartialPlan; wfState.continuationSummary = planResult.continuationSummary;
                // fullPlanGoal remains the same
                wfState.status = "running";
                wfState.executedStepsHistory = (wfState.dynamicPlan?.steps || []).map(s => s.description || s.type); // Reset/set for new batch
            } else if (planResult.actionType === "request_clarification") {
                wfState.status = "waiting_for_user"; wfState.clarificationPending = planResult.clarificationQuestion;
                this.activeWorkflows.set(sessionId, wfState); responseIntentType = "questioning";
                return { responseText: null, structuredData: null, workflowFeedback: { workflowName: wfState.fullPlanGoal, currentStepDescription: "Minato needs more details for the next part...", status: "waiting_for_user" }, clarificationQuestion: injectPromptVariables(planResult.clarificationQuestion || "Minato needs more details for next steps, {userName}.", { userName }), isComplete: false, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null, variables: wfState.variables, isPartialPlan: wfState.isPartialPlan, continuationSummary: wfState.continuationSummary };
            } else { 
                logger.info(`${logPrefix} Planner decided no more steps or erred for continuation. Ending workflow.`); wfState.status = "completed"; this.activeWorkflows.delete(sessionId); responseIntentType = planResult.actionType === "error" ? "error" : "neutral";
                return { responseText: "Okay, Minato will stop there.", structuredData: null, workflowFeedback: { workflowName: wfState.fullPlanGoal, status: "completed" }, isComplete: true, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null, error: planResult.actionType === "error" ? "Planner error on continuation" : undefined, variables: wfState.variables };
            }
        } else { logger.warn(`${logPrefix} Resumed 'waiting_for_user' but currentStepIndex out of bounds or no partial plan. Resetting.`); this.clearWorkflowState(sessionId); return this.startOrContinueWorkflow(sessionId, userId, latestUserInput, history, userState, apiContext); }
    }
    this.activeWorkflows.set(sessionId, wfState);

    const stepsToExecuteThisTurn = currentDynamicPlan.steps.slice(wfState.currentStepIndex);
    const parallelizedBatch = autoParallelizeWorkflowSteps(stepsToExecuteThisTurn, wfState.variables);
    let lastToolOutputData: AnyToolStructuredData | null = null;
    wfState.status = "running"; wfState.variables.latestUserInputForStep = latestUserInput;

    for (let i = 0; i < parallelizedBatch.length; ) {
        const step = parallelizedBatch[i];
        const stepDescriptionForLog = step.description || step.type; // Ensure it's a string
        const userFacingStepDescription = injectPromptVariables(stepDescriptionForLog || `Minato is working on step ${wfState.currentStepIndex + i + 1} for you, {userName}`, { userName, ...wfState.variables });
        
        const currentStepFeedback: OrchestratorResponse['workflowFeedback'] = {
            workflowName: wfState.fullPlanGoal || currentDynamicPlan.goal,
            currentStepDescription: userFacingStepDescription,
            status: "in_progress",
            progress: Math.round(((wfState.currentStepIndex + i + 1) / (currentDynamicPlan.steps.length || 1)) * 100)
        };
        wfState.variables[`_workflowFeedback_step_${wfState.currentStepIndex + i}`] = currentStepFeedback;

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
            logger.info(`${logPrefix} Executing parallel group (${parallelExecutionGroup.length} tools): ${groupDesc}`);
            const toolPromises = parallelExecutionGroup.map(toolCallStep => {
                const tool = this.toolRegistry[toolCallStep.toolName];
                if (!tool) return Promise.reject(new Error(`Tool '${toolCallStep.toolName}' not found.`));
                let actualToolArgs = this.substituteVariables(toolCallStep.toolArgs, wfState.variables, wfState.variables.userInput as string); // Assume userInput in variables is string
                if (typeof actualToolArgs !== "object" || actualToolArgs === null) actualToolArgs = { loneArg: actualToolArgs };
                const toolInput: ToolInput = { ...(actualToolArgs as Record<string, any>), userId, lang: userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0], sessionId, context: { ...(apiContext || {}), userState, sessionId, runId: sessionId, userName, workflowVariables: { ...wfState.variables } },};
                logger.debug(`${logPrefix} [Parallel] Calling ${tool.name} with args: ${JSON.stringify(toolInput).substring(0,200)}`);
                return tool.execute(toolInput).then(toolOutput => ({ toolCallStep, toolOutput, toolName: tool.name }));
            });
            try {
                const results = await Promise.all(toolPromises);
                for (const { toolCallStep, toolOutput, toolName } of results) {
                    if (toolOutput.error) throw new Error(`Parallel tool '${toolName}' error: ${toolOutput.error}`);
                    if (toolCallStep.outputVar) wfState.variables[toolCallStep.outputVar] = toolOutput;
                    if (toolOutput.structuredData) lastToolOutputData = toolOutput.structuredData;
                    wfState.executedStepsHistory.push(toolCallStep.description || toolCallStep.toolName);
                }
                i += parallelExecutionGroup.length;
            } catch (err: any) {
                logger.error(`${logPrefix} Error in parallel tool execution: ${err.message}`);
                wfState.status = "failed";
                wfState.error = `Parallel tool error: ${err.message}`;
                this.activeWorkflows.set(sessionId, wfState);
                responseIntentType = "error";
                return { responseText: `Minato encountered an issue with a parallel task, ${userName}: ${err.message}.`, structuredData: lastToolOutputData, workflowFeedback: { workflowName: wfState.fullPlanGoal, currentStepDescription: `Error during parallel tasks: ${err.message}`, status: "failed" }, error: wfState.error, isComplete: true, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null, variables: wfState.variables };
            }
        } else { // Single step execution
            try {
                if (step.type === "tool_call") {
                    const toolCallStep = step as ToolCallStep; const tool = this.toolRegistry[toolCallStep.toolName]; if (!tool) throw new Error(`Tool '${toolCallStep.toolName}' not found.`);
                    let actualToolArgs = this.substituteVariables(toolCallStep.toolArgs, wfState.variables, wfState.variables.userInput as string); if (typeof actualToolArgs !== "object" || actualToolArgs === null) actualToolArgs = { loneArg: actualToolArgs };
                    const toolInput: ToolInput = { ...(actualToolArgs as Record<string, any>), userId, lang: userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0], sessionId, context: { ...(apiContext || {}), userState, sessionId, runId: sessionId, userName, workflowVariables: { ...wfState.variables } },};
                    logger.debug(`${logPrefix} Calling tool ${tool.name} with args: ${JSON.stringify(toolInput).substring(0,200)}`);
                    const toolOutput: ToolOutput = await tool.execute(toolInput); if (toolOutput.error) throw new Error(`Tool '${tool.name}' error: ${toolOutput.error}`);
                    if (toolCallStep.outputVar) wfState.variables[toolCallStep.outputVar] = toolOutput; if (toolOutput.structuredData) lastToolOutputData = toolOutput.structuredData;
                    wfState.executedStepsHistory.push(toolCallStep.description || toolCallStep.toolName);
                } else if (step.type === "llm_process") {
                    const llmStep = step as LLMProcessStep; const promptInputs: Record<string, any> = { userName }; (llmStep.inputVars || []).forEach(varName => { let value: any = getProperty(wfState!.variables, varName); if (value === undefined) value = `[Data for ${varName} unavailable]`; promptInputs[varName.replace(/\./g, "_")] = value; });
                    const promptTemplate = llmStep.customPrompt || WORKFLOW_LLM_PROMPT_TEMPLATES[llmStep.promptTemplateKey || ""] || "Process inputs: {inputVars[0]}";
                    const systemInstructionsForLLMStep = injectPromptVariables(promptTemplate, promptInputs); const llmModelForStep = llmStep.model || DEFAULT_LLM_STEP_MODEL;
                    logger.debug(`${logPrefix} LLM Process with ${llmModelForStep}. Template: '${llmStep.promptTemplateKey || "custom"}'`);
                    const llmResponse = await generateResponseWithIntent(systemInstructionsForLLMStep, "Generate output.", [], llmModelForStep, appConfig.llm.maxTokens, userId);
                    if ("error" in llmResponse) throw new Error(`LLM process step failed: ${llmResponse.error}`);
                    if (llmStep.outputVar) wfState!.variables[llmStep.outputVar] = llmResponse.responseText; responseIntentType = llmResponse.intentType || responseIntentType;
                    const usage = (llmResponse as any).usage as OpenAI.CompletionUsage | undefined; if (usage) { totalLlmUsage.prompt_tokens += usage.prompt_tokens || 0; totalLlmUsage.completion_tokens += usage.completion_tokens || 0; totalLlmUsage.total_tokens += usage.total_tokens || 0; }
                    wfState.executedStepsHistory.push(llmStep.description || `LLM Processing: ${llmStep.promptTemplateKey || "Custom"}`);
                } else if (step.type === "clarification_query") {
                    const clarificationStep = step as ClarificationQueryStep; const questionToUser = injectPromptVariables(clarificationStep.questionToUser, { userName, ...wfState.variables });
                    logger.info(`${logPrefix} Workflow needs mid-batch clarification: ${questionToUser}`);
                    wfState.status = "waiting_for_user"; wfState.clarificationPending = questionToUser;
                    this.activeWorkflows.set(sessionId, wfState); responseIntentType = "questioning";
                    return { responseText: null, structuredData: lastToolOutputData, workflowFeedback: currentStepFeedback, clarificationQuestion: questionToUser, isComplete: false, isPartialPlan: wfState.isPartialPlan, continuationSummary: wfState.continuationSummary, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null, variables: wfState.variables };
                }
            } catch (error: any) { const stepDesc = step.description || step.type; logger.error(`${logPrefix} Error in step (${stepDesc || 'N/A'}): ${error.message}`); wfState.status = "failed"; wfState.error = `Error during '${stepDesc || 'N/A'}': ${error.message.substring(0,100)}`; this.activeWorkflows.set(sessionId, wfState); responseIntentType = "error"; return { responseText: `Minato hit an issue while ${injectPromptVariables(stepDesc || 'processing your request', {userName})}, ${userName}. The error was: ${error.message.substring(0,70)}.`, structuredData: lastToolOutputData, workflowFeedback: { workflowName: wfState.fullPlanGoal, currentStepDescription: `Error at ${stepDesc || 'N/A'}`, status: "failed" }, error: wfState.error, isComplete: true, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null, variables: wfState.variables }; }
            i++;
        }
    }

    wfState.currentStepIndex += parallelizedBatch.length;
    this.activeWorkflows.set(sessionId, wfState);

    if (wfState.isPartialPlan && wfState.continuationSummary) {
        wfState.status = "paused_for_continuation";
        this.activeWorkflows.set(sessionId, wfState);
        logger.info(`${logPrefix} Batch complete. Workflow partial. Offering continuation: "${wfState.continuationSummary}"`);
        return { responseText: null, structuredData: lastToolOutputData, workflowFeedback: { workflowName: wfState.fullPlanGoal, status: "in_progress", currentStepDescription: `Minato finished some steps for: ${wfState.fullPlanGoal}. Ready for the next part.` }, isComplete: false, isPartialPlan: true, continuationSummary: wfState.continuationSummary, llmUsage: totalLlmUsage, intentType: "questioning", ttsInstructions: null, variables: wfState.variables };
    } else {
        wfState.status = "completed";
        logger.info(`${logPrefix} Workflow dynamic plan completed. Goal: "${wfState.fullPlanGoal || currentDynamicPlan.goal}"`);
        this.clearWorkflowState(sessionId);
        return { responseText: `Minato has finished: ${wfState.fullPlanGoal || currentDynamicPlan.goal}.`, structuredData: lastToolOutputData, workflowFeedback: { workflowName: wfState.fullPlanGoal || currentDynamicPlan.goal, status: "completed", currentStepDescription: `Minato has completed all steps for: ${wfState.fullPlanGoal || currentDynamicPlan.goal}` }, isComplete: true, llmUsage: totalLlmUsage, intentType: "confirmation_positive", ttsInstructions: null, variables: wfState.variables };
    }
  }

  public clearWorkflowState(sessionId: string): void { this.activeWorkflows.delete(sessionId); logger.info(`[WF Engine] Cleared active workflow state for session ${sessionId}`); }
  public getActiveWorkflowState(sessionId: string): WorkflowState | undefined { return this.activeWorkflows.get(sessionId) as WorkflowState | undefined; }
}