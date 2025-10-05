// apps/web/app/admin/turns/[interviewId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Recorder from "@/components/Recorder";

type TurnRow = {
  id: string;
  interview_id: string;
  speaker: string;
  text: string | null;
  audio_url?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
};

export default function TurnsPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const [rows, setRows] = useState<TurnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // 🔹 Ladda dialogen från backend
  async function loadTurns() {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/turns/${interviewId}`
      );
      if (!res.ok) throw new Error("Kunde inte hämta turns");
      const data = await res.json();

      // 🔹 Sortera lokalt som säkerhetsåtgärd
      data.sort(
        (a: TurnRow, b: TurnRow) =>
          new Date(a.started_at || 0).getTime() -
          new Date(b.started_at || 0).getTime()
      );
      setRows(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 🔁 Retry-transkribering för en specifik turn
  async function retryTranscription(turnId: string) {
    try {
      setRetryingId(turnId);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/transcribe/retry/${turnId}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte transkribera igen");
      alert("✅ Transkribering uppdaterad!");
      await loadTurns();
    } catch (e: any) {
      alert("🚫 Fel: " + e.message);
    } finally {
      setRetryingId(null);
    }
  }

  useEffect(() => {
    loadTurns();
  }, [interviewId]);

  return (
    <section className="p-6">
      <h2 className="text-xl font-semibold mb-2">Dialog</h2>
      <p className="text-sm text-gray-600 mb-4">InterviewId: {interviewId}</p>

      <Recorder interviewId={interviewId} />

      {loading && <p>Laddar dialog…</p>}
      {err && <p className="text-red-600">{err}</p>}

      {!loading && !err && (
        <div className="mt-6 space-y-4">
          {rows.length > 0 ? (
            rows.map((turn) => {
              const isUser = turn.speaker === "user";
              const start = turn.started_at
                ? new Date(turn.started_at).toLocaleTimeString()
                : "";
              const end = turn.ended_at
                ? new Date(turn.ended_at).toLocaleTimeString()
                : "";

              return (
                <div
                  key={turn.id}
                  className={`flex flex-col ${
                    isUser ? "items-start" : "items-end"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-3 shadow-sm ${
                      isUser
                        ? "bg-blue-100 text-gray-800"
                        : "bg-green-100 text-gray-800"
                    }`}
                  >
                    {/* 🕒 Tidsintervall */}
                    {(start || end) && (
                      <span className="block text-xs text-gray-500 mb-1">
                        {start}
                        {end ? ` – ${end}` : ""}
                      </span>
                    )}

                    {/* 💬 Text */}
                    {turn.text ? (
                      <p className="whitespace-pre-line">{turn.text}</p>
                    ) : (
                      <p className="italic text-gray-500">
                        (Ingen text – endast ljud)
                      </p>
                    )}

                    {/* 🔊 Ljudklipp */}
                    {turn.audio_url && (
                      <audio
                        controls
                        src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${turn.audio_url}`}
                        className="mt-2 w-full"
                      />
                    )}
                  </div>

                  {/* 🔁 Transkribera igen */}
                  {!turn.text && turn.audio_url && (
                    <button
                      onClick={() => retryTranscription(turn.id)}
                      disabled={retryingId === turn.id}
                      className="mt-1 text-xs bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 disabled:opacity-50"
                    >
                      {retryingId === turn.id
                        ? "⏳ Transkriberar..."
                        : "🔁 Transkribera igen"}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <p>Inga turns hittades för denna intervju.</p>
          )}
        </div>
      )}
    </section>
  );
}
