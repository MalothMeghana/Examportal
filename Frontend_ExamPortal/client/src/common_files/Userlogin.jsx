import { useState, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔹 swipe animation state
  const [slideDir, setSlideDir] = useState(null);

  // screens: login | forgot | otp | reset
  const [screen, setScreen] = useState("login");
  const [email, setEmail] = useState("");

  const otpRef = useRef([]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  /* ---------------- LOGIN ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
        loginType: "user",
      });

      const { token, user } = response.data;

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("role", user.role);

      toast.success("Login successful!");

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
      toast.error(error?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SIGN UP (SWIPE FIX) ---------------- */
  const goRegister = () => {
    setSlideDir("toRegister");
    setTimeout(() => navigate("/register"), 650);
  };

  /* ---------------- OTP ---------------- */
  const handleOtpChange = (e, i) => {
    if (e.target.value && i < 5) {
      otpRef.current[i + 1].focus();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#e8cbc0] to-[#636fa4]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(227, 174, 154, 0.57), rgba(71, 91, 171, 0.6)),
          url("/images/studentbackground.jpeg")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="relative w-[760px] h-[460px] rounded-2xl overflow-hidden bg-[#13111b] shadow-2xl">

        {/* LEFT PANEL */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full flex items-center justify-center
          transition-transform duration-[650ms] ease-in-out
          ${slideDir === "toRegister" ? "-translate-x-full" : "translate-x-0"}`}
        >
          <div className="w-full px-12 text-white">

            {/* LOGIN */}
            {screen === "login" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-2xl font-semibold text-center">Login</h2>

                <input
                  name="email"
                  placeholder="Email"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-full bg-[#1b1a26] placeholder-white outline-none"
                />

                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-full bg-[#1b1a26] placeholder-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <p
                  onClick={() => setScreen("forgot")}
                  className="text-right text-sm opacity-70 cursor-pointer hover:underline"
                >
                  Forgot Password?
                </p>

                <button className="w-full bg-[#3c23c9] py-3 rounded-full font-semibold">
                  LOGIN
                </button>
              </form>
            )}

            {/* FORGOT */}
            {screen === "forgot" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-center">
                  Forgot Password
                </h2>

                <input
                  placeholder="Enter registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-full bg-[#1b1a26] placeholder-white outline-none"
                />

                <button
                  onClick={() => {
                    if (!email) {
                      toast.error("Enter valid email");
                      return;
                    }
                    toast.success("Email verified successfully");
                    setScreen("otp");
                  }}
                  className="w-full bg-[#3c23c9] py-3 rounded-full font-semibold"
                >
                  Verify Email
                </button>

                <p
                  onClick={() => setScreen("login")}
                  className="text-center text-sm opacity-70 cursor-pointer"
                >
                  Back to Login
                </p>
              </div>
            )}

            {/* OTP */}
            {screen === "otp" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-center">
                  OTP Verification
                </h2>

                <div className="flex justify-between gap-2">
                  {[...Array(6)].map((_, i) => (
                    <input
                      key={i}
                      maxLength="1"
                      ref={(el) => (otpRef.current[i] = el)}
                      onChange={(e) => handleOtpChange(e, i)}
                      className="w-12 h-12 text-center text-lg rounded-lg bg-[#1b1a26] outline-none"
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    const otp = otpRef.current.map((i) => i?.value).join("");
                    if (otp.length !== 6) {
                      toast.error("Enter 6-digit OTP");
                      return;
                    }
                    toast.success("OTP verified");
                    setScreen("reset");
                  }}
                  className="w-full bg-[#3c23c9] py-3 rounded-full font-semibold"
                >
                  Verify OTP
                </button>
              </div>
            )}

            {/* RESET */}
            {screen === "reset" && (
              <div className="space-y-5">
                <h2 className="text-2xl font-semibold text-center">
                  Reset Password
                </h2>

                <input
                  name="newPassword"
                  type="password"
                  placeholder="New Password"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-full bg-[#1b1a26] outline-none"
                />

                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-full bg-[#1b1a26] outline-none"
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
                    setEmail("");
                    setFormData({
                      email: "",
                      password: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                    setScreen("login");
                  }}
                  className="w-full bg-[#3c23c9] py-3 rounded-full font-semibold"
                >
                  Reset Password
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT HERO */}
        <div
          className={`absolute top-0 right-0 w-1/2 h-full flex items-center justify-center
          transition-transform duration-[650ms] ease-in-out
          ${slideDir === "toRegister" ? "-translate-x-full" : "translate-x-0"}`}
          style={{
            backgroundImage: `
              linear-gradient(rgba(39,56,124,0.49)),
              url("/images/studentimage.jpeg")
            `,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="text-center text-white px-10 mt-[80px]">
            <h2 className="text-4xl font-semibold mb-2">Hello There</h2>
            <p className="mb-6 opacity-80">
              Begin your journey using this software
            </p>
            <button
              type="button"
              onClick={goRegister}
              className="border px-10 py-2 rounded-full hover:bg-[#1a1446]"
            >
              SIGN UP
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
