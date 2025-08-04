import { Hero } from "@/components/hero";

export default function Home() {
  return (
    <main className="
      min-h-screen relative overflow-hidden
      bg-gradient-to-br from-gray-50 via-blue-50/50 to-slate-100/80
      dark:from-slate-900 dark:via-slate-800/90 dark:to-blue-900/30
      transition-all duration-700
    ">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orbs */}
        <div className="
          absolute -top-40 -right-40 w-80 h-80
          bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-purple-600/20
          rounded-full blur-3xl
          animate-pulse
        " style={{ animationDelay: '0s', animationDuration: '4s' }} />
        
        <div className="
          absolute -bottom-40 -left-40 w-96 h-96
          bg-gradient-to-tr from-cyan-400/15 via-sky-400/10 to-blue-600/15
          rounded-full blur-3xl
          animate-pulse
        " style={{ animationDelay: '2s', animationDuration: '6s' }} />
        
        <div className="
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]
          bg-gradient-to-r from-purple-400/8 via-violet-400/6 via-pink-400/8 via-rose-400/6 to-blue-400/8
          rounded-full blur-3xl
          animate-pulse
        " style={{ animationDelay: '1s', animationDuration: '8s' }} />
        
        {/* Secondary floating elements */}
        <div className="
          absolute top-20 left-20 w-32 h-32
          bg-gradient-to-br from-blue-300/40 to-cyan-300/40
          rounded-full blur-2xl
          animate-bounce
        " style={{ animationDelay: '3s', animationDuration: '5s' }} />
        
        <div className="
          absolute bottom-20 right-20 w-24 h-24
          bg-gradient-to-br from-purple-300/40 to-pink-300/40
          rounded-full blur-2xl
          animate-bounce
        " style={{ animationDelay: '1.5s', animationDuration: '4s' }} />
      </div>
      
      {/* Glassmorphism overlay */}
      <div className="
        absolute inset-0
        bg-white/30 dark:bg-slate-800/30
        backdrop-blur-sm
        pointer-events-none
      " />
      


      {/* Main content with glassmorphism container */}
      <div className="
        relative z-10 min-h-screen
        flex flex-col items-center justify-center
        px-4 py-20
      ">
        <div className="
          relative w-full max-w-4xl
          bg-white/40 dark:bg-slate-800/40
          backdrop-blur-xl
          border border-white/30 dark:border-slate-600/30
          rounded-3xl p-8 md:p-12
          shadow-[0_8px_32px_rgba(31,38,135,0.37)]
          dark:shadow-[0_8px_32px_rgba(71,85,105,0.5)]
          hover:shadow-[0_12px_40px_rgba(31,38,135,0.5)]
          dark:hover:shadow-[0_12px_40px_rgba(71,85,105,0.7)]
          transition-all duration-500
        ">
          {/* Glassmorphism inner glow */}
          <div className="
            absolute inset-0
            bg-gradient-to-br from-white/20 to-transparent
            dark:from-slate-300/10
            rounded-3xl pointer-events-none
          " />
          
          {/* Hero content */}
          <div className="relative z-10">
            <Hero />
          </div>
        </div>
        
        {/* Floating decorative elements */}
        <div className="
          absolute top-10 left-10 w-2 h-2
          bg-gradient-to-r from-blue-400 to-cyan-400
          rounded-full
          animate-ping
        " style={{ animationDelay: '2s' }} />
        
        <div className="
          absolute bottom-10 right-10 w-3 h-3
          bg-gradient-to-r from-purple-400 to-pink-400
          rounded-full
          animate-ping
        " style={{ animationDelay: '4s' }} />
        
        <div className="
          absolute top-1/3 right-10 w-1 h-1
          bg-gradient-to-r from-cyan-400 to-blue-400
          rounded-full
          animate-pulse
        " style={{ animationDelay: '1s' }} />
      </div>
    </main>
  );
}
