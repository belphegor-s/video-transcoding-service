"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Field, Alert, SubmitButton } from "@/components/ui";
import { api } from "@/lib/api";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: Form) => {
    setServerError(null);
    try {
      await api.requestReset(email);
      setSent(true);
    } catch (e: any) {
      setServerError(e?.message ?? "Something went wrong");
    }
  };

  if (sent) {
    return (
      <AuthShell title="Reset link sent" subtitle="Check your email for a link to set a new password.">
        <div className="space-y-6">
          <div className="flex items-center justify-center rounded-2xl border border-border bg-surface py-10">
            <MailCheck className="h-10 w-10 text-accent" strokeWidth={1.5} />
          </div>
          <Link href="/login" className="btn-ghost w-full py-3">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert>{serverError}</Alert>}
        <Field label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
        <SubmitButton loading={isSubmitting}>Send reset link</SubmitButton>
      </form>
    </AuthShell>
  );
}
