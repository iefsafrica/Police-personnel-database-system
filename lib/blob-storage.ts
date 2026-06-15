import crypto from "crypto";

function generateSignature(params: Record<string, any>, apiSecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map(key => `${key}=${params[key]}`).join("&");
  return crypto.createHash("sha1").update(`${paramString}${apiSecret}`).digest("hex");
}

export async function uploadToBlob(file: File, fileName: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are missing");
  }

  const timestamp = Math.round(Date.now() / 1000);
  
  // Clean file name to prevent special character issues in public_id
  const dotIndex = fileName.lastIndexOf(".");
  const cleanBaseName = (dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName)
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const extension = dotIndex !== -1 ? fileName.substring(dotIndex) : "";
  const publicId = `${cleanBaseName}_${Math.round(Math.random() * 100000)}`;

  const signatureParams = {
    public_id: publicId,
    timestamp: timestamp,
  };
  const signature = generateSignature(signatureParams, apiSecret);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("public_id", publicId);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as any;
  return result.secure_url;
}

export async function deleteFromBlob(url: string): Promise<boolean> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return false;

  const urlParts = url.split("/");
  const uploadIndex = urlParts.indexOf("upload");
  if (uploadIndex === -1) return false;

  const resourceType = urlParts[uploadIndex - 1] || "auto"; 
  
  // Extract public ID including version bypass
  const publicIdWithExt = urlParts.slice(uploadIndex + 2).join("/");
  const dotIndex = publicIdWithExt.lastIndexOf(".");
  const publicId = dotIndex !== -1 ? publicIdWithExt.substring(0, dotIndex) : publicIdWithExt;

  const timestamp = Math.round(Date.now() / 1000);
  const signatureParams = {
    public_id: publicId,
    timestamp: timestamp,
  };
  const signature = generateSignature(signatureParams, apiSecret);

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: "POST",
    body: formData,
  });

  return response.ok;
}
