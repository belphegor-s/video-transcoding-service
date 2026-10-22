"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { LoadingRegion, Skeleton } from "@/components/skeleton";
import { api } from "@/lib/api";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setState("error");
      setMessage("No verification token found in this link.");
      return;
    }
    api
      .verifyEmail(token)
      .then(() => setState("ok"))
      .catch((e: any) => {
        setState("error");
        setMessage(e?.message ?? "Verification failed.");
      });
  }, [token]);

  return (
    <AuthShell
      title={state === "ok" ? "Email verified" : state === "error" ? "Couldn't verify" : "Verifying…"}
      subtitle={
        state === "ok"
          ? "Your account is ready. You can sign in now."
          : state === "error"
            ? "This link may have expired or already been used."
            : "Hang tight while we confirm your email."
      }
    >
      <div className="space-y-6">
        <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface py-10">
          {state === "loading" && (
            <LoadingRegion label="Verifying your email">
              <Skeleton className="h-10 w-10 rounded-full" />
            </LoadingRegion>
          )}
          {state === "ok" && <CheckCircle2 className="h-10 w-10 text-ok" strokeWidth={1.5} />}
          {state === "error" && <XCircle className="h-10 w-10 text-danger" strokeWidth={1.5} />}
        </div>
        {state === "error" && <p className="text-center font-mono text-[11px] text-danger">{message}</p>}
        {state === "loading" ? (
          <Skeleton className="h-12 rounded-full" />
        ) : (
          <Link href="/login" className="btn-primary w-full py-3">
            Continue to sign in
          </Link>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
