export default function Loading() {
  return (
    <main className="min-h-screen bg-[#050505] p-6 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
        <div className="h-48 w-full max-w-xl animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
      </div>
    </main>
  );
}
