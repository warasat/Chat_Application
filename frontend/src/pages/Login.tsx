import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const { loginAction, loading } = useAuth();

  const handleLogin = async () => {
    if (!phoneNumber) return alert("Please enter phone number");

    const result = await loginAction(phoneNumber);

    if (!result.success) {
      alert(result.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-green-600">
          Welcome Back
        </h2>

        <div className="space-y-4">
          <PhoneInput
            country={"pk"}
            value={phoneNumber}
            onChange={(phone) => setPhoneNumber(phone)}
            inputStyle={{ width: "100%", height: "48px", borderRadius: "8px" }}
            containerStyle={{ width: "100%" }}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full p-3 rounded-lg font-bold text-white transition-all 
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 cursor-pointer"
              }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-green-600 font-bold hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
