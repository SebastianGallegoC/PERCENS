import imageCompression from 'browser-image-compression';

export const compressImageFile = async (file: File): Promise<File> => {
  return imageCompression(file, {
    maxWidthOrHeight: 1280,
    maxSizeMB: 0.85,
    useWebWorker: true,
    initialQuality: 0.8,
    fileType: 'image/jpeg',
  });
};

export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

/** Firma escaneada o foto: tamaño reducido para persistir como data URL en BD. */
export const readSignatureImageAsDataUrl = async (file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("invalid_signature_image");
  }
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 720,
    maxSizeMB: 0.25,
    useWebWorker: true,
    initialQuality: 0.82,
    fileType: "image/jpeg",
  });
  return fileToDataUrl(compressed);
};
