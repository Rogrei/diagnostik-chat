// apps/web/app/interview/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api";

type InterviewStatus = {
  sessionId: string;
  status: "active" | "ended";
  consentAt: string;
  startedAt: string;
  endedAt?: string | null;
};

export default function InterviewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("sessionId");

  const [status, setStatus] = useState<InterviewStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [transcript, setTranscript] = useState("");   // ✅ flyttad in hit

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 🔎 Hämta status från API
  useEffect(() => {
    if (!sessionId) return;

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/session/${sessionId}`)
      .then(r => r.json())
      .then(data => setStatus(data))
      .catch(() => setErr("Kunde inte hämta sessionstatus"));
  }, [sessionId]);

  // Initiera WebRTC
  useEffect(() => {
    if (!sessionId) return;

    async function initRealtime() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/realtime/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        });
        const { token } = await res.json();

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        // Data channel → transcript
        const dc = pc.createDataChannel("oai-events");

        dc.onopen = () => {
          // När kanalen är öppen → be modellen börja producera transkript
          dc.send(JSON.stringify({ type: "response.create" }));
        };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "response.audio_transcript.delta") {
            // bitar av text i delta/text → bara för UI
            const piece = msg.delta ?? msg.text ?? "";
            if (piece) {
              setTranscript((prev) => prev + piece);
            }
          }

          if (msg.type === "response.audio_transcript.done") {
            // hela segmentet klart → spara i DB
            const final = msg.transcript ?? msg.text ?? "";
            if (final) {
              console.log("Final transcript:", final);

              if (sessionId) {
                apiPost("/api/transcripts", { sessionId, text: final })
                  .catch((e) => console.warn("Kunde inte spara transcript:", e));
              }
            }
          }

          // Debug
          console.log("Realtime event:", msg);

        } catch {
          console.warn("Non-JSON message:", event.data);
        }
      };

        // Audio från AI
        pc.ontrack = (event) => {
          if (audioRef.current) {
            audioRef.current.srcObject = event.streams[0];
          }
        };

        // Mikrofon
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch(
          "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&voice=verse",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/sdp"
            },
            body: offer.sdp
          }
        );

        const answer = {
          type: "answer",
          sdp: await sdpResponse.text(),
        };

        await pc.setRemoteDescription(answer as RTCSessionDescriptionInit);
      } catch (e: any) {
        console.error("Realtime init error:", e);
        setErr(e.message || "Kunde inte starta Realtime-anslutning");
      }
    }

    initRealtime();
    return () => {
      pcRef.current?.close();
    };
  }, [sessionId]);

  async function endSession() {
    if (!sessionId) return;
    setEnding(true);
    setErr(null);
    try {
      await apiPost("/api/session/end", { sessionId });
      router.push(`/thank-you?sessionId=${encodeURIComponent(sessionId)}` as any);
    } catch (e: any) {
      setErr(e.message || "Kunde inte avsluta sessionen");
    } finally {
      setEnding(false);
    }
  }

  if (!sessionId) {
    return <p>Ingen sessionId hittades. Gå tillbaka till startsidan.</p>;
  }

  // ✅ Render-delen
  return (
    <section className="p-6">
      <h2 className="text-xl font-semibold">Intervju – Realtime</h2>
      <p className="mt-2 text-sm text-gray-600">Session: {sessionId}</p>

      {status && (
        <p className="mt-2 text-sm">
          Status:{" "}
          <span className={status.status === "active" ? "text-green-600" : "text-red-600"}>
            {status.status}
          </span>
        </p>
      )}

      <div className="mt-6 rounded border p-4">
        <p>Mikrofonen är aktiverad och vi pratar nu med OpenAI Realtime API.</p>
        <audio ref={audioRef} autoPlay playsInline />

        {transcript && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-800 whitespace-pre-wrap">
            {transcript}
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={endSession}
          disabled={ending || status?.status === "ended"}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-70"
        >
          {ending ? "Avslutar…" : "Avsluta intervju"}
        </button>
      </div>

      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
    </section>
  );
}




