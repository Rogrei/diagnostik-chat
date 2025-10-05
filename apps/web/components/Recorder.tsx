// apps/web/components/Recorder.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type RecorderProps = {
  sessionId?: string;
  interviewId: string;
  onStop?: () => void;
  onReady?: () => void;
};

export default function Recorder({
  sessionId,
  interviewId,
  onStop,
  onReady,
}: RecorderProps) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const serverStartRef = useRef<string | null>(null);

  function getServerSyncedStart(): string {
    const offsetMs = Number(localStorage.getItem("timeOffsetMs") || "0");
    const now = Date.now();
    return new Date(now - offsetMs).toISOString();
  }

  // 🎙️ Starta inspelning automatiskt
  useEffect(() => {
    async function startRecording() {
      if (!interviewId) return;

      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (onReady) onReady();

        const recorder = new MediaRecorder(micStream, {
          mimeType: "audio/webm;codecs=opus",
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

        recorder.onstop = async () => {
          const fullBlob = new Blob(chunks, { type: "audio/webm" });

          const formData = new FormData();
          formData.append("file", fullBlob, "interview_full.webm");
          formData.append("startedAtClient", new Date(startTimeRef.current ?? Date.now()).toISOString());
          formData.append("startedAtServer", serverStartRef.current ?? getServerSyncedStart());

          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/transcribe/full?interviewId=${encodeURIComponent(interviewId)}`,
              { method: "POST", body: formData }
            );
            if (!res.ok) throw new Error(`Fel vid uppladdning: ${res.status}`);
            const data = await res.json();
            console.log("✅ Ljudfil sparad:", data);
          } catch (err) {
            console.error("🚫 Kunde inte spara ljudfil:", err);
          } finally {
            onStop?.();
          }
        };

        startTimeRef.current = Date.now();
        serverStartRef.current = getServerSyncedStart();
        mediaRecorderRef.current = recorder;
        recorder.start();
        setRecording(true);
        console.log("🎙️ Inspelning startad");
      } catch (err) {
        console.error("🚫 Kunde inte starta inspelning:", err);
      }
    }

    startRecording();

    return () => {
      // säkerhets-stopp vid navigering
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [interviewId]);

  // 🔴 Manuell stoppfunktion
  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
    console.log("🟥 Inspelning stoppad manuellt");
  }

  return (
    <div className="mt-4">
      {recording ? (
        <button
          onClick={stopRecording}
          className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          🛑 Avsluta intervjun
        </button>
      ) : (
        <p className="text-sm text-gray-500">🟢 Intervjun avslutad</p>
      )}
    </div>
  );
}
