import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendEmail = async ({ to, subject, html, from }: SendEmailOptions) => {
  const sender = from || "Ayush Sharma <hello@ayushsharma.me>";
  return await resend.emails.send({
    from: sender,
    to,
    subject,
    html,
  });
};
