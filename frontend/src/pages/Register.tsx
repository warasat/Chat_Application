import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Camera } from "lucide-react";

const Register = () => {
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { registerAction, authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔹 Handle File selection and preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async () => {
    if (!phoneNumber) return alert("Phone number is required");
    if (!username) return alert("Full name is required");

    const result = await registerAction(username, phoneNumber, profilePic);

    if (result.success) {
      alert("Registration successful! Please login.");
      navigate("/login");
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 font-sans p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
          Create Account
        </h2>

        {/* 🔹 Profile Picture Upload Section */}
        <div className="flex flex-col items-center mb-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer border-2 border-dashed border-blue-400 hover:border-blue-600 overflow-hidden transition-all"
          >
            {preview ? (
              <img
                src={preview}
                alt="Profile Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 flex flex-col items-center">
                <Camera size={24} />
                <span className="text-[10px] mt-1 uppercase font-bold text-gray-500">
                  Add Photo
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
          />
        </div>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Warasat Ali"
                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              country={"pk"}
              value={phoneNumber}
              onChange={(phone) => setPhoneNumber(phone)}
              inputStyle={{
                width: "100%",
                height: "48px",
                borderRadius: "8px",
              }}
              containerStyle={{ width: "100%" }}
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={authLoading}
            className={`w-full p-3 rounded-lg font-bold text-white transition-all 
              ${
                authLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
              }`}
          >
            {authLoading ? "Registering..." : "Register"}
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
