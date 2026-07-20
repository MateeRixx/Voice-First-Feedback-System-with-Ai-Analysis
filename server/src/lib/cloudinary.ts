export function getUploadConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    uploadPreset: "truetone-voice",
    folder: "truetone-audio",
  }
}
