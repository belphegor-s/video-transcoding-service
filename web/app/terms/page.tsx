import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Transcoder: your account, your content, acceptable use, limits, and liability.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "2026-09-25";

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    id: "agreement",
    title: "The agreement",
    body: (
      <p>
        These terms cover your use of Transcoder, including the website, dashboard, embeddable player and API (together,
        the &ldquo;Service&rdquo;), operated by Ayush Sharma (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or
        using the Service, you agree to these terms and to our <Link href="/privacy">Privacy Policy</Link>. If you use the
        Service on behalf of an organisation, you confirm you&apos;re authorised to accept these terms for it.
      </p>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <>
        <ul>
          <li>You must be at least 16 and give us a real email address that you control.</li>
          <li>
            Keep your password and API keys secret. Anything done with your credentials counts as done by you, so rotate or
            delete a key as soon as you think it has leaked.
          </li>
          <li>One person per account. Don&apos;t create extra accounts to get around plan limits.</li>
        </ul>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <>
        <p>
          <strong>You own what you upload.</strong> You give us a limited licence to store, copy, transcode, caption and
          deliver your videos, only as needed to run the Service for you and for the viewers you choose to share with. The
          licence ends when you delete the content, except for copies that others already downloaded from public links.
        </p>
        <p>
          You confirm you have the rights to everything you upload, including any music, footage or people in it, and that
          making it public won&apos;t infringe anyone else&apos;s rights.
        </p>
        <p>
          Captions and transcripts are generated automatically and may contain mistakes. Please check them before relying on
          them for accessibility or legal purposes.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>Don&apos;t use the Service to upload, store or share:</p>
        <ul>
          <li>anything illegal, including child sexual abuse material, which we report to the authorities;</li>
          <li>content that infringes copyright, trademarks or other rights;</li>
          <li>content that harasses, threatens, or shares someone&apos;s private information without consent;</li>
          <li>malware, or files meant to exploit the transcoding pipeline.</li>
        </ul>
        <p>And don&apos;t:</p>
        <ul>
          <li>probe, scan or overload the Service, or get around rate limits, quotas or access controls;</li>
          <li>resell raw access to the Service or use it as a general-purpose file host or CDN;</li>
          <li>reverse-engineer private parts of the Service, except where the law allows it.</li>
        </ul>
      </>
    ),
  },
  {
    id: "limits",
    title: "Plans & limits",
    body: (
      <>
        <p>
          The free plan currently includes up to <strong>5 videos</strong> per account (lifetime), up to <strong>1 GB</strong>{" "}
          per file, and up to 5 transcodes at once. Current limits are listed in the <Link href="/docs#limits">API docs</Link>.
          We may change them, but we won&apos;t remove videos you&apos;ve already transcoded because a limit changed.
        </p>
        <p>
          For higher limits or an on-prem deployment, email {mail}. Any paid arrangement will be agreed in writing and will
          take precedence over these terms where they differ.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability",
    body: (
      <p>
        We work hard to keep Transcoder fast and reliable, but it&apos;s provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis. There is no uptime guarantee on the free plan. Transcoding can fail on unusual files, and
        features may change or be retired over time. <strong>Keep your own copy of your source files</strong>. Transcoder is
        not a backup service.
      </p>
    ),
  },
  {
    id: "suspension",
    title: "Suspension & termination",
    body: (
      <>
        <p>
          You can stop using the Service at any time, and ask us to delete your account by emailing {mail}.
        </p>
        <p>
          We may suspend or close an account that breaks these terms, puts the Service or other users at risk, or where the
          law requires it. When we can, we&apos;ll tell you why and give you a chance to fix it or download your content first.
          When the problem is serious, such as illegal content or an active attack, we may act right away.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <>
        <p>
          To the fullest extent the law allows, we aren&apos;t liable for indirect, incidental or consequential losses, or for
          lost profits, revenue, data or goodwill. Our total liability for any claim about the Service is capped at the
          greater of what you paid us in the 12 months before the claim, or USD 50.
        </p>
        <p>
          Nothing here limits liability that can&apos;t be limited by law, such as for fraud, or rights you have as a
          consumer that can&apos;t be waived.
        </p>
        <p>
          You agree to cover us for claims brought by third parties that arise from content you upload or from you breaking
          these terms.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms as the Service evolves. We&apos;ll change the date at the top, and for material changes
        we&apos;ll email account holders at least 14 days before they take effect. If you keep using the Service after that,
        you accept the new terms. If you don&apos;t agree, you can close your account.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions, copyright notices, or abuse reports go to {mail}. For copyright complaints, include the video link, the
        work you believe is infringed, and how to reach you.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of"
      accent="service"
      updated={UPDATED}
      sibling={{ href: "/privacy", label: "Privacy" }}
      summary={[
        "You own your videos. We only use them to transcode and deliver them for you.",
        "Upload only what you have the rights to, and nothing illegal or abusive.",
        "The free plan has limits and no uptime guarantee. Keep your own copy of your source files.",
        "We may suspend accounts that break these rules, and we'll usually tell you first.",
      ]}
      sections={SECTIONS}
    />
  );
}
