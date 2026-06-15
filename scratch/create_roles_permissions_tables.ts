import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const db = neon(process.env.DATABASE_URL!);

async function run() {
  try {
    console.log("Creating tables...");
    
    // Create roles table
    await db`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create permissions table
    await db`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        resource VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create role_permissions table
    await db`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      )
    `;

    // Create user_roles table with user_id as VARCHAR(50)
    await db`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id VARCHAR(50) NOT NULL,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      )
    `;

    // Create user_permissions table with user_id as VARCHAR(50)
    await db`
      CREATE TABLE IF NOT EXISTS user_permissions (
        user_id VARCHAR(50) NOT NULL,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, permission_id)
      )
    `;

    console.log("Roles and Permissions tables created/verified successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

run();
