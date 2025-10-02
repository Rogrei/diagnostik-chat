export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen text-gray-900 bg-white">
        <main className="mx-auto max-w-2xl p-6">{children}</main>
      </body>
    </html>
  );
}
