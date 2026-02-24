import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Picture Pros",
  description: "Privacy Policy for Picture Pros AI portrait generation service.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <nav className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center">
            <img src="/assets/logo/PP%20LOGO%20AI.png" alt="Picture Pros" className="h-9 sm:h-10" />
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: February 23, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Introduction</h2>
            <p>
              Picture Pros (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website{" "}
              <strong className="text-white">picturepros.ai</strong> and provides AI-powered sports portrait
              generation services. This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Account Information:</strong> When you sign in with Google or
                email, we receive your name, email address, and profile photo from your authentication provider.
              </li>
              <li>
                <strong className="text-white">Uploaded Photos:</strong> Photos you upload for AI portrait
                generation. These are processed temporarily and used solely to generate your portrait.
              </li>
              <li>
                <strong className="text-white">Player Details:</strong> Player name, jersey number, and
                position that you provide to personalize the portrait.
              </li>
              <li>
                <strong className="text-white">Payment Information:</strong> When you purchase credits, payment
                is processed securely by Stripe. We do not store your credit card number or full payment details
                on our servers.
              </li>
              <li>
                <strong className="text-white">Usage Data:</strong> We may collect information about how you
                access and use the service, including your IP address, browser type, and pages visited.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To generate AI-powered sports portraits based on your uploaded photos and preferences.</li>
              <li>To manage your account, authenticate your identity, and track your credit balance.</li>
              <li>To process payments and deliver purchased credits.</li>
              <li>To communicate with you about your account or transactions.</li>
              <li>To improve and optimize our service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Photo Data &amp; AI Processing</h2>
            <p>
              Photos you upload are sent to our secure servers for AI processing. We use Google&apos;s Gemini AI
              models to generate portraits. Uploaded photos are processed in real-time and are{" "}
              <strong className="text-white">not permanently stored</strong> on our servers after generation is
              complete. Generated portraits are available for download during your session.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Third-Party Services</h2>
            <p className="mb-3">We use the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Google Firebase:</strong> For user authentication and data storage.
                Subject to{" "}
                <a href="https://firebase.google.com/terms" className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">
                  Google&apos;s Terms of Service
                </a>.
              </li>
              <li>
                <strong className="text-white">Google Cloud / Gemini AI:</strong> For AI image generation and
                cloud infrastructure. Subject to{" "}
                <a href="https://cloud.google.com/terms" className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">
                  Google Cloud Terms
                </a>.
              </li>
              <li>
                <strong className="text-white">Stripe:</strong> For secure payment processing. Subject to{" "}
                <a href="https://stripe.com/privacy" className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">
                  Stripe&apos;s Privacy Policy
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal
              information. All data is transmitted over encrypted connections (HTTPS). However, no method of
              transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Children&apos;s Privacy</h2>
            <p>
              Our service may be used to generate portraits of youth athletes. We require that a parent or
              guardian provide consent and manage the account when the service is used for individuals under
              the age of 13. We do not knowingly collect personal information directly from children under 13
              without parental consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction or deletion of your personal data.</li>
              <li>Object to or restrict the processing of your data.</li>
              <li>Request a copy of your data in a portable format.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at the email below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes
              by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:{" "}
              <a href="mailto:faucheauxcoleman@gmail.com" className="text-indigo-400 hover:text-indigo-300 underline">
                faucheauxcoleman@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-600">
          <Link href="/" className="hover:text-slate-400 transition">Home</Link>
          <Link href="/terms" className="hover:text-slate-400 transition">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
