import type { Metadata } from "next";

export const metadata: Metadata = { title: "Messages" };

export default function InboxPage() {
  return (
    <div className="grid h-full place-items-center p-8 text-center text-label2">
      <p>Select a conversation to read it.</p>
    </div>
  );
}
