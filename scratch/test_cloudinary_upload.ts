import { uploadToBlob, deleteFromBlob } from "../lib/blob-storage";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function runTest() {
  try {
    console.log("--- Starting Cloudinary Upload & Delete Test ---");

    // Construct a mock file
    const content = "Hello Cloudinary, this is a test raw file!";
    const file = new File([Buffer.from(content)], "test_raw_document.txt", {
      type: "text/plain"
    });

    console.log("Uploading test raw file to Cloudinary...");
    const url = await uploadToBlob(file, "test_raw_document.txt");
    console.log("Upload Success! Returned URL:", url);

    console.log("\nDeleting test raw file from Cloudinary...");
    const deleted = await deleteFromBlob(url);
    console.log("Delete result:", deleted ? "Success" : "Failed");

    console.log("\n--- Cloudinary Verification Completed ---");
  } catch (error: any) {
    console.error("Test failed with error:", error.message || error);
  }
}

runTest();
