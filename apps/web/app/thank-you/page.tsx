// apps/web/app/thank-you/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type InterviewStatus = {
  sessionId: string;
  status: "active" | "ended";
  consentAt: string;
  startedAt: string;
  endedAt?: string | null;
};

export default function ThankYouPage() {
  const params = useSearchParams();
  const sessionId = params.get("sessionId");
  const [status, setStatus] = useState<InterviewStatus | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/session/${sessionId}`)
      .then(r => r.json())
      .then(data => setStatus(data))
      .catch(() => {});
  }, [sessionId]);

  return (
    <section className="p-6 text-center">
      <h2 className="text-2xl font-semibold">Tack!</h2>
      <p className="mt-4 text-lg text-gray-700">Intervjun är nu avslutad.</p>

      {status && (
        <p className="mt-2 text-gray-500">
          Status i databasen: {status.status} <br />
          Avslutad: {status.endedAt || "–"}
        </p>
      )}
    </section>
  );
}

