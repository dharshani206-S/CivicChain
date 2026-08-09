import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import path from "path";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "civicchain/issues",
    resource_type: "auto",
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
  ];

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ""
  ];

  const fileExt = path.extname(file.originalname || "").toLowerCase();
  const isMimeValid = allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith("image/");
  const isExtValid = allowedExtensions.includes(fileExt);

  if (isMimeValid || isExtValid) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG and WEBP image files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export default upload;