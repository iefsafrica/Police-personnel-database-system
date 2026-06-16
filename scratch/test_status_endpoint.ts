import axios from "axios";

async function runTest() {
  try {
    const testId = "PF0033406";
    console.log(`Checking status endpoint for ID: ${testId}...`);

    const response = await axios.get(
      `http://localhost:8000/api/register/status/${testId}`
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
