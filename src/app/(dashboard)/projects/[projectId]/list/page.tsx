"use client";

import { TaskList } from "@/components/pm/task-list";
import { ViewToolbar } from "@/components/pm/toolbar";
import { NewTaskButton } from "@/components/pm/new-task-button";

export default function Page() {
  return (
    <div className="flex h-full flex-col">
      <ViewToolbar>
        <NewTaskButton />
      </ViewToolbar>
      <div className="min-h-0 flex-1">
        <TaskList />
      </div>
    </div>
  );
}
