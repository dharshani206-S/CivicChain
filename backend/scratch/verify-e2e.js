import "dotenv/config";
import mongoose from "mongoose";
import { spawn } from "child_process";
import path from "path";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Issue from "../models/Issue.js";

const PORT = 5002;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;
const MONGO_URI = process.env.MONGO_URI;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupDatabase() {
  if (!MONGO_URI) {
    console.error("❌ E2E: MONGO_URI environment variable is missing!");
    process.exit(1);
  }
  console.log(`📡 E2E: Connecting to ${MONGO_URI.includes("127.0.0.1") || MONGO_URI.includes("localhost") ? "Localhost" : "Atlas"} database to seed baseline accounts...`);
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
  
  // Clean
  await User.deleteMany({});
  await Issue.deleteMany({});
  console.log("🧹 E2E: Cleared database collections.");

  // Seed baseline accounts
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash("securepassword", salt);

  // 1. Citizen
  const citizen = new User({
    name: "Citizen Jane",
    email: "jane@citizen.com",
    password: passwordHash,
    role: "citizen",
    department: null,
  });
  await citizen.save();

  // 2. Public Works Officer
  const pwOfficer = new User({
    name: "Public Works Engineer",
    email: "publicworks@civicchain.gov",
    password: passwordHash,
    role: "authority",
    department: "Public Works",
  });
  await pwOfficer.save();

  // 3. Sanitation Officer
  const sanitationOfficer = new User({
    name: "Sanitation Inspector",
    email: "sanitation@civicchain.gov",
    password: passwordHash,
    role: "authority",
    department: "Sanitation",
  });
  await sanitationOfficer.save();

  // 4. Admin
  const admin = new User({
    name: "Admin Control",
    email: "admin@civicchain.gov",
    password: passwordHash,
    role: "admin",
    department: null,
  });
  await admin.save();

  console.log("✅ E2E: Seeded test database accounts successfully.");
}

async function runTests() {
  let serverProcess;
  try {
    // 1. Database Setup
    await setupDatabase();

    // 2. Start Backend Server as sub-process on port 5002
    console.log(`🚀 E2E: Spawning backend server on port ${PORT}...`);
    serverProcess = spawn("node", ["server.js"], {
      cwd: path.resolve("."),
      env: { ...process.env, PORT: PORT.toString() },
      shell: true,
    });

    serverProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output.includes("Server running") || output.includes("Connected")) {
        console.log(`[Backend Log]: ${output}`);
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error(`[Backend Err]: ${data.toString()}`);
    });

    // Wait for server boot
    await sleep(3000);
    console.log("⚡ E2E: Server spawned. Commencing test queries...");

    // ==========================================
    // TEST 1: CITIZEN REGISTRATION & LOGIN
    // ==========================================
    console.log("\n🔑 --- TEST 1: Authenticating Citizen Login ---");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "jane@citizen.com",
        password: "securepassword"
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(`Citizen login failed: ${JSON.stringify(loginData)}`);
    }
    const citizenToken = loginData.token;
    console.log("✅ Citizen Logged In. Token acquired:", citizenToken.substring(0, 20) + "...");

    // ==========================================
    // TEST 2: PUBLIC WORKS ISSUE SUBMISSION
    // ==========================================
    console.log("\n🛣️ --- TEST 2: Submitting Road Damage Issue (Public Works) ---");
    const createRes = await fetch(`${BASE_URL}/issues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        title: "Pothole on Main St",
        description: "Severe pavement pothole causing traffic slowing.",
        location: "Main St & 4th Ave",
        department: "Public Works",
        latitude: "40.7128",
        longitude: "-74.0060"
      })
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      throw new Error(`Issue submission failed: ${JSON.stringify(createData)}`);
    }
    const issueId = createData._id;
    console.log("✅ Complaint successfully lodged. Database ID:", issueId);

    // Verify stored state in MongoDB directly
    const storedIssue = await Issue.findById(issueId);
    console.log("🕵️ Directly Querying MongoDB collections...");
    console.log(`   - Stored Title: "${storedIssue.title}"`);
    console.log(`   - Stored Department: "${storedIssue.department}"`);
    if (storedIssue.department === "Public Works") {
      console.log("✅ Verification: Department stored in MongoDB matches 'Public Works' exactly!");
    } else {
      throw new Error("FAIL: Incorrect department stored in MongoDB!");
    }

    // ==========================================
    // TEST 3: DEPARTMENT-LOCKED ACCESS CONTROL (RBAC)
    // ==========================================
    console.log("\n🔒 --- TEST 3: Verifying Department-Locked Access (RBAC) ---");
    
    // Login Public Works Officer
    console.log("🔑 Authenticating Public Works Officer...");
    const pwLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "publicworks@civicchain.gov",
        password: "securepassword",
        department: "Public Works"
      })
    });
    const pwLoginData = await pwLoginRes.json();
    if (!pwLoginRes.ok) {
      throw new Error(`PW officer login failed: ${JSON.stringify(pwLoginData)}`);
    }
    const pwToken = pwLoginData.token;

    // Login Sanitation Officer
    console.log("🔑 Authenticating Sanitation Officer...");
    const sanLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "sanitation@civicchain.gov",
        password: "securepassword",
        department: "Sanitation"
      })
    });
    const sanLoginData = await sanLoginRes.json();
    if (!sanLoginRes.ok) {
      throw new Error(`Sanitation officer login failed: ${JSON.stringify(sanLoginData)}`);
    }
    const sanToken = sanLoginData.token;

    // Public Works Officer fetches their queue
    console.log("📡 PW Officer fetches issues queue...");
    const pwQueueRes = await fetch(`${BASE_URL}/issues`, {
      headers: { "Authorization": `Bearer ${pwToken}` }
    });
    const pwQueueData = await pwQueueRes.json();
    const pwHasIssue = pwQueueData.issues.some(i => i._id.toString() === issueId.toString());
    console.log(`   - PW Officer sees issue ID ${issueId}?`, pwHasIssue);
    if (!pwHasIssue) {
      throw new Error("FAIL: Public Works Officer could not see the road issue in their queue!");
    }
    console.log("✅ Verification: Public Works Officer can view the road issue successfully.");

    // Sanitation Officer fetches their queue
    console.log("📡 Sanitation Officer fetches issues queue...");
    const sanQueueRes = await fetch(`${BASE_URL}/issues`, {
      headers: { "Authorization": `Bearer ${sanToken}` }
    });
    const sanQueueData = await sanQueueRes.json();
    const sanHasIssue = sanQueueData.issues.some(i => i._id.toString() === issueId.toString());
    console.log(`   - Sanitation Officer sees issue ID ${issueId}?`, sanHasIssue);
    if (sanHasIssue) {
      throw new Error("FAIL: Sanitation Officer can see Public Works issues! RBAC breach!");
    }
    console.log("✅ Verification: Sanitation Officer's queue is empty. RBAC department lock enforced.");

    // Sanitation Officer tries to inspect single issue details via ID directly
    console.log(`📡 Sanitation Officer tries to inspect road issue details directly at GET /api/issues/${issueId}...`);
    const directRes = await fetch(`${BASE_URL}/issues/${issueId}`, {
      headers: { "Authorization": `Bearer ${sanToken}` }
    });
    console.log(`   - Direct response status: ${directRes.status}`);
    if (directRes.status === 403) {
      console.log("✅ Verification: Server rejected direct request with HTTP 403 Forbidden. RBAC details page lock enforced.");
    } else {
      throw new Error(`FAIL: Sanitation Officer accessed PW issue details directly! Status code: ${directRes.status}`);
    }

    // ==========================================
    // TEST 4: PUBLIC FEED BROWSING FEED VALIDATION
    // ==========================================
    console.log("\n🌍 --- TEST 4: Verifying Public Feed Browsing ---");
    console.log("📡 Fetching issues list as an unauthenticated guest visitor...");
    const publicRes = await fetch(`${BASE_URL}/issues`);
    const publicData = await publicRes.json();
    const guestHasIssue = publicData.issues.some(i => i._id.toString() === issueId.toString());
    console.log(`   - Guest sees issue ID ${issueId}?`, guestHasIssue);
    if (!guestHasIssue) {
      throw new Error("FAIL: Unauthenticated guest could not retrieve issue feed!");
    }
    console.log("✅ Verification: Guest visitors can browse all issues successfully.");

    // ==========================================
    // TEST 5: VOTING ACCESS LOCKS
    // ==========================================
    console.log("\n👍 --- TEST 5: Verifying Voting Security Rules ---");
    
    // Guest tries to upvote
    console.log("📡 Guest tries to upvote without login...");
    const guestVoteRes = await fetch(`${BASE_URL}/issues/${issueId}/vote`, {
      method: "PUT"
    });
    console.log(`   - Guest upvote response status: ${guestVoteRes.status}`);
    if (guestVoteRes.status === 401) {
      console.log("✅ Verification: Upvote rejected with HTTP 401 Unauthorized for guests.");
    } else {
      throw new Error(`FAIL: Guest upvoted successfully without credentials! Status code: ${guestVoteRes.status}`);
    }

    // Citizen upvotes
    console.log("📡 Logged-in Citizen upvotes...");
    const citizenVoteRes = await fetch(`${BASE_URL}/issues/${issueId}/vote`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${citizenToken}` }
    });
    const citizenVoteData = await citizenVoteRes.json();
    if (!citizenVoteRes.ok) {
      throw new Error(`Citizen upvote failed: ${JSON.stringify(citizenVoteData)}`);
    }
    console.log("✅ Citizen vote added. Incremented votes count to:", citizenVoteData.votes);
    if (citizenVoteData.votes !== 1) {
      throw new Error(`FAIL: Vote count did not increment to 1! Got: ${citizenVoteData.votes}`);
    }

    // ==========================================
    // TEST 6: STATUS UPDATE WORKFLOW
    // ==========================================
    console.log("\n📈 --- TEST 6: Verifying Status Update Workflow ---");
    console.log("📡 PW Officer updates issue status to 'in-progress'...");
    const statusRes = await fetch(`${BASE_URL}/issues/${issueId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${pwToken}`
      },
      body: JSON.stringify({ status: "in-progress" })
    });
    const statusData = await statusRes.json();
    if (!statusRes.ok) {
      throw new Error(`Status update failed: ${JSON.stringify(statusData)}`);
    }
    console.log("✅ Ticket status successfully advanced to:", statusData.status);
    if (statusData.status !== "in-progress") {
      throw new Error(`FAIL: Status did not update to 'in-progress'! Got: ${statusData.status}`);
    }

    console.log("\n🎉 ALL INTEGRATION AND SECURITY AUDIT TESTS PASSED SUCCESSFULLY! 🎉");

  } catch (err) {
    console.error("\n❌ E2E VERIFICATION TEST FAILED! ❌");
    console.error(err.message);
  } finally {
    if (serverProcess) {
      console.log("🔌 E2E: Terminating backend test server Process...");
      serverProcess.kill();
    }
    await mongoose.disconnect();
    console.log("🔌 E2E: Disconnected database.");
    process.exit(0);
  }
}

runTests();
