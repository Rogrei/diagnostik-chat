"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Interview = {
  id: string;
  session_id: string;
  customer_name: string | null;
  company: string | null;
  status: string;
  consent_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  turns_count?: number;
};

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/sessions`
        );
        if (!res.ok) throw new Error("Kunde inte hämta intervjuer");
        const data = await res.json();
        setInterviews(data);
      } catch (e: any) {
        console.error("Fel vid hämtning:", e);
        setErr(e.message || "Något gick fel vid hämtning av intervjuer");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="p-6">Laddar intervjuer…</p>;
  }

  if (err) {
    return <p className="p-6 text-red-600">{err}</p>;
  }

  return (
    <section className="p-6">
      <h2 className="text-xl font-semibold mb-4">Intervjuer</h2>

      {interviews.length === 0 ? (
        <p>Inga intervjuer hittades.</p>
      ) : (
        <table className="min-w-full border border-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left">ID</th>
              <th className="border px-3 py-2 text-left">Kund</th>
              <th className="border px-3 py-2 text-left">Företag</th>
              <th className="border px-3 py-2 text-left">Status</th>
              <th className="border px-3 py-2 text-left">Start</th>
              <th className="border px-3 py-2 text-left">Slut</th>
              <th className="border px-3 py-2 text-center">Turns</th>
              <th className="border px-3 py-2 text-center">Visa</th>
            </tr>
          </thead>
          <tbody>
            {interviews.map((i) => (
              <tr key={i.id} className="hover:bg-gray-50">
                <td className="border px-3 py-2 font-mono text-xs">{i.session_id}</td>
                <td className="border px-3 py-2">{i.customer_name || "–"}</td>
                <td className="border px-3 py-2">{i.company || "–"}</td>
                <td className="border px-3 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      i.status === "active"
                        ? "bg-green-100 text-green-800"
                        : i.status === "ended"
                        ? "bg-gray-200 text-gray-700"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {i.status}
                  </span>
                </td>
                <td className="border px-3 py-2">
                  {i.started_at ? new Date(i.started_at).toLocaleTimeString() : "–"}
                </td>
                <td className="border px-3 py-2">
                  {i.ended_at ? new Date(i.ended_at).toLocaleTimeString() : "–"}
                </td>
                <td className="border px-3 py-2 text-center">
                  {i.turns_count ?? 0}
                </td>
                <td className="border px-3 py-2 text-center">
                  <Link
                    href={`/admin/turns/${i.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Öppna
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
