"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
      <section className="max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-2xl">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-300" />
        <h1 className="font-display text-2xl font-semibold">Signal interrupted</h1>
        <p className="mt-3 text-sm leading-6 text-white/62">
          Digital Calm OS could not render this view. Try refreshing the interface.
        </p>
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          Recalibrate
        </Button>
      </section>
    </main>
  );
}
