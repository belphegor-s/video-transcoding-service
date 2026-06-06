"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Field, Alert, SubmitButton } from "@/components/ui";
import { api, tokens } from "@/lib/api";
import { useRedirectIfAuthenticated } from "@/lib/use-auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const checkingSession = useRedirectIfAuthenticated();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    setServerError(null);
    try {
      const res = await api.login(values);
      tokens.set(res.accessToken, res.refreshToken);
      router.replace("/dashboard");
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

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your transcoding dashboard."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert>{serverError}</Alert>}
        <Field label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
        <Field label="Password" type="password" autoComplete="current-password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="font-mono text-[11px] text-muted hover:text-ink">
            Forgot password?
          </Link>
        </div>
        <SubmitButton loading={isSubmitting}>Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
