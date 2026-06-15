import axios from "axios";

const baseURL = "http://localhost:8000/api/roles";
const userId = "PF0183301"; // Valid employee registration_id from DB

async function runTests() {
  try {
    console.log("--- Starting Roles CRUD Endpoints Testing ---");

    // 1. GET ALL ROLES
    console.log("\n1. Fetching all roles...");
    const getAllRes1 = await axios.get(baseURL);
    console.log("Status:", getAllRes1.status);
    console.log("Data count:", getAllRes1.data.data.length);

    // 2. CREATE NEW ROLE
    console.log("\n2. Creating a new role...");
    const createRes = await axios.post(baseURL, {
      name: "Officer_Test",
      description: "Police Officer Test Role"
    });
    console.log("Status:", createRes.status);
    console.log("Response data:", createRes.data);
    const createdRole = createRes.data.data;
    const roleId = createdRole.id;
    console.log("Created Role ID:", roleId);

    // 3. GET SINGLE ROLE BY ID
    console.log(`\n3. Fetching single role with ID ${roleId}...`);
    const getSingleRes = await axios.get(`${baseURL}?id=${roleId}`);
    console.log("Status:", getSingleRes.status);
    console.log("Role Name:", getSingleRes.data.data.name);

    // 4. UPDATE ROLE
    console.log(`\n4. Updating role with ID ${roleId}...`);
    const updateRes = await axios.patch(baseURL, {
      id: roleId,
      description: "Police Officer Test Role - UPDATED DESCRIPTION"
    });
    console.log("Status:", updateRes.status);
    console.log("Updated Description:", updateRes.data.data.description);

    // 5. ASSIGN ROLE TO USER
    console.log(`\n5. Assigning role ${roleId} to user ${userId}...`);
    const assignRes = await axios.post(baseURL, {
      action: "assign",
      user_id: userId,
      role_id: roleId
    });
    console.log("Status:", assignRes.status);
    console.log("Response:", assignRes.data);

    // 6. GET ROLES FOR USER
    console.log(`\n6. Fetching roles assigned to user ${userId}...`);
    const userRolesRes = await axios.get(`${baseURL}?user_id=${userId}`);
    console.log("Status:", userRolesRes.status);
    const hasRole = userRolesRes.data.data.some((r: any) => r.id === roleId);
    console.log(`User has assigned role: ${hasRole}`);

    // 7. UNASSIGN ROLE FROM USER
    console.log(`\n7. Unassigning role ${roleId} from user ${userId}...`);
    const unassignRes = await axios.post(baseURL, {
      action: "unassign",
      user_id: userId,
      role_id: roleId
    });
    console.log("Status:", unassignRes.status);
    console.log("Response:", unassignRes.data);

    // 8. DELETE ROLE
    console.log(`\n8. Deleting role ${roleId}...`);
    const deleteRes = await axios.delete(`${baseURL}?id=${roleId}`);
    console.log("Status:", deleteRes.status);
    console.log("Response:", deleteRes.data);

    // 9. VERIFY DELETED
    console.log(`\n9. Verifying role ${roleId} is deleted...`);
    try {
      await axios.get(`${baseURL}?id=${roleId}`);
      console.log("Error: Role still exists!");
    } catch (err: any) {
      console.log("Status:", err.response?.status);
      console.log("Response message:", err.response?.data);
      console.log("Verification Success: Role is indeed deleted (404 expected).");
    }

    console.log("\n--- All tests completed successfully! ---");
  } catch (error: any) {
    console.error("Test failed with error:", error.response?.data || error.message);
  }
}

runTests();
