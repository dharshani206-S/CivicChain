import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import path from "path";


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "civicchain/issues",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});


const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
  ];

  const fileExt = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(fileExt)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG and WEBP images are allowed"), false);
  }
};


const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});


export default upload;