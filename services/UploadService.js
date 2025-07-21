import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dtpvh5zrk/image/upload"; // Remplace <CLOUD_NAME>

export const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.cancelled) {
    return result.assets[0].uri;
  }
  return null;
};

export const uploadImageToCloudinary = async (imageUri) => {
  if (!imageUri) return null;

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "upload.jpg",
  });
  formData.append("upload_preset", "expo_upload"); // Remplace par ton upload preset
  formData.append("cloud_name", "<CLOUD_NAME>");

  try {
    const response = await axios.post(CLOUDINARY_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.secure_url; // URL de l'image sur Cloudinary
  } catch (error) {
    console.error("Erreur lors de l'upload :", error);
    return null;
  }
};
