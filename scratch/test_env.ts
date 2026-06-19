import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

console.log("Cloudinary Cloud Name from .env.local:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("Cloudinary API Key from .env.local:", process.env.CLOUDINARY_API_KEY ? "Present" : "Missing");
console.log("Cloudinary API Secret from .env.local:", process.env.CLOUDINARY_API_SECRET ? "Present" : "Missing");
