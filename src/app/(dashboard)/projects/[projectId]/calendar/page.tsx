"use client";

import { CalendarView } from "@/components/pm/calendar";
import { ViewToolbar } from "@/components/pm/toolbar";
import { NewTaskButton } from "@/components/pm/new-task-button";

export default function Page() {
  return (
    <div className="flex h-full flex-col">
      <ViewToolbar>
        <NewTaskButton />
      </ViewToolbar>
      <div className="min-h-0 flex-1">
        <CalendarView />
      </div>
    </div>
  );
}
