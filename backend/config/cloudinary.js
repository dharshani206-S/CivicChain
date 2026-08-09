import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import path from "path";

// Ensure environment variables are loaded regardless of module import order
dotenv.config();
if (!process.env.CLOUDINARY_API_KEY) {
  dotenv.config({ path: path.join(process.cwd(), "backend", ".env") });
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;