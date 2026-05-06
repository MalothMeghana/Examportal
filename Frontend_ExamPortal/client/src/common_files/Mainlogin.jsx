
import { useState, useRef } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  BookOpenCheckIcon,
} from "lucide-react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { initializeSocket } from "../common_files/Socket";


export default function Mainlogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // screens: login | forgot | otp | reset
  const [screen, setScreen] = useState("login");

  const otpRef = useRef([]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  /* ---------------- LOGIN ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidEmail(formData.email)) {
      toast.error("Please enter valid email");
      return;
    }

    if (!formData.password) {
      toast.error("Password is required");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
        loginType: "asi",
      });

      const { token, user } = response.data;

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("role", user.role);

      toast.success("Login successful");
      initializeSocket();

      switch (user.role) {
        case "superadmin":
          navigate("/super-admin/dashboard");
          break;
        case "admin":
          navigate("/admin/dashboard");
          break;
        case "invigilator":
          navigate("/invigilator/dashboard");
          break;
        default:
          navigate("/user/dashboard");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- OTP INPUT ---------------- */
  const handleOtpChange = (e, i) => {
    if (e.target.value && i < 5) {
      otpRef.current[i + 1].focus();
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* LEFT SIDE (UNCHANGED) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="relative z-10 flex flex-col justify-center px-16 text-white w-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.8)),
              url("/images/StaffImage.jpeg")
            `,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BookOpenCheckIcon className="w-7 h-7 text-white" />
            </div>
            <span className="text-4xl font-semibold tracking-tight">
              ExamMark Pro
            </span>
          </div>

          <h1 className="text-5xl font-semibold leading-none mt-6">
            Administrative
            <br />
            <span>Control Center</span>
          </h1>

          <p className="text-lg text-white max-w-md mt-3 leading-relaxed">
            Secure access portal for administrators, invigilators,
            and super administrators. Manage exams, monitor students,
            and control your organization with confidence.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 -z-10" />

        <div className="w-full max-w-md relative z-10">

          {/* ---------------- LOGIN ---------------- */}
          {screen === "login" && (
            <>
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Welcome back
                </h2>
                <p className="text-slate-400">
                  Enter your credentials to access the admin portal
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-sm text-slate-300">
                    Email Address
                  </label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="admin@company.com"
                      className="w-full h-14 pl-12 pr-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-300">
                    Password
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full h-14 pl-12 pr-12 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setScreen("forgot")}
                    className="text-sm text-indigo-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                  Sign In <ArrowRight />
                </button>
              </form>
            </>
          )}

          {/* ---------------- FORGOT EMAIL ---------------- */}
          {screen === "forgot" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">
                Forgot Password
              </h2>

              <div>
                <label className="text-sm text-slate-300">
                  Email Address
                </label>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full h-14 pl-12 pr-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!isValidEmail(formData.email)) {
                    toast.error("Enter valid email");
                    return;
                  }
                  toast.success("Email verified");
                  setScreen("otp");
                }}
                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl"
              >
                Verify Email
              </button>
            </div>
          )}

          {/* ---------------- OTP ---------------- */}
          {screen === "otp" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">
                OTP Verification
              </h2>

              <div className="flex justify-between gap-2">
                {[...Array(6)].map((_, i) => (
                  <input
                    key={i}
                    maxLength="1"
                    ref={(el) => (otpRef.current[i] = el)}
                    onChange={(e) => handleOtpChange(e, i)}
                    className="w-12 h-12 text-center rounded-lg bg-slate-900/50 border border-slate-700/50 text-white outline-none"
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  const otp = otpRef.current
                    .map((i) => i?.value)
                    .join("");

                  if (otp.length !== 6) {
                    toast.error("Enter 6-digit OTP");
                    return;
                  }
                  toast.success("OTP verified");
                  setScreen("reset");
                }}
                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl"
              >
                Verify OTP
              </button>
            </div>
          )}

          {/* ---------------- RESET PASSWORD ---------------- */}
          {screen === "reset" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">
                Reset Password
              </h2>

              <input
                name="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                onChange={handleChange}
                className="w-full h-14 px-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white outline-none"
              />

              <input
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                onChange={handleChange}
                className="w-full h-14 px-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white outline-none"
              />

              <button
                onClick={() => {
                  if (
                    !formData.newPassword ||
                    formData.newPassword !== formData.confirmPassword
                  ) {
                    toast.error("Passwords do not match");
                    return;
                  }

                  toast.success("Password reset successful");

                  // 🔴 FIX: clear email & form before login
                  setFormData({
                    email: "",
                    password: "",
                    newPassword: "",
                    confirmPassword: "",
                  });

                  setScreen("login");
                }}
                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl"
              >
                Reset Password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
