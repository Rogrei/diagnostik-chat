// apps/web/app/consent/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/api";

const CONSENT_TEXT =
  "Hej! Innan vi börjar vill jag berätta hur vi hanterar det här samtalet. " +
  "Det spelas in och görs om till text. Informationen används bara för att analysera dina behov och ta fram en rapport. " +
  "Allt lagras säkert inom EU, och du kan alltid be oss radera dina uppgifter. " +
  "Om du samtycker – klicka 'Jag samtycker'. Om du inte vill delta – klicka 'Jag samtycker inte'.";

export default function ConsentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setErr(null);
    try {
      const { sessionId } = await apiPost<{ sessionId: string; id: string; status: string }>(
        "/api/session/start",
        { accept: true, consentMethod: "ui" }
      );

      // ✅ bygg URL säkert på klienten
      const url = new URL("/interview", location.origin);
      url.searchParams.set("sessionId", sessionId);

      router.push(url.toString() as any);
    } catch (e: any) {
      console.error("API error", e);
      setErr(e.message || "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="p-6">
      <h2 className="text-xl font-semibold">Samtycke</h2>
      <p className="mt-3 leading-relaxed">{CONSENT_TEXT}</p>

      <div className="mt-6 flex gap-3">
        <button
          className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-70"
          onClick={handleAccept}
          disabled={loading}
        >
          {loading ? "Startar..." : "Jag samtycker"}
        </button>
        <button
          className="rounded bg-gray-200 px-4 py-2"
          onClick={() => router.push("/thank-you" as any)}
        >
          Jag samtycker inte
        </button>
      </div>

      {err && <p className="mt-4 text-sm text-red-700">{err}</p>}
    </section>
  );
}


