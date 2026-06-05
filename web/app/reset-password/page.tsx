"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { Field, Alert, SubmitButton } from "@/components/ui";
import { api } from "@/lib/api";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/,
        "Needs upper, lower, number & symbol",
      ),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
type Form = z.infer<typeof schema>;

function ResetInner() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ newPassword }: Form) => {
    setServerError(null);
    if (!token) {
      setServerError("This reset link is missing its token.");
      return;
    }
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (e: any) {
      setServerError(e?.message ?? "Something went wrong");
    }
  };

  return (
    <AuthShell
      title={done ? "Password updated" : "Set a new password"}
      subtitle={done ? "Redirecting you to sign in…" : "Choose a strong password for your account."}
      footer={
        !done && (
          <Link href="/login" className="text-accent hover:underline">
            Back to sign in
          </Link>
        )
      }
    >
      {done ? (
        <Alert kind="success">Your password has been reset. You can now sign in.</Alert>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && <Alert>{serverError}</Alert>}
          <Field label="New password" type="password" autoComplete="new-password" placeholder="••••••••" error={errors.newPassword?.message} {...register("newPassword")} />
          <Field label="Confirm password" type="password" autoComplete="new-password" placeholder="••••••••" error={errors.confirm?.message} {...register("confirm")} />
          <SubmitButton loading={isSubmitting}>Update password</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
