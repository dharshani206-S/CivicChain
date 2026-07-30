import express from "express";

const router = express.Router();

router.post("/detect", async (req, res, next) => {
  try {
    // Temporary AI detection example
    const result = {
      title: "Road Pothole",
      description: "A pothole detected on the road surface",
      location: "Unknown",
      department: "Public Works"
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;