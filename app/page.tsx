"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSettings, fetchCredits, createCheckout, SalesSettings } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import SignInModal from "@/components/SignInModal";
import AccountDropdown from "@/components/AccountDropdown";
import FadeIn from "@/components/FadeIn";
import InlineCreator from "@/components/InlineCreator";

function HeroHeadline() {
  return (
    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto">
      Turn Any Pet Photo Into a <span className="gradient-text">Royal Portrait</span>
    </h1>
  );
}

const STEPS = [
  {
    num: "01",
    title: "Pick a Style",
    desc: "Choose a portrait style for your pet. Royal monarch, military general, wizard — we have them all with stunning detail.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Upload a Photo",
    desc: "Snap a pic or upload from your camera roll. Any clear photo of your dog, cat, or pet works perfectly.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Get Your Portrait",
    desc: "AI generates a stunning royal portrait of your pet in seconds. Download instantly or order prints delivered to your door.",
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
    features: ["Free AI portraits", "All portrait styles", "Instant download", "Standard resolution"],
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
    features: ["3 AI portraits", "All portrait styles", "HD resolution", "Priority generation"],
    cta: "Get Started",
    highlight: false,
    packId: "pack-3",
    portraits: 3,
  },
  {
    name: "Pro Pack",
    price: "$12",
    period: ".99",
    desc: "Most popular for pet owners",
    features: ["10 AI portraits", "All portrait styles", "HD resolution", "Multiple poses", "Priority generation"],
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
    features: [`${s.freePortraits} free AI portrait${s.freePortraits !== 1 ? 's' : ''}`, "All portrait styles", "Instant download", "Standard resolution"],
    cta: "Start Free",
    highlight: false,
    packId: "",
    portraits: s.freePortraits,
  });
  // Paid tiers from admin settings
  const descs = ["Great for trying it out", "Most popular for pet owners", "Best value for multiple pets", "For the ultimate pet lover"];
  const ctas = ["Get Started", "Go Pro", "Best Deal", "Get Pack"];
  s.pricing.forEach((tier, i) => {
    const dollars = Math.floor(tier.price);
    const cents = Math.round((tier.price - dollars) * 100);
    plans.push({
      name: tier.name,
      price: `$${dollars}`,
      period: cents > 0 ? `.${cents.toString().padStart(2, "0")}` : "",
      desc: tier.featured ? "Most popular for pet owners" : (descs[i] || descs[descs.length - 1]),
      features: [
        `${tier.portraits} AI portrait${tier.portraits !== 1 ? 's' : ''}`,
        "All portrait styles",
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
      if (data) setTotalCredits(data.freeRemaining + data.credits + (data.bonusCredits || 0));
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
          const credits = data ? data.freeRemaining + data.credits + (data.bonusCredits || 0) : 0;
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
      const credits = data ? data.freeRemaining + data.credits + (data.bonusCredits || 0) : 0;
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
            <span className="text-xl font-black tracking-tight">👑 Royal Paws</span>
          </div>
          <div className="flex items-center gap-4">
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
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero — inline creator above the fold */}
      <section className="relative pt-24 pb-10 sm:pt-32 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-bold mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              No signup needed — Free first portrait
            </div>

            <HeroHeadline />

            <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
              Upload a photo of your dog or cat. AI generates a royal-quality portrait in 30 seconds.
            </p>
          </div>

          {/* THE CREATOR — above the fold */}
          <InlineCreator />

          {/* Trust indicators */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              No credit card
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold">
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              4.9 Stars
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold">
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
              Free shipping
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold">
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
              Ready in 30s
            </span>
          </div>
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
              <p className="text-3xl sm:text-4xl font-black gradient-text">6</p>
              <p className="text-xs text-slate-500 font-bold mt-1">Royal Styles</p>
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
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">What Pet Owners Say</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Real Pets. <span className="gradient-text">Real Results.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                quote: "My golden retriever looks like actual royalty. I used a random photo from the backyard and it came out looking like a Renaissance painting. Incredible.",
                name: "Jessica M.",
                detail: "Dog Mom · Louisiana",
                stars: 5,
              },
              {
                quote: "I got my cat done as a military general and I've never laughed so hard. It's now framed above the fireplace. Worth every penny.",
                name: "Marcus T.",
                detail: "Cat Dad · Texas",
                stars: 5,
              },
              {
                quote: "I was skeptical but tried the free one and immediately bought the 10-pack. Did all three of my pets in different styles. So easy.",
                name: "Sarah K.",
                detail: "Pet Mom of 3 · Florida",
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


      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Royal Paws. All rights reserved.</p>
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
            <h2 className="text-xl font-black tracking-tight">{(totalCredits ?? 0) > 0 ? 'Buy More Credits' : 'No Credits Remaining'}</h2>
            <p className="text-sm text-slate-400 mt-2">{(totalCredits ?? 0) > 0 ? 'Add more credits to your account.' : 'Purchase a credit pack to continue creating portraits.'}</p>
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
