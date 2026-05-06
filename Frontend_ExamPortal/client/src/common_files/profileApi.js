import api from "../api";

export async function getProfile() {
  const response = await api.get("/profile");

  if (response.data) {
    return response.data;
  }

  throw new Error("Failed to fetch profile");
}

export async function createProfileDetails(payload) {
  const response = await api.post("/profile", payload);

  if (response.data) {
    return response.data;
  }

  throw new Error("Failed to create profile details");
}

export async function verifyPassword(currentPassword) {
  const response = await api.post("/verify-password", {
    currentPassword,
  });

  if (response.data) {
    return response.data;
  }

  throw new Error("Failed to verify password");
}

export async function updateProfile(payload) {
  // Check if payload contains a File object (avatar)
  if (payload && payload.avatar instanceof File) {
    const form = new FormData();
    form.append("full_name", payload.full_name || "");
    form.append("phone", payload.phone || "");
    form.append("gender", payload.gender || "");
    form.append("age", payload.age || "");
    if (payload.currentPassword) {
      form.append("currentPassword", payload.currentPassword);
      form.append("newPassword", payload.newPassword);
    }
    form.append("avatar", payload.avatar);

    const response = await api.put("/profile", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (response.data) {
      return response.data;
    }
  } else {
    // Regular JSON payload
    const response = await api.put("/profile", payload);

    if (response.data) {
      return response.data;
    }
  }

  throw new Error("Failed to update profile");
}
