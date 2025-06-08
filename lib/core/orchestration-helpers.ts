import { BaseTool } from '../tools/base-tool';
import { XmlPlanStep, XmlParallelExecutionGroup } from '../types';

/**
 * Convert a tool registry into a formatted string description for planning system
 */
export function getToolDescriptionsForPlanner(toolRegistry: { [key: string]: BaseTool }): string {
  const toolDescriptions = Object.entries(toolRegistry).map(([name, tool]) => {
    // Format the tool's argument schema for better readability
    const argsDescription = tool.argsSchema && tool.argsSchema.properties
      ? Object.entries(tool.argsSchema.properties).map(([argName, argSchema]: [string, any]) => {
          const required = tool.argsSchema.required?.includes(argName) ? "required" : "optional";
          return `      - ${argName} (${required}): ${argSchema.description || 'No description'}`;
        }).join('\n')
      : '      No arguments required';

    return `
  Tool: ${name}
    Description: ${tool.description || 'No description available'}
    Arguments:
${argsDescription}`;
  }).join('\n');

  return `Available Tools:
${toolDescriptions}`;
}

/**
 * Extension to BaseTool for argument validation
 * @param tool The tool to validate arguments for
 * @param args The arguments to validate
 * @returns True if arguments are valid, false otherwise
 */
export function validateToolArgs(tool: BaseTool, args: Record<string, any>): boolean {
  // If no schema, assume valid
  if (!tool.argsSchema) {
    return true;
  }
  
  // Check that all required arguments are present
  if (tool.argsSchema.required) {
    for (const requiredArg of tool.argsSchema.required) {
      if (!(requiredArg in args) || args[requiredArg] === undefined || args[requiredArg] === null) {
        return false;
      }
    }
  }
  
  // Perform more detailed validation if needed
  // For now, just check required args presence
  return true;
}

/**
 * Sorts execution groups by dependencies using topological sort
 */
export function sortExecutionGroupsByDependencies(
  executionGroups: XmlParallelExecutionGroup[],
  dependencies: { group_id: number, depends_on: number | null }[]
): number[] {
  // Create a map of dependencies
  const dependencyMap = new Map<number, number | null>();
  dependencies.forEach(dep => {
    dependencyMap.set(dep.group_id, dep.depends_on);
  });
  
  // Add any groups that don't have explicit dependencies
  executionGroups.forEach(group => {
    if (!dependencyMap.has(group.id)) {
      dependencyMap.set(group.id, null); // No dependencies
    }
  });
  
  // Sort groups by dependencies (topological sort)
  const sorted: number[] = [];
  const visited = new Set<number>();
  const temp = new Set<number>();
  
  // Recursive helper for topological sort
  const visit = (groupId: number) => {
    if (temp.has(groupId)) {
      // Circular dependency, break the cycle
      return;
    }
    if (visited.has(groupId)) {
      return;
    }
    
    temp.add(groupId);
    
    const dependsOn = dependencyMap.get(groupId);
    if (dependsOn !== null && dependsOn !== undefined) {
      visit(dependsOn);
    }
    
    temp.delete(groupId);
    visited.add(groupId);
    sorted.push(groupId);
  };
  
  // Visit all groups
  for (const groupId of dependencyMap.keys()) {
    if (!visited.has(groupId)) {
      visit(groupId);
    }
  }
  
  return sorted;
} 