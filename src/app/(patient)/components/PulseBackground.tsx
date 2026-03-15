'use client';

export default function PulseBackground() {
  return (
    <>
      {/* Custom animation styles using style tag */}
      <style jsx>{`
        @keyframes pulse-expand-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.6;
          }
        }
        @keyframes pulse-expand-medium {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.7;
          }
        }
        @keyframes pulse-expand-fast {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
        @keyframes float-pulse-combo {
          0%, 100% {
            transform: translateY(0px) translateX(0px) scale(1);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-20px) translateX(10px) scale(1.05);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-10px) translateX(-15px) scale(1.1);
            opacity: 0.7;
          }
          75% {
            transform: translateY(15px) translateX(-5px) scale(1.05);
            opacity: 0.5;
          }
        }
        @keyframes float-pulse-reverse {
          0%, 100% {
            transform: translateY(0px) translateX(0px) scale(1);
            opacity: 0.3;
          }
          25% {
            transform: translateY(15px) translateX(-10px) scale(1.05);
            opacity: 0.5;
          }
          50% {
            transform: translateY(10px) translateX(15px) scale(1.1);
            opacity: 0.7;
          }
          75% {
            transform: translateY(-20px) translateX(5px) scale(1.05);
            opacity: 0.5;
          }
        }
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-25px) translateX(15px);
          }
        }
        @keyframes float-medium {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(20px) translateX(-20px);
          }
        }
        @keyframes float-fast {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-15px) translateX(25px);
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-pulse-expand-slow {
          animation: pulse-expand-slow 6s ease-in-out infinite;
        }
        .animate-pulse-expand-medium {
          animation: pulse-expand-medium 4s ease-in-out infinite;
        }
        .animate-pulse-expand-fast {
          animation: pulse-expand-fast 3s ease-in-out infinite;
        }
        .animate-float-pulse-combo {
          animation: float-pulse-combo 8s ease-in-out infinite;
        }
        .animate-float-pulse-reverse {
          animation: float-pulse-reverse 7s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 8s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 6s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Gradient Base */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-blue-900"></div>

        {/* Animated Pulse Orbs */}
        <div className="absolute inset-0">
          {/* Central Multi-layer Pulse - All layers moving */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-[400px] xl:w-[700px] xl:h-[700px]">
              {/* Layer 1 - Outer pulse */}
              <div className="absolute inset-0 rounded-full bg-violet-600/25 animate-pulse-expand-slow"></div>
              {/* Layer 2 */}
              <div className="absolute inset-6 rounded-full bg-blue-500/25 animate-pulse-expand-medium delay-[800ms]"></div>
              {/* Layer 3 */}
              <div className="absolute inset-12 rounded-full bg-purple-500/30 animate-pulse-expand-fast delay-[1600ms]"></div>
              {/* Layer 4 - Inner pulse */}
              <div className="absolute inset-20 rounded-full bg-cyan-400/25 animate-pulse-expand-slow delay-[2400ms]"></div>
            </div>
          </div>

          {/* Floating Orbs Around - All moving with different animations */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 sm:w-48 sm:h-48 bg-violet-500/30 rounded-full blur-xl animate-float-pulse-combo delay-[400ms]"></div>

          <div className="absolute bottom-1/3 right-1/4 w-40 h-40 sm:w-60 sm:h-60 bg-blue-500/25 rounded-full blur-xl animate-float-pulse-reverse delay-[1200ms]"></div>

          <div className="absolute top-2/3 left-1/3 w-28 h-28 sm:w-40 sm:h-40 bg-purple-400/35 rounded-full blur-xl animate-pulse-expand-medium delay-[1800ms]"></div>

          <div className="absolute top-[15%] right-[20%] w-24 h-24 sm:w-32 sm:h-32 bg-cyan-400/25 rounded-full blur-lg animate-float-pulse-combo delay-[1000ms]"></div>

          <div className="absolute bottom-[20%] left-[10%] w-24 h-24 sm:w-36 sm:h-36 bg-violet-400/30 rounded-full blur-xl animate-pulse-expand-fast delay-[2000ms]"></div>

          {/* Additional moving elements */}
          <div className="absolute top-[40%] right-[15%] w-20 h-20 sm:w-28 sm:h-28 bg-blue-400/20 rounded-full blur-lg animate-float-pulse-reverse delay-[600ms]"></div>

          <div className="absolute bottom-[30%] right-[10%] w-16 h-16 sm:w-24 sm:h-24 bg-purple-300/25 rounded-full blur-lg animate-pulse-expand-slow delay-[1400ms]"></div>
        </div>

        {/* Soft Animated Overlay Grid */}
        <div className="absolute inset-0 opacity-5 sm:opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
        </div>
      </div>
    </>
  );
}