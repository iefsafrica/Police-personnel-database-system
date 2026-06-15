import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const JWT_SECRET = process.env.JWT_SECRET || "ippis_A00120044";

async function testDashboards() {
  try {
    console.log("--- Starting Dashboard Metrics Verification ---");

    // Generate a valid mock superadmin token
    console.log("Generating mock superadmin JWT token...");
    const token = jwt.sign(
      {
        id: 1,
        username: "superadmin",
        role: "superadmin"
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // 1. General Admin Dashboard Stats
    console.log("\nTesting general admin dashboard stats endpoint...");
    const statsRes = await axios.get("http://localhost:8000/api/admin/dashboard/stats", { headers });
    console.log("Status:", statsRes.status);
    console.log("General Stats Payload:", JSON.stringify(statsRes.data, null, 2));

    // 2. Superadmin Dashboard Stats
    console.log("\nTesting superadmin dashboard stats endpoint...");
    const superRes = await axios.get("http://localhost:8000/api/admin/superadmin-dashboard", { headers });
    console.log("Status:", superRes.status);
    console.log("Superadmin Stats Payload:", JSON.stringify(superRes.data, null, 2));

    console.log("\n--- Verification completed successfully ---");
  } catch (error: any) {
    console.error("Test failed with error:", error.response?.data || error.message);
  }
}

testDashboards();
