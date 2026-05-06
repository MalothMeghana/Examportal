import React from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, LogIn } from "lucide-react";

const UnAuthorize = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-black px-6">
      
      {/* Glass Card */}
      <div className="relative max-w-lg w-full rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-10 text-center animate-fadeIn">
        
        {/* Floating Icon */}
        <div className="mx-auto mb-6 w-16 h-16 flex items-center justify-center rounded-full bg-red-500/20 animate-pulseSlow">
          <Lock className="text-red-500" size={32} />
        </div>

        {/* 403 */}
        <h1 className="text-[96px] font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-600">
          403
        </h1>

        {/* Title */}
        <h2 className="text-3xl font-semibold text-white mt-2">
          Access Denied
        </h2>

        {/* Description */}
        <p className="text-gray-300 mt-4 leading-relaxed">
          You don’t have permission to view this page.
          Please ensure you are logged in with the correct role
          or contact your administrator.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Go Back
          </button>

          <button
            onClick={() => navigate("/login")}
            className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 transition-all duration-300"
          >
            <LogIn size={18} />
            Login
          </button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-sm text-gray-400">
          Error Code: <span className="text-red-400 font-medium">403</span>
        </p>
      </div>


      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.8s ease-out forwards;
          }

          @keyframes pulseSlow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          .animate-pulseSlow {
            animation: pulseSlow 2.5s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
};

export default UnAuthorize;
