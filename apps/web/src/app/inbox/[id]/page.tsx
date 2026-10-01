import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { ChatMessage, ConversationHeader } from "@/components/messaging/types";
import { ThreadView } from "./thread-view";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage(props: PageProps<"/inbox/[id]">) {
  const { id } = await props.params;
  let data: { conversation: ConversationHeader; messages: ChatMessage[] };
  try {
    data = await serverApi<{ conversation: ConversationHeader; messages: ChatMessage[] }>(`/conversations/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/signin?next=/inbox/${id}`);
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return <ThreadView key={id} initial={data} />;
}
