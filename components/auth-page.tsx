"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Fingerprint,
  Loader2,
  Mail,
  ShieldCheck
} from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuthMode = "signup" | "login";
type AuthStep = "email" | "code";

export function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [step, setStep] = useState<AuthStep>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Enter your email and we will send a secure verification code.");
  const [error, setError] = useState("");

  const requestCode = async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mode })
    });
    const payload = (await response.json()) as { error?: string; message?: string };

    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Unable to send verification code.");
      return;
    }

    setMessage(payload.message ?? "Verification code sent.");
    setStep("code");
  };

  const verifyCode = async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, email, name: mode === "signup" ? name : undefined })
    });
    const payload = (await response.json()) as { error?: string };

    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Verification failed.");
      return;
    }

    router.push("/connect");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 text-white">
      <AmbientBackground />
      <div className="calm-grid fixed inset-0 z-0 opacity-45" aria-hidden="true" />
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel relative z-10 w-full max-w-xl overflow-hidden rounded-[2rem] p-6 sm:p-8"
        initial={{ opacity: 0, y: 20 }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-calm-mint/70 to-transparent" />
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-calm-mint/25 bg-calm-mint/10 text-calm-mint">
          <BrainCircuit className="h-6 w-6" />
        </span>
        <Badge className="mt-6" variant="mint">
          <Fingerprint className="h-3 w-3" />
          Email verified identity
        </Badge>
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-normal">
          {mode === "signup" ? "Create your calm workspace." : "Welcome back to Calm OS."}
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/60">{message}</p>

        <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          {(["signup", "login"] as AuthMode[]).map((option) => (
            <button
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition",
                mode === option ? "bg-calm-mint/12 text-calm-mint" : "text-white/52 hover:text-white"
              )}
              key={option}
              onClick={() => {
                setMode(option);
                setStep("email");
                setError("");
              }}
            >
              {option === "signup" ? "Sign up" : "Log in"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {mode === "signup" && step === "email" ? (
            <AuthInput
              label="Name"
              onChange={setName}
              placeholder="Ada Lovelace"
              value={name}
            />
          ) : null}
          <AuthInput
            label="Email"
            onChange={setEmail}
            placeholder="you@company.com"
            type="email"
            value={email}
          />
          {step === "code" ? (
            <AuthInput
              label="Verification code"
              onChange={setCode}
              placeholder="123456"
              value={code}
            />
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-calm-rose/20 bg-calm-rose/10 px-4 py-3 text-sm text-calm-rose">
            {error}
          </div>
        ) : null}

        <Button
          className="mt-8 w-full"
          disabled={loading}
          onClick={step === "email" ? requestCode : verifyCode}
          size="lg"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : step === "email" ? <Mail className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {step === "email" ? "Send verification code" : "Verify and continue"}
        </Button>

        {step === "code" ? (
          <Button className="mt-3 w-full" onClick={requestCode} variant="ghost">
            Resend code
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </motion.section>
    </main>
  );
}

function AuthInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/42">
        {label}
      </span>
      <input
        className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-calm-mint/35 focus:bg-white/[0.07]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}
