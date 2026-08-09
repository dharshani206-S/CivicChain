import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Issue from "./models/Issue.js";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI environment variable is not defined in process.env or .env!");
  process.exit(1);
}

const authorities = [
  {
    name: "Sanitation Dispatcher",
    email: "sanitation@civicchain.gov",
    password: "securepassword",
    role: "authority",
    department: "Sanitation",
  },
  {
    name: "Water Supply Officer",
    email: "watersupply@civicchain.gov",
    password: "securepassword",
    role: "authority",
    department: "Water Supply",
  },
  {
    name: "Road Infrastructure Engineer",
    email: "roadinfrastructure@civicchain.gov",
    password: "securepassword",
    role: "authority",
    department: "Road Infrastructure",
  },
  {
    name: "Street Lights Operator",
    email: "streetlights@civicchain.gov",
    password: "securepassword",
    role: "authority",
    department: "Street Lights",
  },
  {
    name: "System Admin Control",
    email: "admin@civicchain.gov",
    password: "securepassword",
    role: "admin",
    department: null,
  },
];

const runSeed = async () => {
  try {
    console.log("📡 Connecting to MongoDB for seed ops...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected.");

    // 1. CLEAR COLLECTIONS
    console.log("🧹 Dropping existing User collections...");
    await User.deleteMany({});
    console.log("🧹 Dropping existing Issue collections...");
    await Issue.deleteMany({});
    console.log("✅ Database reset completed.");

    // 2. SEED ACCOUNTS
    console.log("🧬 Hashing passwords and seeding accounts...");
    for (const auth of authorities) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(auth.password, salt);
      
      const user = new User({
        name: auth.name,
        email: auth.email,
        password: hashedPassword,
        role: auth.role,
        department: auth.department,
      });

      await user.save();
      console.log(`👤 Created ${auth.role} account: ${auth.email} (${auth.department || "Global"})`);
    }

    console.log("🎉 Database seeding successfully finished.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

runSeed();
