import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Big 404 */}
      <h1 className="text-[120px] sm:text-[180px] font-black leading-none tracking-tighter bg-gradient-to-b from-slate-700 to-slate-900 bg-clip-text text-transparent select-none">
        404
      </h1>

      {/* Message */}
      <p className="text-lg sm:text-xl font-bold text-slate-400 mt-2 text-center">
        This page doesn&apos;t exist.
      </p>
      <p className="text-sm text-slate-600 mt-1 text-center max-w-md">
        The page you&apos;re looking for may have been moved or never existed. Let&apos;s get you back on track.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
        <Link
          href="/"
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5"
        >
          Back to Home
        </Link>
        <Link
          href="/tips"
          className="px-8 py-3 border border-slate-800 hover:border-slate-700 rounded-2xl text-sm font-bold text-slate-400 hover:text-white transition-all"
        >
          Photo Tips
        </Link>
      </div>

      {/* Logo */}
      <div className="mt-16 opacity-30">
        <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Picture Pros</span>
      </div>
    </div>
  );
}
