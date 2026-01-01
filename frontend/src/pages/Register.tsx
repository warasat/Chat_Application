import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const Register = () => {
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const { registerAction, authLoading } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!phoneNumber) return alert("Phone number is required");

    const result = await registerAction(username, phoneNumber);

    if (result.success) {
      alert("Registration successful! Please login.");
      navigate("/login");
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
          Create Account
        </h2>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Warasat Ali"
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
              onChange={(e) => setUsername(e.target.value)}
            />
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
