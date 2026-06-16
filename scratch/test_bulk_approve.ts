import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const JWT_SECRET = process.env.JWT_SECRET || "ippis_A00120044";

async function runTest() {
  try {
    console.log("Generating admin token...");
    const token = jwt.sign(
      { id: 1, username: "superadmin", role: "superadmin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log("Token generated:", token);

    const registrationIds = ["PF0033406", "PF0202767"];
    console.log(`Sending POST request to bulk-approve with IDs: ${registrationIds.join(", ")}...`);

    const response = await axios.post(
      "http://localhost:8000/api/admin/employees/bulk-approve",
      {
        registration_ids: registrationIds,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Response status:", response.status);
    console.log("Response body:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error("Request failed with status:", error.response.status);
      console.error("Response error data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Request failed with error:", error.message || error);
    }
  }
}

runTest();
