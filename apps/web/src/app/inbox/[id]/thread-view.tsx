"use client";

import clsx from "clsx";
import { ArrowLeft, Lock, SendHorizonal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { initials } from "@/components/marketplace/shared";
import type { ChatMessage, ConversationHeader } from "@/components/messaging/types";
import { Button, Pill } from "@/components/ui/primitives";
import { api } from "@/lib/api";

const MAX = 2000;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export function ThreadView({ initial }: { initial: { conversation: ConversationHeader; messages: ChatMessage[] } }) {
  const [conv, setConv] = useState(initial.conversation);
  const [messages, setMessages] = useState(initial.messages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const latest = useRef(initial.messages.at(-1)?.createdAt ?? null);
  const stick = useRef(true);

  // Opening a thread marks it read on the server; tell the header badges to recount.
  useEffect(() => {
    window.dispatchEvent(new Event("sln:notifications-read"));
  }, []);

  useEffect(() => {
    latest.current = messages.at(-1)?.createdAt ?? null;
    if (stick.current) bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // New messages arrive within a few seconds while the thread is open.
  useEffect(() => {
    const poll = () => {
      if (document.visibilityState !== "visible") return;
      const q = latest.current ? `?after=${encodeURIComponent(latest.current)}` : "";
      api<{ conversation: ConversationHeader; messages: ChatMessage[] }>(`/conversations/${conv.id}${q}`)
        .then((r) => {
          setConv(r.conversation);
          if (r.messages.length) {
            setMessages((cur) => [...cur, ...r.messages.filter((m) => !cur.some((x) => x.id === m.id))]);
            window.dispatchEvent(new Event("sln:inbox-changed"));
            window.dispatchEvent(new Event("sln:notifications-read"));
          }
        })
        .catch(() => {});
    };
    const t = setInterval(poll, 4000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [conv.id]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const m = await api<ChatMessage>(`/conversations/${conv.id}/messages`, { method: "POST", json: { body } });
      stick.current = true;
      setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
      setDraft("");
      window.dispatchEvent(new Event("sln:inbox-changed"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const isTraveller = conv.viewer === "TRAVELLER";
  const tripHref = conv.bookingId ? `/bookings/${conv.bookingId}` : isTraveller ? `/trips/${conv.tripId}/bids` : null;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-sep bg-card px-4 py-3 md:rounded-tr-card">
        <Link href="/inbox" aria-label="Back to conversations" className="grid size-9 place-items-center rounded-full hover:bg-fill md:hidden">
          <ArrowLeft className="size-5" />
        </Link>
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-t text-[13px] font-semibold text-accent-ink">
          {initials(conv.counterparty.name)}
        </span>
        <div className="min-w-0 flex-1">
          {conv.counterparty.slug ? (
            <Link href={`/guides/${conv.counterparty.slug}`} className="block truncate font-semibold hover:text-accent-ink">
              {conv.counterparty.name}
            </Link>
          ) : (
            <p className="truncate font-semibold">{conv.counterparty.name}</p>
          )}
          <p className="truncate text-[12px] text-label2">{conv.tripTitle}</p>
        </div>
        {conv.bookingId && <Pill tone="ok">Booked</Pill>}
        {tripHref && (
          <Link href={tripHref} className="shrink-0 text-[13px] font-semibold text-accent-ink underline underline-offset-4">
            {conv.bookingId ? "Booking" : "Bids"}
          </Link>
        )}
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        {messages.length === 0 && <p className="py-10 text-center text-[14px] text-label2">{isTraveller ? "Say hello and ask anything about the trip." : "Introduce yourself and ask what you need to know before bidding."}</p>}
        {messages.map((m, i) => {
          const day = dayLabel(m.createdAt);
          const showDay = i === 0 || dayLabel(messages[i - 1].createdAt) !== day;
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-[11px] font-medium uppercase tracking-wider text-label2">{day}</p>}
              <div className={clsx("flex", m.mine ? "justify-end" : "justify-start")}>
                <div className={clsx("max-w-[82%] rounded-[18px] px-3.5 py-2 text-[14px] leading-snug", m.mine ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md bg-fill")}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={clsx("mt-0.5 text-right text-[10px]", m.mine ? "text-on-accent/70" : "text-label2")}>{time(m.createdAt)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <footer className="border-t border-sep bg-card p-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:rounded-br-card">
        {conv.canSend ? (
          <>
            {!conv.contactAllowed && (
              <p className="mb-2 flex items-start gap-1.5 text-[12px] text-label2">
                <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                Phone numbers and emails are shared automatically once a trip is booked, so there&apos;s no need to swap them here.
              </p>
            )}
            {error && (
              <p role="alert" className="mb-2 rounded-tile bg-danger-t p-2.5 text-[13px] text-danger">
                {error}
              </p>
            )}
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Message</span>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  maxLength={MAX}
                  placeholder="Write a message"
                  className="max-h-32 min-h-11 w-full resize-none rounded-[22px] border border-sep bg-bg px-4 py-2.5 text-[15px] outline-none focus:border-accent"
                />
              </label>
              <Button onClick={send} disabled={sending || !draft.trim()} aria-label="Send message" className="size-11 shrink-0 !px-0">
                <SendHorizonal aria-hidden className="size-5" />
              </Button>
            </div>
          </>
        ) : (
          <p className="rounded-tile bg-fill p-3 text-center text-[13px] text-label2">This conversation is closed because the request is no longer open.</p>
        )}
      </footer>
    </div>
  );
}
