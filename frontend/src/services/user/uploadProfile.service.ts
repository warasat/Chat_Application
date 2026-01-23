// 🟢 Upload user profile picture
export const uploadProfilePicture = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/users/upload-profile`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    },
  );

  const data = await res.json();
  return data;
};
