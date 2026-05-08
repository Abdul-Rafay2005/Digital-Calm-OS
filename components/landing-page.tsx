"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Command,
  Mail,
  Sparkles,
  TimerReset
} from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";
import { AIOrb } from "@/components/ai-orb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const previewItems = [
  {
    icon: Mail,
    title: "Gmail triage",
    body: "4 urgent emails summarized into one decision queue.",
    score: 94
  },
  {
    icon: CalendarDays,
    title: "Calendar pressure",
    body: "Two meeting conflicts resolved before your day starts.",
    score: 87
  },
  {
    icon: TimerReset,
    title: "Focus protection",
    body: "Low-priority tasks disappear during deep work.",
    score: 91
  }
];

export function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientBackground />
      <div className="calm-grid fixed inset-0 z-0 opacity-45" aria-hidden="true" />
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/8 bg-black/30 backdrop-blur-2xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-calm-mint/25 bg-calm-mint/10 text-calm-mint">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <span className="font-display text-sm font-semibold">Digital Calm OS</span>
          </Link>
          <Button asChild variant="calm">
            <Link href="/auth">
              Enter OS
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="relative z-10 flex min-h-screen items-center px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.55 }}
          >
            <Badge variant="mint">
              <Sparkles className="h-3 w-3" />
              AI-powered Digital Calm OS
            </Badge>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[0.96] tracking-normal sm:text-7xl">
              Calm your apps before they reach your brain.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/64 sm:text-lg">
              Connect Gmail, Google Calendar, and Google Tasks. Calm OS turns
              scattered updates into a daily briefing, a priority engine, and a
              protected focus workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auth">
                  Start onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="screen-glow glass-panel overflow-hidden rounded-[2rem] p-5"
            initial={{ opacity: 0, scale: 0.97, y: 24 }}
            transition={{ delay: 0.12, duration: 0.6 }}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <AIOrb label="Pre-briefing your day" />
              <Badge variant="cyan">
                <BarChart3 className="h-3 w-3" />
                Live calm preview
              </Badge>
            </div>
            <div className="mt-8 grid gap-4">
              {previewItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-2xl border border-white/9 bg-white/[0.045] p-4"
                    initial={{ opacity: 0, x: 18 }}
                    key={item.title}
                    transition={{ delay: 0.22 + index * 0.08 }}
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-calm-mint/20 bg-calm-mint/10 text-calm-mint">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h2 className="font-display text-base font-semibold">{item.title}</h2>
                          <span className="text-xs text-calm-mint">{item.score}%</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-white/56">{item.body}</p>
                        <Progress className="mt-3" value={item.score} tone="mint" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/8 bg-white/[0.025] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {[
            ["AI Daily Briefing", "Summaries from connected apps before you open them."],
            ["Priority Engine", "Urgent, important, low priority, and distractions classified instantly."],
            ["Focus Mode", "Only high-priority items survive the deep-work filter."]
          ].map(([title, body]) => (
            <Card className="rounded-[1.5rem]" key={title}>
              <CardContent className="p-5">
                <CheckCircle2 className="h-5 w-5 text-calm-mint" />
                <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/56">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
