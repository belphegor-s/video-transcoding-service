"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Field, Alert, SubmitButton } from "@/components/ui";
import { api } from "@/lib/api";
import { useRedirectIfAuthenticated } from "@/lib/use-auth";

const schema = z.object({
  name: z.string().min(2, "At least 2 characters").max(255),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/,
      "Needs upper, lower, number & symbol",
    ),
});
type Form = z.infer<typeof schema>;

export default function SignupPage() {
  const checkingSession = useRedirectIfAuthenticated();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    setServerError(null);
    try {
      await api.signup(values);
      setSentTo(values.email);
    } catch (e: any) {
      setServerError(e?.message ?? "Something went wrong");
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox" subtitle={`We sent a verification link to ${sentTo}.`}>
        <div className="space-y-6">
          <div className="flex items-center justify-center rounded-2xl border border-border bg-surface py-10">
            <MailCheck className="h-10 w-10 text-accent" strokeWidth={1.5} />
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Click the link in that email to verify your account, then sign in. The link expires in 24
            hours.
          </p>
          <Link href="/login" className="btn-ghost w-full py-3">
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start turning source files into adaptive streams."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert>{serverError}</Alert>}
        <Field label="Name" autoComplete="name" placeholder="Ada Lovelace" error={errors.name?.message} {...register("name")} />
        <Field label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
        <Field label="Password" type="password" autoComplete="new-password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
        <SubmitButton loading={isSubmitting}>Create account</SubmitButton>
        <p className="text-center font-mono text-[10px] leading-relaxed text-faint">
          8+ chars with an uppercase, lowercase, number &amp; symbol.
        </p>
      </form>
    </AuthShell>
  );
}
