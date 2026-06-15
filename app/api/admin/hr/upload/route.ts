import { NextRequest } from "next/server";
import { withCors, handleOptions } from "@/lib/cors";
import { uploadToBlob } from "@/lib/blob-storage";

export const dynamic = "force-dynamic";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return withCors(req, {
        success: false,
        error: "No file provided",
      }, 400);
    }

    const cloudinaryUrl = await uploadToBlob(file, `${Date.now()}-${file.name}`);

    return withCors(req, {
      success: true,
      url: cloudinaryUrl,
      pathname: file.name,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return withCors(req, {
      success: false,
      error: "File upload failed",
    }, 500);
  }
}
