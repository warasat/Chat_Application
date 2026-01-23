import API from "../api";

// 🔹 Login user
export const loginUser = async (phoneNumber: string) => {
  const res = await API.post("/auth/login", { phoneNumber });
  return res.data.data; // { user: userData, token }
};

// 🔹 Register user (with FormData)
export const registerUser = async (
  username: string,
  phoneNumber: string,
  profilePic: File | null,
) => {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("phoneNumber", phoneNumber);
  if (profilePic) formData.append("profilePic", profilePic);

  const res = await API.post("/auth/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data; // contains message, success, etc.
};

// 🔹 Add contact
export const addContact = async (
  currentUserId: string,
  phoneNumber: string,
) => {
  const res = await API.post("/users/add-contact", {
    phoneNumber,
    currentUserId,
  });
  return res.data; // { message, contact }
};
