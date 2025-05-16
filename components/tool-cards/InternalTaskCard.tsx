//components/tool-cards/InternalTaskCard.tsx
"use client";

import { InternalTaskResult, InternalTask } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckSquare, ListTodo, PlusCircle, AlertCircle } from "lucide-react";

interface InternalTaskCardProps { data: InternalTaskResult; }

export function InternalTaskCard({ data }: InternalTaskCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No task data available.</p>;
  const userName = data.query?.context?.userName || "User";

  const renderTaskItem = (task: InternalTask) => (
    <li key={task.id} className="flex items-start gap-2 p-2 border-b last:border-b-0">
        {task.status === 'completed' ? <CheckSquare size={16} className="text-green-500 mt-0.5"/> : <ListTodo size={16} className="text-amber-500 mt-0.5"/>}
        <div className="flex-1">
            <p className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.content}</p>
            {task.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(task.due_date + "T00:00:00").toLocaleDateString()}</p>}
            <p className="text-xs text-muted-foreground/70">ID: {task.id.substring(0,6)}...</p>
        </div>
    </li>
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            {data.action === "add_task" ? <PlusCircle className="h-5 w-5 text-primary"/> : <ListTodo className="h-5 w-5 text-primary"/>}
            Task Manager
        </CardTitle>
        <CardDescription>Action: {data.action.replace("_", " ")}{data.filter && data.action === 'list_tasks' ? ` (Filter: ${data.filter})` : ""}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.status === "error" && data.error && (
            <p className="text-destructive text-sm flex items-center gap-1"><AlertCircle size={16}/> {data.error}</p>
        )}
        {data.status === "task_added" && data.tasks?.[0] && (
            <>
                <p className="text-green-600 text-sm mb-2">Task added successfully for {userName}!</p>
                {renderTaskItem(data.tasks[0])}
            </>
        )}
        {data.status === "task_completed" && data.tasks?.[0] && (
            <>
                <p className="text-green-600 text-sm mb-2">Task marked as complete for {userName}!</p>
                {renderTaskItem(data.tasks[0])}
            </>
        )}
         {data.status === "already_completed" && data.tasks?.[0] && (
            <>
                <p className="text-amber-600 text-sm mb-2">Task was already complete for {userName}.</p>
                {renderTaskItem(data.tasks[0])}
            </>
        )}
        {data.status === "tasks_listed" && data.tasks && (
            data.tasks.length > 0 ? (
                 <ul className="space-y-1 max-h-60 overflow-y-auto">
                    {data.tasks.map(renderTaskItem)}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No tasks found for {userName} matching the criteria.</p>
            )
        )}
        {data.status === "not_found" && (
             <p className="text-sm text-muted-foreground">Task not found for {userName}.</p>
        )}
      </CardContent>
    </Card>
  );
}