import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white px-6">
      <div className="max-w-xl text-center">
        
        {/* 404 Text */}
        <h1 className="text-[120px] font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
          404
        </h1>

        {/* Title */}
        <h2 className="text-3xl font-semibold mt-4">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="text-gray-400 mt-3">
          Oops! The page you are looking for doesn’t exist, was moved,
          or you don’t have access to it.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <button
            onClick={() => navigate("/login")}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition"
          >
            <Home size={18} />
            Go to Login
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-sm text-gray-500">
          If you believe this is a mistake, please contact support.
        </p>
      </div>
    </div>
  );
};

export default PageNotFound;
