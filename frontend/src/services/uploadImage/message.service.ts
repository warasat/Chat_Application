export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/messages/upload-image`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    },
  );

  const data = await res.json();

  if (!data.url) throw new Error("Image upload failed");
  return data.url;
};
