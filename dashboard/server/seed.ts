import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";
import { ROLES } from "../client/src/types/roles";

async function seed() {
  console.log("Seeding database...");

  const defaultUsers = [
    {
      username: "admin",
      password: await bcrypt.hash("admin123", 10),
      name: "Admin User",
      email: "admin@sanskar.edu",
      role: ROLES.ADMIN,
    },
    {
      username: "admission",
      password: await bcrypt.hash("admission123", 10),
      name: "Admission Officer",
      email: "admission@sanskar.edu",
      role: ROLES.ADMISSION_OFFICER,
    },
    {
      username: "accountant",
      password: await bcrypt.hash("accountant123", 10),
      name: "School Accountant",
      email: "accountant@sanskar.edu",
      role: ROLES.ACCOUNTANT,
    },
    {
      username: "teacher",
      password: await bcrypt.hash("teacher123", 10),
      name: "Staff Teacher",
      email: "teacher@sanskar.edu",
      role: ROLES.TEACHER,
    },
  ];

  try {
    // Check if users already exist
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length > 0) {
      console.log("Database already seeded. Skipping...");
      return;
    }

    // Insert default users
    await db.insert(users).values(defaultUsers);
    
    console.log("✓ Seeded 4 default users:");
    console.log("  - admin / admin123 (Admin)");
    console.log("  - admission / admission123 (Admission Officer)");
    console.log("  - accountant / accountant123 (Accountant)");
    console.log("  - teacher / teacher123 (Teacher)");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
