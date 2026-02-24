"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSettings, fetchCredits, createCheckout, SalesSettings } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { signOut } from "@/lib/firebase";
import SignInModal from "@/components/SignInModal";
import AccountDropdown from "@/components/AccountDropdown";
import FadeIn from "@/components/FadeIn";

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
    title: "Pick a Sport",
    desc: "Choose a sport and portrait style. Soccer, basketball, baseball — we've got them all with pro-quality backgrounds.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Upload a Photo",
    desc: "Snap a pic or upload from your camera roll. Any casual photo works — game day, practice, or backyard.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
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
    features: ["1 free AI portrait", "Any sport or style", "Instant download", "Standard resolution"],
    cta: "Start Free",
    highlight: false,
    packId: "",
    portraits: 1,
  },
  {
    name: "Starter Pack",
    price: "$4",
    period: ".99",
    desc: "Great for trying it out",
    features: ["3 AI portraits", "All sports & styles", "HD resolution", "Priority generation"],
    cta: "Get Started",
    highlight: false,
    packId: "pack-3",
    portraits: 3,
  },
  {
    name: "Pro Pack",
    price: "$12",
    period: ".99",
    desc: "Most popular for families",
    features: ["10 AI portraits", "All sports & styles", "HD resolution", "Multiple poses", "Priority generation"],
    cta: "Go Pro",
    highlight: true,
    packId: "pack-10",
    portraits: 10,
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
    features: [`${s.freePortraits} free AI portrait${s.freePortraits !== 1 ? 's' : ''}`, "Any sport or style", "Instant download", "Standard resolution"],
    cta: "Start Free",
    highlight: false,
    packId: "",
    portraits: s.freePortraits,
  });
  // Paid tiers from admin settings
  const descs = ["Great for trying it out", "Most popular for families", "Best value for teams", "For the superfan family"];
  const ctas = ["Get Started", "Go Pro", "Best Deal", "Get Pack"];
  s.pricing.forEach((tier, i) => {
    const dollars = Math.floor(tier.price);
    const cents = Math.round((tier.price - dollars) * 100);
    plans.push({
      name: tier.name,
      price: `$${dollars}`,
      period: cents > 0 ? `.${cents.toString().padStart(2, "0")}` : "",
      desc: tier.featured ? "Most popular for families" : (descs[i] || descs[descs.length - 1]),
      features: [
        `${tier.portraits} AI portrait${tier.portraits !== 1 ? 's' : ''}`,
        "All sports & styles",
        "HD resolution",
        ...(tier.portraits >= 10 ? ["Print-ready files"] : []),
        "Priority generation",
      ],
      cta: tier.featured ? "Go Pro" : (ctas[i] || ctas[ctas.length - 1]),
      highlight: tier.featured,
      packId: tier.id,
      portraits: tier.portraits,
    });
  });
  return plans;
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [pricing, setPricing] = useState<typeof DEFAULT_PRICING | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<"create" | null>(null);
  const [pendingBuyPack, setPendingBuyPack] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetchSettings().then((s) => {
      setPricing(s ? buildPricingFromSettings(s) : DEFAULT_PRICING);
    }).catch(() => setPricing(DEFAULT_PRICING));
  }, []);

  const refreshCredits = useCallback(async () => {
    if (!user) { setTotalCredits(null); return; }
    try {
      const token = await user.getIdToken();
      const data = await fetchCredits(token);
      if (data) setTotalCredits(data.freeRemaining + data.credits);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { refreshCredits(); }, [refreshCredits]);

  // After sign-in, if there was a pending action, check credits and proceed
  useEffect(() => {
    if (!user) return;
    if (pendingBuyPack) {
      const packId = pendingBuyPack;
      setPendingBuyPack(null);
      setPendingAction(null);
      handleBuyPack(packId);
      return;
    }
    if (pendingAction === "create") {
      setPendingAction(null);
      (async () => {
        try {
          const token = await user.getIdToken();
          const data = await fetchCredits(token);
          const credits = data ? data.freeRemaining + data.credits : 0;
          setTotalCredits(credits);
          if (credits > 0) {
            router.push("/create");
          } else {
            setShowBuyCredits(true);
          }
        } catch {
          router.push("/create");
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingAction, pendingBuyPack, router]);

  const handleBuyPack = async (packId: string) => {
    if (!user) {
      setPendingBuyPack(packId);
      setShowSignIn(true);
      return;
    }
    setCheckoutLoading(true);
    try {
      const token = await user.getIdToken();
      const result = await createCheckout(token, packId);
      if (result.ok && result.url) {
        window.location.href = result.url;
      } else {
        alert(result.error || "Checkout failed. Please try again.");
      }
    } catch {
      alert("Checkout error. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCreateClick = async () => {
    if (!user) {
      setPendingAction("create");
      setShowSignIn(true);
      return;
    }
    // Already signed in — check credits
    try {
      const token = await user.getIdToken();
      const data = await fetchCredits(token);
      const credits = data ? data.freeRemaining + data.credits : 0;
      setTotalCredits(credits);
      if (credits > 0) {
        router.push("/create");
      } else {
        setShowBuyCredits(true);
      }
    } catch {
      router.push("/create");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/assets/logo/PP%20LOGO%20AI.png" alt="Picture Pros" className="h-10 sm:h-11 animate-logo" />
          </div>
          <div className="flex items-center gap-4">
            <a href="#pricing" className="hidden sm:block text-sm text-slate-400 hover:text-white transition">Pricing</a>
            <a href="#how-it-works" className="hidden sm:block text-sm text-slate-400 hover:text-white transition">How It Works</a>
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={handleCreateClick}
                  className="px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-sm font-bold transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                >
                  Create
                </button>
                <AccountDropdown credits={totalCredits} onBuyCredits={() => setShowBuyCredits(true)} />
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowSignIn(true)}
                  className="text-sm text-slate-400 hover:text-white transition"
                >
                  Sign In
                </button>
                <Link
                  href="/create"
                  className="px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-sm font-bold transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                >
                  Try Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-10 sm:pt-40 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-bold mb-8">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            AI-Powered — Free Portraits
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Turn Any Photo Into a{" "}
            <span className="gradient-text">Pro Sports Portrait</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Upload a photo of your kid. Our AI creates a stunning, professional-quality
            sports portrait in seconds. No studio visit needed.
          </p>

          {/* Before / After showcase */}
          <div className="mt-12 sm:mt-16 max-w-2xl mx-auto">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 text-center">See The Difference</p>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
              {/* Before — original photo */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-slate-700/20 blur-xl group-hover:bg-slate-600/30 transition-all" />
                <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 aspect-[3/4]">
                  <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-2 sm:p-3">
                    <span className="text-[8px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Original</span>
                  </div>
                  <img src="/assets/before-after/Before1.png" alt="Original photo" className="w-full h-full object-cover" />
                </div>
              </div>
              {/* After — Player Card */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-indigo-500/10 blur-xl group-hover:bg-indigo-500/20 transition-all" />
                <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-indigo-500/20 bg-slate-900 aspect-[9/16]">
                  <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-2 sm:p-3">
                    <span className="text-[8px] sm:text-[11px] font-black uppercase tracking-wider gradient-text">Player Card</span>
                  </div>
                  <img src="/assets/before-after/After1.png" alt="AI Player Card" className="w-full h-full object-cover" />
                </div>
              </div>
              {/* After — Individual Portrait */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-violet-500/10 blur-xl group-hover:bg-violet-500/20 transition-all" />
                <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-violet-500/20 bg-slate-900 aspect-[3/4]">
                  <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-2 sm:p-3">
                    <span className="text-[8px] sm:text-[11px] font-black uppercase tracking-wider text-violet-400">Portrait</span>
                  </div>
                  <img src="/assets/before-after/After1_2.png" alt="AI Individual Portrait" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            {/* Flow arrow labels */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-2">
              <div className="text-center">
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-widest">Upload</span>
              </div>
              <div className="text-center">
                <span className="text-[8px] sm:text-[9px] font-bold text-indigo-500/60 uppercase tracking-widest">AI Style 1</span>
              </div>
              <div className="text-center">
                <span className="text-[8px] sm:text-[9px] font-bold text-violet-500/60 uppercase tracking-widest">AI Style 2</span>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCreateClick}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-base font-black uppercase tracking-wider transition-all hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-0.5 cursor-pointer"
            >
              Create Your Portrait — Free
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 border border-slate-700 hover:border-slate-500 rounded-2xl text-base font-bold text-slate-300 transition-all hover:bg-slate-900"
            >
              See How It Works
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-600">No credit card required. Try it free.</p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="pt-10 pb-20 sm:pt-16 sm:pb-32">
        <FadeIn>
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
        </FadeIn>
      </section>

      {/* Social Proof */}
      <section className="py-12 sm:py-16 border-y border-white/5 bg-slate-900/20">
        <FadeIn>
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
        </FadeIn>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16">
        <FadeIn>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">What Parents Say</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Real Families. <span className="gradient-text">Real Results.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                quote: "My daughter's soccer portrait looks like it was taken by a professional studio. I literally just used a photo from practice. This is insane.",
                name: "Jessica M.",
                detail: "Soccer Mom · Louisiana",
                stars: 5,
              },
              {
                quote: "We skipped picture day this year and honestly the AI portrait came out better than the ones we've paid $40+ for in the past. Not even close.",
                name: "Marcus T.",
                detail: "Baseball Dad · Texas",
                stars: 5,
              },
              {
                quote: "I was skeptical but tried the free one and immediately bought the 10-pack. Did all three of my kids in different sports. So easy.",
                name: "Sarah K.",
                detail: "Mom of 3 · Florida",
                stars: 5,
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-[11px] text-slate-500">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </FadeIn>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-12 sm:py-20">
        <FadeIn>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Start Free. <span className="gradient-text">Scale When Ready.</span>
            </h2>
            <p className="text-slate-400 mt-4 max-w-lg mx-auto">Try it free. No credit card needed. Upgrade when you want more.</p>
          </div>

          <div className={`grid grid-cols-1 gap-6 max-w-5xl mx-auto ${
            !pricing ? 'sm:grid-cols-3 max-w-4xl' :
            pricing.length <= 3 ? 'sm:grid-cols-3 max-w-4xl' :
            pricing.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
            'sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {!pricing && [0, 1, 2].map((i) => (
              <div key={i} className={`rounded-3xl p-8 flex flex-col animate-pulse ${i === 2 ? 'border-2 border-slate-700 bg-slate-800/30' : 'border border-slate-800 bg-slate-900/50'}`}>
                <div className="h-4 w-24 bg-slate-800 rounded mb-4" />
                <div className="h-10 w-20 bg-slate-800 rounded mb-2" />
                <div className="h-3 w-40 bg-slate-800/60 rounded mb-6" />
                <div className="space-y-3 flex-1">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-slate-800 rounded-full shrink-0" />
                      <div className="h-3 bg-slate-800/60 rounded" style={{ width: `${60 + j * 10}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-8 h-12 bg-slate-800 rounded-xl" />
              </div>
            ))}
            {(pricing || []).map((plan) => (
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
                {plan.packId ? (
                  <button
                    onClick={() => handleBuyPack(plan.packId)}
                    disabled={checkoutLoading}
                    className={`mt-8 w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider text-center transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
                      plan.highlight
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-500/25"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    {checkoutLoading ? "Redirecting..." : plan.cta}
                  </button>
                ) : (
                  <button
                    onClick={handleCreateClick}
                    className="mt-8 w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider text-center transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        </FadeIn>
      </section>

      {/* Enterprise CTA */}
      <section className="border-t border-white/5 py-16 sm:py-20 bg-gradient-to-b from-transparent to-slate-900/40">
        <FadeIn>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-700 bg-slate-800/50 text-xs font-bold text-slate-400 mb-6">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            Enterprise
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Need Portraits for Your <span className="gradient-text">Entire League?</span>
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            We offer bulk pricing, white-label solutions, and custom integrations for leagues,
            tournaments, and sports photography businesses.
          </p>
          <Link
            href="/enterprise"
            className="inline-flex items-center gap-2 mt-6 px-8 py-3 border border-slate-700 hover:border-indigo-500/50 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-all hover:bg-indigo-500/5"
          >
            Learn More
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Picture Pros. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <Link href="/tips" className="hover:text-slate-400 transition">Photo Tips</Link>
            <Link href="/privacy" className="hover:text-slate-400 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-400 transition">Terms of Service</Link>
            <a href="mailto:faucheauxcoleman@gmail.com" className="hover:text-slate-400 transition">Contact</a>
          </div>
        </div>
      </footer>

      <SignInModal
        open={showSignIn}
        onClose={() => { setShowSignIn(false); setPendingAction(null); }}
        onSuccess={() => setShowSignIn(false)}
      />

      {/* Buy Credits Modal */}

      {showBuyCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowBuyCredits(false)} />
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
            <button
              onClick={() => setShowBuyCredits(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-black tracking-tight">No Credits Remaining</h2>
            <p className="text-sm text-slate-400 mt-2">Purchase a credit pack to continue creating portraits.</p>
            <div className="mt-6 space-y-2">
              {(pricing || []).filter(p => p.packId).map((plan) => (
                <button
                  key={plan.packId}
                  onClick={() => { setShowBuyCredits(false); handleBuyPack(plan.packId); }}
                  disabled={checkoutLoading}
                  className={`block w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
                    plan.highlight
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  {checkoutLoading ? "Redirecting..." : `${plan.name} — ${plan.portraits} credits — ${plan.price}${plan.period}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
