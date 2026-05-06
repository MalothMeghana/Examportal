import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    contact: "",
    organisationId: "",
    gender: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error("Please fill all required fields");
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    setLoading(true);
    try {
      await api.post("/auth/register", {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        age: formData.age,
        mobile: formData.contact,
        organizationId: formData.organisationId,
        gender: formData.gender,
      });
      toast.success("Registration successful! Please login.");
      goLogin();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const goLogin = () => {
    setSliding(true);
    setTimeout(() => navigate("/login"), 650);
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden
      bg-gradient-to-br from-[#e8cbc0] to-[#636fa4]"
      style={{
        backgroundImage: `
     linear-gradient(
                rgba(227, 174, 154, 0.57),
                rgba(71, 91, 171, 0.6)
              ),
      url("/images/studentbackground.jpeg")
    `,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}>

      <div className="relative w-[760px] h-[460px] rounded-2xl overflow-hidden bg-[#13111b] shadow-2xl">

        {/* HERO — IMAGE + LIGHT GRADIENT OVERLAY */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full flex items-center justify-center
          transition-transform duration-[650ms] ease-in-out
          ${sliding ? "translate-x-full" : "translate-x-0"}`}
           style={{
            backgroundImage: `
               linear-gradient(
                rgba(39, 56, 124, 0.49)
              ),
              url("/images/studentimage.jpeg")
            `,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="text-center text-[#f5f2f2] px-10 mt-[70px]">
            <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
            <p className="mb-6 opacity-80">Login to review your journey</p>
            <button
              onClick={goLogin}
              className="border border-[#1a1446] px-10 py-2 rounded-full
              hover:bg-[#1a1446] hover:text-white transition"
            >
              LOGIN
            </button>
          </div>
        </div>

        {/* REGISTER FORM — UNTOUCHED */}
        <div
          className={`absolute top-0 right-0 w-1/2 h-full overflow-y-auto
          transition-transform duration-[650ms] ease-in-out
          ${sliding ? "-translate-x-full" : "translate-x-0"}`}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full px-12 py-8 space-y-4 text-white"
          >
            <h2 className="text-2xl font-semibold text-center">Sign Up</h2>

            <input name="fullName" placeholder="Full Name" onChange={handleChange}
              className="w-full px-4 py-3 rounded-full bg-[#1b1a26] placeholder-white outline-none" />

            <input name="email" placeholder="Email" onChange={handleChange}
              className="w-full px-4 py-3 rounded-full placeholder-white bg-[#1b1a26] outline-none" />

            <div className="relative">
              <input name="password" type={showPassword ? "text" : "password"}
                placeholder="Password" onChange={handleChange}
                className="w-full px-4 py-3 placeholder-white rounded-full bg-[#1b1a26] outline-none" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-gray-400">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <input name="confirmPassword" type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password" onChange={handleChange}
                className="w-full px-4 py-3 rounded-full bg-[#1b1a26] placeholder-white outline-none" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-3 text-gray-400 placeholder-white">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <input name="age" placeholder="Age" onChange={handleChange}
              className="w-full px-4 py-3 rounded-full bg-[#1b1a26] placeholder-white outline-none" />

            <input name="contact" placeholder="Contact Number" onChange={handleChange}
              className="w-full px-4 py-3 rounded-full bg-[#1b1a26] placeholder-white outline-none" />

            <input name="organisationId" placeholder="Organisation ID" onChange={handleChange}
              className="w-full px-4 py-3 rounded-full bg-[#1b1a26] placeholder-white outline-none" />

            <select name="gender" onChange={handleChange}
              className="w-full px-4 py-3 rounded-full bg-[#1b1a26] outline-none">
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>

            <button 
              disabled={loading}
              className="w-full bg-[#3c23c9] py-3 rounded-full font-semibold disabled:opacity-50"
            >
              {loading ? "Signing up..." : "SIGN UP"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

