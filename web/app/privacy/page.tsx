import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Transcoder collects, why, who processes it, how long it's kept, and how to get it deleted.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-09-25";

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <p>
          Transcoder (<strong>transcode.procd.cc</strong>) is an independent video transcoding service built and operated by Ayush
          Sharma (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are the controller of the personal data described here. For anything
          privacy-related, reach us at {mail}.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <p>We keep the list short on purpose. We collect only what the service needs to work:</p>
        <ul>
          <li>
            <strong>Account details</strong>: your name, email address, and password. Passwords are hashed with bcrypt before
            they're stored; we never see or keep the plain text.
          </li>
          <li>
            <strong>Your videos</strong>: the source files you upload, plus everything we generate from them: HLS renditions,
            thumbnails, captions and transcripts. Also the metadata you give them (file names, folders, visibility).
          </li>
          <li>
            <strong>API keys</strong>: we store only a one-way hash and a short prefix, never the full key.
          </li>
          <li>
            <strong>Activity</strong>: when your account was created and when it was last active, plus when each API key was
            last used. These help us spot abuse and keep the service healthy.
          </li>
          <li>
            <strong>Technical logs</strong>: our servers and providers keep standard request logs (such as IP address and
            user agent) for security and debugging.
          </li>
        </ul>
        <p>We don't ask for payment details, phone numbers, or anything about you beyond this list.</p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <>
        <ul>
          <li>To run the service: sign you in, store and transcode your videos, and deliver them to viewers.</li>
          <li>
            To send transactional email only: verification and password-reset messages. No newsletters and no marketing.
          </li>
          <li>To protect the service: enforce plan limits, investigate abuse, and fix things that break.</li>
          <li>
            To understand usage in aggregate (for example, how many videos were transcoded this month) so we can plan
            capacity.
          </li>
        </ul>
        <p>
          We don't sell your data, rent it, or use your videos to train AI models. We only open your content when
          it's needed to keep the service running, when you ask us to, or when the law requires it.
        </p>
      </>
    ),
  },
  {
    id: "processors",
    title: "Who processes it",
    body: (
      <>
        <p>A few trusted providers handle data on our behalf, each only for the job below:</p>
        <ul>
          <li>
            <strong>Amazon Web Services</strong>: stores your files in S3 (Frankfurt, eu-central-1), runs transcoding jobs, and
            delivers video through the CloudFront CDN.
          </li>
          <li>
            <strong>Deepgram</strong>: gets the audio track of each upload to produce captions and transcripts.
          </li>
          <li>
            <strong>Resend</strong>: delivers our verification and password-reset emails.
          </li>
          <li>
            <strong>Cloudflare</strong>: sits in front of the site for DNS, TLS and protection, and may collect cookieless,
            aggregate page-view statistics.
          </li>
          <li>
            <strong>Our own servers</strong>: run the application, database and job queue.
          </li>
        </ul>
        <p>
          Some of these providers work outside your country, including in the United States. Where that happens, we rely on
          their standard contractual safeguards for international transfers.
        </p>
      </>
    ),
  },
  {
    id: "visibility",
    title: "Public videos",
    body: (
      <>
        <p>
          Videos are <strong>private by default</strong>. Private media is only served through short-lived signed URLs to you.
        </p>
        <p>
          If you make a video public, anyone with its link or embed code can watch it and see its title and transcript, and it
          can appear on other websites where it's embedded. Switching it back to private cuts off access through our
          links; playback already in progress can take a few hours to expire. Copies someone already downloaded are beyond our reach.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies & storage",
    body: (
      <>
        <p>
          We don't use advertising or tracking cookies, and there are no third-party trackers in the app. To keep you signed
          in, your browser stores two session tokens in local storage. A few interface preferences are stored the same
          way. Signing out clears the tokens.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <>
        <p>
          We keep your account and videos for as long as your account exists. Technical logs are kept only as long as
          they're useful for security and debugging.
        </p>
        <p>
          When you ask us to delete your account, we remove your profile, videos, generated files and API keys from our
          database and storage, usually within 30 days. Encrypted backups can take a little longer to cycle out.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>Wherever you live, you can ask us to:</p>
        <ul>
          <li>give you a copy of the personal data we hold about you;</li>
          <li>correct anything that's wrong;</li>
          <li>delete your account and everything in it;</li>
          <li>restrict or object to a particular use of your data.</li>
        </ul>
        <p>
          You can download your own videos from the dashboard at any time. For everything else, email {mail} from your
          account's address and we'll respond within 30 days. If you're in the EU or UK and aren't happy with our answer, you
          can also complain to your local data protection authority.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <>
        <p>
          All traffic is encrypted over HTTPS. Passwords and API keys are stored only as one-way hashes. Private media sits
          behind signed, expiring URLs, and access to production systems is limited to the operator. No system is perfectly
          secure. If we ever learn of a breach that affects your data, we'll tell you without undue delay.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        Transcoder isn't meant for children. You must be at least 16 to create an account, and we don't knowingly collect data
        from anyone younger. If you think a child has signed up, let us know and we'll remove the account.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change how we handle your data in a meaningful way, we'll update the date at the top of this page and, for
        significant changes, email account holders before they take effect. See also our{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy"
      accent="policy"
      updated={UPDATED}
      sibling={{ href: "/terms", label: "Terms" }}
      summary={[
        "We collect only what's needed to run the service: your account, your videos, and basic activity.",
        "Your videos are private until you choose to share them. We never sell your data or train AI on it.",
        "No ad trackers or tracking cookies. Emails are transactional only.",
        <>
          Ask for a copy or full deletion any time at {mail}.
        </>,
      ]}
      sections={SECTIONS}
    />
  );
}
