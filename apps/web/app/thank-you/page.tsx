// apps/web/app/thank-you/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

type SessionInfo = {
  sessionId: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
};

function ThankYouContent() {
  const params = useSearchParams();
  const sessionId = params.get("sessionId");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    async function loadSession() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/session/${sessionId}`
        );
        if (!res.ok) throw new Error("Kunde inte hämta sessionen");
        const data = await res.json();
        setSessionInfo(data);
      } catch (err) {
        console.error("❌ Kunde inte ladda session:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId]);

  if (loading) return <p>Laddar …</p>;

  return (
    <section className="p-6">
      <h2 className="text-xl font-semibold">Tack för din medverkan!</h2>
      <p className="mt-3 text-gray-600">
        Intervjun är nu avslutad och inspelningen har sparats.
      </p>

      {sessionInfo && sessionInfo.endedAt && (
        <p className="mt-3 text-sm text-gray-500">
          Intervjun avslutades{" "}
          <strong>
            {new Date(sessionInfo.endedAt).toLocaleTimeString("sv-SE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </strong>
          .
        </p>
      )}

      {sessionId && (
        <p className="mt-2 text-xs text-gray-400">Session-ID: {sessionId}</p>
      )}
    </section>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<p>Laddar …</p>}>
      <ThankYouContent />
    </Suspense>
  );
}