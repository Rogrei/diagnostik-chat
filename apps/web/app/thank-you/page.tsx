// apps/web/app/thank-you/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ThankYouContent() {
  const params = useSearchParams();
  const sessionId = params.get("sessionId");

  return (
    <section className="p-6">
      <h2 className="text-xl font-semibold">Tack för din medverkan!</h2>
      <p className="mt-3 text-gray-600">
        Intervjun är avslutad.
      </p>
      {sessionId && (
        <p className="mt-2 text-sm text-gray-500">
          Session: {sessionId}
        </p>
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
