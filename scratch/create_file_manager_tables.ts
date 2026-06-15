import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const db = neon(process.env.DATABASE_URL!);

async function run() {
  try {
    console.log("Creating file manager tables...");
    
    // Create folders table
    await db`
      CREATE TABLE IF NOT EXISTS file_manager_folders (
        id SERIAL PRIMARY KEY,
        folder_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        parent_id VARCHAR(50),
        employee_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES file_manager_folders(folder_id) ON DELETE CASCADE
      )
    `;

    // Create files table
    await db`
      CREATE TABLE IF NOT EXISTS file_manager_files (
        id SERIAL PRIMARY KEY,
        file_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        folder_id VARCHAR(50),
        file_url TEXT NOT NULL,
        file_type VARCHAR(100),
        file_size BIGINT,
        uploaded_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending',
        employee_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES file_manager_folders(folder_id) ON DELETE CASCADE
      )
    `;

    // Create indexes
    await db`CREATE INDEX IF NOT EXISTS idx_file_folders_parent ON file_manager_folders(parent_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_file_files_folder ON file_manager_files(folder_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_file_folders_employee ON file_manager_folders(employee_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_file_files_employee ON file_manager_files(employee_id)`;

    console.log("File Manager tables created successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

run();
