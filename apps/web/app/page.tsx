import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Diagnostik-chat (Pilot-MVP)</h1>
      <p className="mt-2">Välkommen! Vi börjar med samtycke innan intervjun kan starta.</p>
      <Link className="mt-4 inline-block rounded bg-black px-4 py-2 text-white" href="/consent">
        Gå till samtycke
      </Link>
    </div>
  );
}
