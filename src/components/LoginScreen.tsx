import { supabase } from "../lib/supabase";
import Logo from '../public/images/spotifylogo.png';

export const LoginScreen = () => {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  // NEW: Anonymous Login Handler
  const handleGuestLogin = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) console.error("Guest login error:", error.message);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden bg-black">
      {/* 1. Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-600/10 blur-[120px] rounded-full" />

      {/* 2. Login Card */}
      <div className="relative w-full max-w-[420px] bg-[#121212]/80 backdrop-blur-xl border border-white/5 p-12 rounded-[2.5rem] shadow-2xl text-center">
        
        {/* Logo Section */}
        <div className="relative flex justify-center mb-10">
          <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full scale-150" />
          <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl flex items-center justify-center shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500">
            <img 
                className="w-12 h-12 object-contain brightness-0" 
                src={Logo} 
                alt="Logo" 
            />
          </div>
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">
          Music for <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">you.</span>
        </h1>
        <p className="text-zinc-400 mb-10 text-sm leading-relaxed px-4">
          Stream your favorite YouTube tracks through a beautifully crafted interface.
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleLogin}
            className="group relative w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:bg-zinc-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-[0.98]"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-5 h-5 group-hover:scale-110 transition-transform" 
            />
            <span className="text-[15px]">Continue with Google</span>
          </button>

          {/* NEW: Guest Button */}
          <button
            onClick={handleGuestLogin}
            className="w-full flex items-center justify-center gap-3 bg-transparent text-zinc-400 font-semibold py-3 px-6 rounded-2xl border border-zinc-800 transition-all duration-300 hover:text-white hover:border-zinc-600 hover:bg-white/5 active:scale-[0.98]"
          >
            <span className="text-[14px]">Continue without account</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-12 space-y-4">
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">
            Crafted by <a 
                href="https://github.com/3hird-k" 
                target="_blank" 
                className="text-white hover:text-green-500 transition-colors"
            >
                Neil Dime
            </a>
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 left-8 hidden md:block">
        <p className="text-zinc-600 text-xs font-mono">v1.0.4 // PRODUCTION_BUILD</p>
      </div>
    </div>
  );
};