// src/lib/uploadPhoto.ts
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const CLOUD_NAME = "f9dsssqz"; // Replace with your cloud name
const UPLOAD_PRESET = "xvs_avatars"; // Replace with your unsigned preset name

export async function uploadProfilePhoto(
  userId: string,
  file: File,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "avatars");

  // 1. Upload to Cloudinary
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    throw new Error("Failed to upload image to Cloudinary");
  }

  const data = await res.json();
  const secureUrl = data.secure_url; // e.g. "https://res.cloudinary.com/.../image.jpg"

  // 2. Update user document in Firestore
  const userDocRef = doc(db, "users", userId);
  await updateDoc(userDocRef, {
    photoUrl: secureUrl,
    updatedAt: new Date().toISOString(),
  });

  return secureUrl;
}
