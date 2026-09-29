import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ projectId: string; issueId: string }> }) {
  const { projectId, issueId } = await params;
  redirect(`/projects/${projectId}/list?task=${issueId}`);
}
