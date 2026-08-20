import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex bg-[#0c0c08] text-white font-sans overflow-hidden selection:bg-[#c9a84c]/30">

      {/* Left Panel — Branding & Visualization */}
      <div className="hidden lg:flex relative w-[55%] flex-col justify-between p-16 overflow-hidden bg-black/40 border-r border-[#c9a84c]/10">

        {/* Abstract MOAT Visualization */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
          {/* Core glow */}
          <div className="absolute h-[600px] w-[600px] rounded-full bg-[#c9a84c]/10 blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
          
          {/* Concentric MOAT rings */}
          <div className="absolute h-[800px] w-[800px] rounded-full border border-[#c9a84c]/5 opacity-50" />
          <div className="absolute h-[600px] w-[600px] rounded-full border border-[#c9a84c]/10" style={{ transform: "rotateX(60deg) rotateY(20deg)" }} />
          <div className="absolute h-[450px] w-[450px] rounded-full border-2 border-[#c9a84c]/20 border-dashed animate-[spin_60s_linear_infinite]" />
          <div className="absolute h-[300px] w-[300px] rounded-full border border-[#c9a84c]/30 shadow-[0_0_40px_rgba(201,168,76,0.1)]" />
          
          {/* Floating data nodes */}
          <div className="absolute top-[30%] left-[20%] h-2 w-2 rounded-full bg-[#e8c97a] shadow-[0_0_10px_#e8c97a] animate-bounce" style={{ animationDelay: "0.2s" }} />
          <div className="absolute top-[60%] right-[30%] h-3 w-3 rounded-full bg-[#c9a84c] shadow-[0_0_15px_#c9a84c] animate-bounce" style={{ animationDelay: "1.5s" }} />
          <div className="absolute bottom-[25%] left-[40%] h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_8px_white] animate-pulse" />
          
          {/* Glass panels */}
          <div className="absolute top-[20%] right-[10%] w-48 h-32 bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-2xl transform rotate-12" />
          <div className="absolute bottom-[20%] left-[5%] w-64 h-40 bg-[#c9a84c]/[0.02] backdrop-blur-3xl border border-[#c9a84c]/10 rounded-2xl transform -rotate-6" />
        </div>

        {/* Fine dotted pattern overlay */}
        <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(#c9a84c_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none mix-blend-overlay" />

        {/* Top Header / Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#6b5212] shadow-[0_0_20px_rgba(201,168,76,0.3)]">
            <div className="absolute inset-0 rounded-xl border border-white/20 mix-blend-overlay" />
            <span className="font-black text-lg text-[#131309] tracking-tighter">M</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white tracking-widest leading-none">MOAT</span>
            <span className="text-[10px] text-[#c9a84c]/80 font-bold uppercase tracking-[0.2em] mt-1">patent intelligence platform</span>
          </div>
        </div>

        {/* Hero Content Area */}
        <div className="relative z-10 mt-auto mb-20 max-w-lg">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#c9a84c]/30 bg-[#131309]/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-[#e8c97a] mb-8 shadow-[0_0_15px_rgba(201,168,76,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c9a84c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c9a84c]"></span>
            </span>
            Enterprise Grade Innovation Security
          </div>
          
          <h1 className="text-5xl font-black tracking-tight text-white leading-[1.1] mb-6 drop-shadow-lg">
            Defend your <br />
            <span className="relative inline-block mt-2">
              <span className="absolute -inset-1 block bg-gradient-to-r from-[#c9a84c]/20 to-transparent blur-lg"></span>
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-[#ffffff] via-[#e8c97a] to-[#c9a84c]">intellectual property</span>
            </span>
          </h1>
          
          <p className="text-lg text-white/60 font-medium leading-relaxed max-w-md">
            The definitive platform to monitor competitors, uncover vital prior art, and forge an impenetrable moat around your technology.
          </p>

          {/* Premium Glass Metrics */}
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { value: "10M+", label: "Patents Indexed" },
              { value: "99.9%", label: "Search Accuracy" },
              { value: "Live", label: "Global Sync" },
            ].map(s => (
              <div key={s.label} className="flex flex-col justify-center p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#c9a84c]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <p className="text-2xl font-black text-white relative z-10">{s.value}</p>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider mt-1 relative z-10">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Panel — Interactive Form Area */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative bg-[#090906] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20">
        
        {/* Pinochle Logo (Top Right) */}
        <div className="absolute top-8 right-8 lg:top-12 lg:right-12 z-30">
          <img src="/images/pinochle-logo.png" alt="Pinochle Logo" className="h-10 sm:h-12 object-contain opacity-90 hover:opacity-100 transition-opacity" />
        </div>

        {/* Subtle background glow behind the form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#c9a84c]/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="w-full max-w-[440px] relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-12 lg:hidden justify-center">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#6b5212] shadow-[0_0_15px_rgba(201,168,76,0.3)]">
              <span className="font-black text-sm text-[#131309] tracking-tighter">M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-white tracking-widest leading-none">MOAT</span>
              <span className="text-[8px] text-[#c9a84c]/80 font-bold uppercase tracking-[0.2em] mt-0.5">patent intelligence</span>
            </div>
          </div>
          
          {/* The login form component injects here */}
          <div className="relative bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-[2rem] p-8 sm:p-10 shadow-2xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
