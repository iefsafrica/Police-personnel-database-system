import axios from "axios";
import FormData from "form-data";

const foldersURL = "http://localhost:8000/api/file-manager/folders";
const filesURL = "http://localhost:8000/api/file-manager/files";
const approveURL = "http://localhost:8000/api/file-manager/files/approve";
const employeeId = "PF0183301";

async function runTests() {
  try {
    console.log("--- Starting File Manager Endpoints Testing ---");

    // 1. CREATE FOLDER FOR EMPLOYEE
    console.log("\n1. Creating folder associated with employee...");
    const createFolderRes = await axios.post(foldersURL, {
      name: "Employee_Certificates",
      employee_id: employeeId
    });
    console.log("Status:", createFolderRes.status);
    console.log("Response:", createFolderRes.data);
    const createdFolder = createFolderRes.data.data;
    const folderId = createdFolder.folder_id;
    console.log("Created Folder ID:", folderId);

    // 2. GET FOLDERS BY EMPLOYEE ID
    console.log(`\n2. Querying folders for employee ${employeeId}...`);
    const getFoldersRes = await axios.get(`${foldersURL}?employee_id=${employeeId}`);
    console.log("Status:", getFoldersRes.status);
    console.log("Folders Count:", getFoldersRes.data.data.length);
    const hasFolder = getFoldersRes.data.data.some((f: any) => f.folder_id === folderId);
    console.log("Has created folder:", hasFolder);

    // 3. UPLOAD FILE FOR EMPLOYEE IN THE CREATED FOLDER
    console.log("\n3. Uploading file associated with employee...");
    const form = new FormData();
    form.append("file", Buffer.from("Dummy educational certificate contents"), {
      filename: "bsc_degree_test.pdf",
      contentType: "application/pdf"
    });
    form.append("folder_id", folderId);
    form.append("employee_id", employeeId);
    form.append("uploaded_by", "admin_user");
    form.append("status", "Pending");

    const uploadRes = await axios.post(filesURL, form, {
      headers: form.getHeaders()
    });
    console.log("Status:", uploadRes.status);
    console.log("Response data:", uploadRes.data);
    const createdFile = uploadRes.data.data;
    const fileId = createdFile.file_id;
    console.log("Uploaded File ID:", fileId);
    console.log("Uploaded File URL:", createdFile.file_url);

    // 4. GET FILES BY EMPLOYEE ID
    console.log(`\n4. Querying files for employee ${employeeId}...`);
    const getFilesRes = await axios.get(`${filesURL}?employee_id=${employeeId}`);
    console.log("Status:", getFilesRes.status);
    console.log("Files Count:", getFilesRes.data.data.length);
    const hasFile = getFilesRes.data.data.some((f: any) => f.file_id === fileId);
    console.log("Has uploaded file:", hasFile);

    // 5. APPROVE FILE
    console.log(`\n5. Approving file ${fileId}...`);
    const approveRes = await axios.post(approveURL, {
      file_ids: [fileId]
    });
    console.log("Status:", approveRes.status);
    console.log("Response:", approveRes.data);

    // 6. VERIFY FILE IS APPROVED (Check Status)
    console.log(`\n6. Checking status of file ${fileId} from DB...`);
    const filesList = await axios.get(`${filesURL}?employee_id=${employeeId}`);
    const verifiedFile = filesList.data.data.find((f: any) => f.file_id === fileId);
    console.log("File Status after approval:", verifiedFile?.status);

    // 7. CLEANUP: DELETE FILE
    console.log(`\n7. Cleaning up: Deleting file ${fileId}...`);
    const deleteFileRes = await axios.delete(`${filesURL}?file_id=${fileId}`);
    console.log("Status:", deleteFileRes.status);
    console.log("Response:", deleteFileRes.data);

    // 8. CLEANUP: DELETE FOLDER
    console.log(`\n8. Cleaning up: Deleting folder ${folderId}...`);
    const deleteFolderRes = await axios.delete(`${foldersURL}?folder_id=${folderId}`);
    console.log("Status:", deleteFolderRes.status);
    console.log("Response:", deleteFolderRes.data);

    console.log("\n--- All tests completed successfully! ---");
  } catch (error: any) {
    console.error("Test failed with error:", error.response?.data || error.message);
  }
}

runTests();
