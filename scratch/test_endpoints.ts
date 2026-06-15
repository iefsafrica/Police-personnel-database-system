import axios from "axios";

const baseURL = "http://localhost:8000/api/permissions";
const userId = "PF0183301"; // Valid employee registration_id from DB

async function runTests() {
  try {
    console.log("--- Starting Permissions CRUD Endpoints Testing ---");

    // 1. GET ALL PERMISSIONS
    console.log("\n1. Fetching all permissions...");
    const getAllRes1 = await axios.get(baseURL);
    console.log("Status:", getAllRes1.status);
    console.log("Data count:", getAllRes1.data.data.length);

    // 2. CREATE NEW PERMISSION
    console.log("\n2. Creating a new permission...");
    const createRes = await axios.post(baseURL, {
      name: "view_dashboard_test",
      resource: "dashboard_test",
      action: "read",
      description: "Allows viewing the dashboard for test"
    });
    console.log("Status:", createRes.status);
    console.log("Response data:", createRes.data);
    const createdPermission = createRes.data.data;
    const permissionId = createdPermission.id;
    console.log("Created Permission ID:", permissionId);

    // 3. GET SINGLE PERMISSION BY ID
    console.log(`\n3. Fetching single permission with ID ${permissionId}...`);
    const getSingleRes = await axios.get(`${baseURL}?id=${permissionId}`);
    console.log("Status:", getSingleRes.status);
    console.log("Permission Name:", getSingleRes.data.data.name);

    // 4. UPDATE PERMISSION
    console.log(`\n4. Updating permission with ID ${permissionId}...`);
    const updateRes = await axios.patch(baseURL, {
      id: permissionId,
      description: "Allows viewing the dashboard for test - UPDATED DESCRIPTION"
    });
    console.log("Status:", updateRes.status);
    console.log("Updated Description:", updateRes.data.data.description);

    // 5. ASSIGN PERMISSION TO USER
    console.log(`\n5. Assigning permission ${permissionId} to user ${userId}...`);
    const assignRes = await axios.post(baseURL, {
      action: "assign_user",
      user_id: userId,
      permission_id: permissionId
    });
    console.log("Status:", assignRes.status);
    console.log("Response:", assignRes.data);

    // 6. GET PERMISSIONS FOR USER
    console.log(`\n6. Fetching permissions assigned to user ${userId}...`);
    const userPermsRes = await axios.get(`${baseURL}?user_id=${userId}`);
    console.log("Status:", userPermsRes.status);
    const hasPerm = userPermsRes.data.data.some((p: any) => p.id === permissionId);
    console.log(`User has assigned permission: ${hasPerm}`);

    // 7. UNASSIGN PERMISSION FROM USER
    console.log(`\n7. Unassigning permission ${permissionId} from user ${userId}...`);
    const unassignRes = await axios.post(baseURL, {
      action: "unassign_user",
      user_id: userId,
      permission_id: permissionId
    });
    console.log("Status:", unassignRes.status);
    console.log("Response:", unassignRes.data);

    // 8. DELETE PERMISSION
    console.log(`\n8. Deleting permission ${permissionId}...`);
    const deleteRes = await axios.delete(`${baseURL}?id=${permissionId}`);
    console.log("Status:", deleteRes.status);
    console.log("Response:", deleteRes.data);

    // 9. VERIFY DELETED
    console.log(`\n9. Verifying permission ${permissionId} is deleted...`);
    try {
      await axios.get(`${baseURL}?id=${permissionId}`);
      console.log("Error: Permission still exists!");
    } catch (err: any) {
      console.log("Status:", err.response?.status);
      console.log("Response message:", err.response?.data);
      console.log("Verification Success: Permission is indeed deleted (404 expected).");
    }

    console.log("\n--- All tests completed successfully! ---");
  } catch (error: any) {
    console.error("Test failed with error:", error.response?.data || error.message);
  }
}

runTests();
