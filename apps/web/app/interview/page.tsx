// apps/web/app/interview/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { apiPost } from "@/lib/api";
import Recorder from "@/components/Recorder";

type InterviewStatus = {
  sessionId: string;
  status: "active" | "ended";
  consentAt: string;
  startedAt: string;
  endedAt?: string | null;
};

function InterviewContent() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("sessionId");

  const [status, setStatus] = useState<InterviewStatus | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const aiFirstSavedRef = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recorderReady, setRecorderReady] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 🟢 Läs interviewId från localStorage
  useEffect(() => {
    const storedInterviewId = localStorage.getItem("interviewId");
    if (storedInterviewId) {
      setInterviewId(storedInterviewId);
      console.log("📦 interviewId hämtat från localStorage:", storedInterviewId);
    } else {
      console.warn("⚠️ Inget interviewId i localStorage.");
    }
  }, []);

  // 🔎 Hämta status för sessionen
  useEffect(() => {
    if (!sessionId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/session/${sessionId}`)
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(() => setErr("Kunde inte hämta sessionstatus"));
  }, [sessionId]);

  // 🎧 WebRTC-init (startar först när recorder är klar)
  useEffect(() => {
    if (!sessionId || !interviewId || !recorderReady) return;

    async function initRealtime() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/realtime/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }
        );
        const { token } = await res.json();

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const dc = pc.createDataChannel("oai-events");

        // 📡 När datakanalen öppnas – skicka AI-instruktion
        dc.onopen = () => {
          dc.send(
            JSON.stringify({
              type: "response.create",
              response: {
                instructions: `
Du är en vänlig intervjuare i en diagnostisk samtalsapp.
Börja alltid med en tydlig välkomsthälsning på svenska, till exempel:
"Hej och välkommen! Jag kommer nu att ställa några frågor för att förstå hur ni arbetar.
Ni behöver inte svara ännu – jag börjar med en kort introduktion."
Vänta ett ögonblick och ställ sedan din första fråga, t.ex.:
"Kan du börja med att berätta lite om ert företag?"
Efter det fortsätter du i ett naturligt samtalstempo utan att avbryta användaren.`,
                modalities: ["audio", "text"],
                voice: "verse",
              },
            })
          );
        };

        // 🧠 Händelser från Realtime API
        dc.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);

            // 🎤 1. Löpande text
            if (msg.type === "response.audio_transcript.delta") {
              const piece = msg.delta ?? msg.text ?? "";
              if (piece) setTranscript((prev) => prev + piece);
            }

            // 🗣️ 2. När användarens tal är färdigt
            if (
              msg.type === "response.audio_transcript.done" ||
              msg.type === "response.input_audio_transcript.done"
            ) {
              const final = msg.transcript ?? msg.text ?? "";
              if (!final) return;

              const cleaned = final.replace(/\[sätter en kort paus\]/gi, "").trim();

              // 🧭 Kolla om detta är användarens första turn
              const hasUserTurned = localStorage.getItem("userHasSpoken") === "true";

              const now = new Date();
              let startedAt = now;

              // 🕒 Första användarsvaret — vänta 1 sekund för att AI:s hälsning ska hinna sparas först
              if (!hasUserTurned) {
                startedAt = new Date(now.getTime() + 1000);
                localStorage.setItem("userHasSpoken", "true");
                console.log("🕓 Första användar-turn — +1s fördröjning för korrekt ordning");
              }

              await apiPost("/api/turns", {
                interviewId,
                speaker: "user",
                text: cleaned,
                started_at: startedAt.toISOString(),
              }).catch((e) => console.warn("Kunde inte spara user-turn:", e));
            }

            // 🤖 3. När AI:s svar är färdigt
            // 🤖 3. När AI:s svar är färdigt
            if (msg.type === "response.output_item.done" && interviewId) {
              const aiText =
                msg.item?.content?.find((c: any) => c.type === "output_text")?.text || "";

              if (aiText) {
                const cleanedAI = aiText.replace(/\[sätter en kort paus\]/gi, "").trim();

                // ✅ Första AI-turnen får intervjuns starttid → blir garanterat först i listan
                const payload: any = {
                  interviewId,
                  speaker: "ai",
                  text: cleanedAI,
                };

                if (!aiFirstSavedRef.current) {
                  const base = status?.startedAt
                    ? new Date(status.startedAt)
                    : new Date(); // fallback om status ej hunnit laddas
                  payload.started_at = base.toISOString();
                  aiFirstSavedRef.current = true;
                  console.log("🕓 Första AI-turn – satte started_at till intervjustart:", payload.started_at);
                }

                await apiPost("/api/turns", payload).catch((e) =>
                  console.warn("Kunde inte spara AI-turn:", e)
                );
              }
            }

            console.log("Realtime event:", msg);
          } catch (err) {
            console.warn("Non-JSON message:", event.data, err);
          }
        };

        // 🎧 Koppla mikrofon och AI-ljud
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

        pc.ontrack = (event) => {
          if (audioRef.current) {
            audioRef.current.srcObject = event.streams[0];
          }
        };

        // 🔄 Skicka offer till OpenAI
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch(
          "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&voice=verse",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/sdp",
            },
            body: offer.sdp,
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
  }, [sessionId, interviewId, recorderReady]);

  // 🔚 Avsluta sessionen
  async function endSession() {
    if (!sessionId || ending) return;
    setEnding(true);
    setErr(null);

    try {
      await apiPost("/api/session/end", { sessionId });
      router.push(`/thank-you?sessionId=${encodeURIComponent(sessionId)}` as any);
    } catch (e: any) {
      console.error("Fel vid avslut:", e);
      setErr(e.message || "Kunde inte avsluta sessionen");
    } finally {
      setEnding(false);
    }
  }

  if (!sessionId) return <p>Ingen sessionId hittades. Gå tillbaka till startsidan.</p>;

  return (
    <section className="p-6">
      <h2 className="text-xl font-semibold">Intervju – Realtime</h2>
      <p className="mt-2 text-sm text-gray-600">Session: {sessionId}</p>
      {interviewId && (
        <p className="mt-1 text-sm text-gray-600">
          Intervju: <span className="font-mono">{interviewId}</span>
        </p>
      )}

      {status && (
        <p className="mt-2 text-sm">
          Status:{" "}
          <span
            className={
              status.status === "active" ? "text-green-600" : "text-red-600"
            }
          >
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

      {interviewId && (
        <Recorder
          sessionId={sessionId}
          interviewId={interviewId}
          onReady={() => setRecorderReady(true)}
          onStop={endSession}
        />
      )}

      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
    </section>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<p>Laddar intervjun …</p>}>
      <InterviewContent />
    </Suspense>
  );
}