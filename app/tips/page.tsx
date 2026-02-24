import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photo Tips — Picture Pros AI",
  description: "Get the best AI portrait results. Simple tips for uploading the perfect photo.",
};

const DOS = [
  {
    title: "Use a Clear, Well-Lit Photo",
    desc: "Natural daylight works best. Avoid harsh shadows or backlit silhouettes. The AI needs to see the face clearly.",
    icon: "☀️",
  },
  {
    title: "Face the Camera",
    desc: "Front-facing or slight angle works great. The more of the face visible, the better the portrait turns out.",
    icon: "📸",
  },
  {
    title: "Show the Full Upper Body",
    desc: "Waist-up or full-body shots give the AI more to work with — especially the jersey, uniform details, and posture.",
    icon: "🧍",
  },
  {
    title: "Wear the Uniform",
    desc: "The AI reproduces exactly what it sees. If your kid is in their game jersey, the portrait will match perfectly.",
    icon: "👕",
  },
  {
    title: "Keep the Background Simple",
    desc: "A clean background helps the AI focus on the athlete. A field, gym, or even a backyard works well.",
    icon: "🌿",
  },
  {
    title: "Higher Resolution = Better Results",
    desc: "Use the original photo from your phone camera, not a screenshot or compressed version from social media.",
    icon: "📱",
  },
];

const DONTS = [
  {
    title: "Blurry or Out-of-Focus Photos",
    desc: "If the face isn't sharp in the original, the AI can't fix it. Make sure the photo is in focus before uploading.",
  },
  {
    title: "Sunglasses or Face Coverings",
    desc: "The AI needs to see the eyes and full face. Remove sunglasses, masks, or anything blocking facial features.",
  },
  {
    title: "Group Photos",
    desc: "Upload a photo with just one person. The AI works best with a single subject — crop others out if needed.",
  },
  {
    title: "Heavy Filters or Edits",
    desc: "Skip the Instagram filters. The AI performs best on natural, unedited photos with accurate skin tones and colors.",
  },
  {
    title: "Tiny or Cropped Thumbnails",
    desc: "Don't use a profile picture or heavily cropped image. The AI needs enough detail to generate a quality portrait.",
  },
];

export default function TipsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-300 transition mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400 mb-6">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            Photo Tips
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Get the Best <span className="gradient-text">Results</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            The AI is only as good as the photo you give it. Follow these simple tips and your portraits will look incredible.
          </p>
        </div>
      </section>

      {/* Do's */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-black">What Works Best</h2>
          </div>

          <div className="space-y-4">
            {DOS.map((tip) => (
              <div
                key={tip.title}
                className="flex gap-4 items-start rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6"
              >
                <span className="text-2xl shrink-0 mt-0.5">{tip.icon}</span>
                <div>
                  <h3 className="font-bold text-sm mb-1">{tip.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Don'ts */}
      <section className="py-16 sm:py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-black">What to Avoid</h2>
          </div>

          <div className="space-y-4">
            {DONTS.map((tip) => (
              <div
                key={tip.title}
                className="flex gap-4 items-start rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6"
              >
                <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">{tip.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-16 sm:py-20 border-t border-white/5 bg-gradient-to-b from-transparent to-slate-900/30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-6">
            TL;DR
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 text-left">
            <p className="text-sm text-slate-300 leading-relaxed">
              <span className="font-bold text-white">The perfect upload:</span> A clear, well-lit photo of one person in their uniform, 
              facing the camera, waist-up or full body, taken with a phone camera (not a screenshot). 
              That&apos;s it — the AI handles the rest.
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 mt-8 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-0.5"
          >
            Try It Now
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Picture Pros. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <Link href="/privacy" className="hover:text-slate-400 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-400 transition">Terms of Service</Link>
            <a href="mailto:sales@picturepros.com" className="hover:text-slate-400 transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
