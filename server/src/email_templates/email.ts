export const passwordResetEmail = ({ resetLink, appName = "Video Transcoder" }: { resetLink: string; appName?: string }) => {
  return {
    subject: `${appName} - Reset Your Password`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb">
        <h2 style="color:#111827;margin-bottom:10px;">Reset your password</h2>
        <p style="color:#4b5563;margin:0 0 16px;">We received a request to reset your password. Click the button below to proceed:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a>
        </div>
        <p style="color:#6b7280;font-size:14px;">If you didn’t request this, just ignore this email.</p>
        <hr style="margin:30px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;">This link is valid for 30 minutes.</p>
      </div>
    `,
  };
};

export const verifyEmailTemplate = ({ verifyLink, appName = "Video Transcoder" }: { verifyLink: string; appName?: string }) => {
  return {
    subject: `${appName} - Verify Your Email`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb">
        <h2 style="color:#111827;margin-bottom:10px;">Verify your email</h2>
        <p style="color:#4b5563;margin:0 0 16px;">Welcome to ${appName}! Please confirm your email by clicking the button below:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${verifyLink}" style="display:inline-block;padding:12px 24px;background:#10b981;color:white;border-radius:6px;text-decoration:none;font-weight:600;">Verify Email</a>
        </div>
        <p style="color:#6b7280;font-size:14px;">If you didn't create an account, you can safely ignore this email.</p>
        <hr style="margin:30px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;">This link will expire in 24 hours.</p>
      </div>
    `,
  };
};
