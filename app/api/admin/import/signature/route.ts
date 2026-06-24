import { NextRequest, NextResponse } from "next/server";
import { generateSignature } from "@/lib/blob-storage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json().catch(() => ({}))) as { fileName?: string };
    const { fileName } = payload;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: "Cloudinary environment variables are missing." },
        { status: 500 }
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const dotIndex = fileName?.lastIndexOf(".") ?? -1;
    const cleanBaseName = (fileName && dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName || "upload")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const publicId = `${cleanBaseName}_${Math.round(Math.random() * 100000)}`;

    const signature = generateSignature(
      { public_id: publicId, timestamp },
      apiSecret
    );

    return NextResponse.json({
      success: true,
      data: {
        cloudName,
        apiKey,
        timestamp,
        publicId,
        signature,
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate upload signature",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
