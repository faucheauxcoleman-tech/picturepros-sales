"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchSettings, SalesSettings } from "@/lib/api";

const SPORTS = [
  { name: "Soccer", emoji: "⚽" },
  { name: "Basketball", emoji: "🏀" },
  { name: "Baseball", emoji: "⚾" },
  { name: "Football", emoji: "🏈" },
  { name: "Volleyball", emoji: "🏐" },
  { name: "Softball", emoji: "🥎" },
  { name: "Lacrosse", emoji: "🥍" },
  { name: "Hockey", emoji: "🏒" },
];

const STEPS = [
  {
    num: "01",
    title: "Upload a Photo",
    desc: "Snap a pic or upload from your camera roll. Any casual photo works — game day, practice, or backyard.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Pick a Style",
    desc: "Choose a sport and portrait style. Soccer, basketball, baseball — we've got them all with pro-quality backgrounds.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Get Your Portrait",
    desc: "AI generates a stunning pro-quality portrait in seconds. Download instantly or order prints delivered to your door.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
];

const DEFAULT_PRICING = [
  {
    name: "Try It Free",
    price: "$0",
    period: "",
    desc: "See the magic for yourself",
    features: ["2 free AI portraits", "Any sport or style", "Instant download", "Standard resolution"],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Portrait Pack",
    price: "$9",
    period: ".99",
    desc: "Most popular for families",
    features: ["5 AI portraits", "All sports & styles", "HD resolution", "Multiple poses", "Priority generation"],
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Pro Pack",
    price: "$24",
    period: ".99",
    desc: "For the superfan family",
    features: ["15 AI portraits", "All sports & styles", "HD resolution", "Print-ready files", "Priority generation", "8x10 print included"],
    cta: "Go Pro",
    highlight: false,
  },
];

function buildPricingFromSettings(s: SalesSettings) {
  const plans: typeof DEFAULT_PRICING = [];
  // Free tier
  plans.push({
    name: "Try It Free",
    price: "$0",
    period: "",
    desc: "See the magic for yourself",
    features: [`${s.freePortraits} free AI portraits`, "Any sport or style", "Instant download", "Standard resolution"],
    cta: "Start Free",
    highlight: false,
  });
  // Paid tiers from admin settings
  s.pricing.forEach((tier, i) => {
    const dollars = Math.floor(tier.price);
    const cents = Math.round((tier.price - dollars) * 100);
    plans.push({
      name: tier.name,
      price: `$${dollars}`,
      period: cents > 0 ? `.${cents.toString().padStart(2, "0")}` : "",
      desc: i === 0 ? "Most popular for families" : "For the superfan family",
      features: [
        `${tier.portraits} AI portraits`,
        "All sports & styles",
        "HD resolution",
        ...(tier.portraits >= 10 ? ["Print-ready files"] : []),
        "Priority generation",
      ],
      cta: tier.featured ? "Get Started" : "Go Pro",
      highlight: tier.featured,
    });
  });
  return plans;
}

export default function Home() {
  const [pricing, setPricing] = useState(DEFAULT_PRICING);

  useEffect(() => {
    fetchSettings().then((s) => {
      if (s) setPricing(buildPricingFromSettings(s));
    });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/assets/logo/PP%20LOGO%20AI.png" alt="Picture Pros" className="h-10 sm:h-11" />
          </div>
          <div className="flex items-center gap-4">
            <a href="#pricing" className="hidden sm:block text-sm text-slate-400 hover:text-white transition">Pricing</a>
            <a href="#how-it-works" className="hidden sm:block text-sm text-slate-400 hover:text-white transition">How It Works</a>
            <Link
              href="/create"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-sm font-bold transition-all hover:shadow-lg hover:shadow-indigo-500/25"
            >
              Try Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-bold mb-8">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            AI-Powered — 2 Free Portraits
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Turn Any Photo Into a{" "}
            <span className="gradient-text">Pro Sports Portrait</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Upload a photo of your kid. Our AI creates a stunning, professional-quality
            sports portrait in seconds. No studio visit needed.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create"
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-base font-black uppercase tracking-wider transition-all hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-0.5"
            >
              Create Your Portrait — Free
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 border border-slate-700 hover:border-slate-500 rounded-2xl text-base font-bold text-slate-300 transition-all hover:bg-slate-900"
            >
              See How It Works
            </a>
          </div>

          <p className="mt-4 text-xs text-slate-600">No credit card required. Try 2 portraits free.</p>

          {/* Sport selection — pick to start */}
          <p className="mt-16 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Pick Your Sport to Get Started</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {[
              { id: "soccer", emoji: "⚽", label: "Soccer", gradient: "from-emerald-500 to-emerald-700", glow: "shadow-emerald-500/20", border: "hover:border-emerald-500/50" },
              { id: "basketball", emoji: "🏀", label: "Basketball", gradient: "from-orange-500 to-orange-700", glow: "shadow-orange-500/20", border: "hover:border-orange-500/50" },
              { id: "baseball", emoji: "⚾", label: "Baseball", gradient: "from-blue-500 to-blue-700", glow: "shadow-blue-500/20", border: "hover:border-blue-500/50" },
              { id: "football", emoji: "🏈", label: "Football", gradient: "from-red-500 to-red-700", glow: "shadow-red-500/20", border: "hover:border-red-500/50" },
              { id: "volleyball", emoji: "🏐", label: "Volleyball", gradient: "from-violet-500 to-violet-700", glow: "shadow-violet-500/20", border: "hover:border-violet-500/50" },
              { id: "softball", emoji: "🥎", label: "Softball", gradient: "from-yellow-500 to-yellow-700", glow: "shadow-yellow-500/20", border: "hover:border-yellow-500/50" },
              { id: "lacrosse", emoji: "🥍", label: "Lacrosse", gradient: "from-cyan-500 to-cyan-700", glow: "shadow-cyan-500/20", border: "hover:border-cyan-500/50" },
              { id: "hockey", emoji: "🏒", label: "Hockey", gradient: "from-sky-500 to-sky-700", glow: "shadow-sky-500/20", border: "hover:border-sky-500/50" },
            ].map((sport) => (
              <Link
                key={sport.id}
                href={`/create?sport=${sport.id}`}
                className={`group relative aspect-[4/5] rounded-2xl border border-white/10 ${sport.border} bg-slate-900/60 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${sport.glow} flex flex-col items-center justify-center gap-3`}
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${sport.gradient} opacity-[0.08] group-hover:opacity-[0.18] transition-opacity`} />
                <span className="text-5xl sm:text-6xl relative z-10 group-hover:scale-110 transition-transform duration-300">{sport.emoji}</span>
                <span className="relative z-10 text-xs sm:text-sm font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{sport.label}</span>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-[9px] font-bold text-white/60 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">Create Portrait →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Three Steps. <span className="gradient-text">That&apos;s It.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="relative group">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 hover:border-indigo-500/30 transition-all hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl font-black text-slate-800">{step.num}</span>
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-black mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 border-y border-white/5 bg-slate-900/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <p className="text-3xl sm:text-4xl font-black gradient-text">10K+</p>
              <p className="text-xs text-slate-500 font-bold mt-1">Portraits Created</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black gradient-text">8+</p>
              <p className="text-xs text-slate-500 font-bold mt-1">Sports</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black gradient-text">&lt;30s</p>
              <p className="text-xs text-slate-500 font-bold mt-1">Generation Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Start Free. <span className="gradient-text">Scale When Ready.</span>
            </h2>
            <p className="text-slate-400 mt-4 max-w-lg mx-auto">Try 2 portraits free. No credit card needed. Upgrade when you want more.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl p-8 flex flex-col ${
                  plan.highlight
                    ? "border-2 border-indigo-500 bg-indigo-500/5 shadow-2xl shadow-indigo-500/10 relative"
                    : "border border-slate-800 bg-slate-900/50"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Most Popular
                  </div>
                )}
                <p className="text-sm font-bold text-slate-400">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span className="text-4xl font-black">{plan.price}</span>
                  {plan.period && <span className="text-xl font-black text-slate-500">{plan.period}</span>}
                </div>
                <p className="text-xs text-slate-500 mt-1">{plan.desc}</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/create"
                  className={`mt-8 w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider text-center transition-all ${
                    plan.highlight
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-500/25"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Ready to See <span className="gradient-text">Your Kid as a Pro?</span>
          </h2>
          <p className="mt-4 text-slate-400 text-lg">It takes 30 seconds. Upload a photo and watch the magic happen.</p>
          <Link
            href="/create"
            className="inline-block mt-8 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-base font-black uppercase tracking-wider transition-all hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-0.5"
          >
            Try Free — No Sign Up Required
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-500">Picture Pros AI</span>
          </div>
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Picture Pros. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
