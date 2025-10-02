"use client";

import { useState } from "react";

const CONSENT_TEXT =
  "Hej! Innan vi börjar vill jag berätta hur vi hanterar det här samtalet. " +
  "Det spelas in och görs om till text. Informationen används bara för att analysera dina behov och ta fram en rapport. " +
  "Allt lagras säkert inom EU, och du kan alltid be oss radera dina uppgifter. " +
  "Om du samtycker – klicka 'Jag samtycker'. Om du inte vill delta – klicka 'Jag samtycker inte'.";

export default function ConsentPage() {
  const [decision, setDecision] = useState<"yes" | "no" | null>(null);

  return (
    <section>
      <h2 className="text-xl font-semibold">Samtycke</h2>
      <p className="mt-3 leading-relaxed">{CONSENT_TEXT}</p>

      <div className="mt-6 flex gap-3">
        <button
          className="rounded bg-green-600 px-4 py-2 text-white"
          onClick={() => setDecision("yes")}
        >
          Jag samtycker
        </button>
        <button
          className="rounded bg-gray-200 px-4 py-2"
          onClick={() => setDecision("no")}
        >
          Jag samtycker inte
        </button>
      </div>

      {decision === "no" && (
        <p className="mt-4 text-sm text-red-700">Du har valt att inte delta. Ingen data sparas.</p>
      )}
      {decision === "yes" && (
        <p className="mt-4 text-sm text-green-700">Tack! Vi förbereder intervjun …</p>
      )}
    </section>
  );
}
