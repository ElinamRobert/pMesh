import { NewProjectForm } from "@/components/projects/new-project-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create a new project
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define your product. ProductPilot AI will use this context in every
          conversation.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
