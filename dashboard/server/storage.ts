import { type User, type InsertUser, type Enquiry, type InsertEnquiry, type Admission, type InsertAdmission, users, enquiries, applications } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Enquiry methods
  getEnquiries(): Promise<Enquiry[]>;
  getEnquiry(id: string): Promise<Enquiry | undefined>;
  createEnquiry(enquiry: InsertEnquiry, createdBy: string): Promise<Enquiry>;
  updateEnquiry(id: string, updates: Partial<InsertEnquiry>): Promise<Enquiry | undefined>;
  
  // Application methods
  getApplications(): Promise<Admission[]>;
  getApplication(id: string): Promise<Admission | undefined>;
  createApplication(application: InsertAdmission, createdBy: string): Promise<Admission>;
  updateApplication(id: string, updates: Partial<InsertAdmission>): Promise<Admission | undefined>;
}

export class DBStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getEnquiries(): Promise<Enquiry[]> {
    const result = await db.select().from(enquiries);
    return result;
  }

  async getEnquiry(id: string): Promise<Enquiry | undefined> {
    const result = await db.select().from(enquiries).where(eq(enquiries.id, id)).limit(1);
    return result[0];
  }

  async createEnquiry(insertEnquiry: InsertEnquiry, createdBy: string): Promise<Enquiry> {
    const result = await db.insert(enquiries).values({
      ...insertEnquiry,
      createdBy,
    }).returning();
    return result[0];
  }

  async updateEnquiry(id: string, updates: Partial<InsertEnquiry>): Promise<Enquiry | undefined> {
    const result = await db
      .update(enquiries)
      .set(updates)
      .where(eq(enquiries.id, id))
      .returning();
    return result[0];
  }

  async getApplications(): Promise<Admission[]> {
    const result = await db.select().from(applications);
    return result as Admission[];
  }

  async getApplication(id: string): Promise<Admission | undefined> {
    const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    return result[0] as Admission | undefined;
  }

  async createApplication(insertApplication: InsertAdmission, createdBy: string): Promise<Admission> {
    // Generate application number
    const currentYear = new Date().getFullYear();
    const existingApps = await this.getApplications();
    const applicationNo = `APP-${currentYear}-${String(existingApps.length + 1).padStart(4, '0')}`;
    
    const result = await db.insert(applications).values({
      ...insertApplication,
      applicationNo,
      createdBy,
    }).returning();
    return result[0] as Admission;
  }

  async updateApplication(id: string, updates: Partial<InsertAdmission>): Promise<Admission | undefined> {
    const result = await db
      .update(applications)
      .set(updates)
      .where(eq(applications.id, id))
      .returning();
    return result[0] as Admission | undefined;
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private enquiriesMap: Map<string, Enquiry>;
  private applicationsMap: Map<string, Admission>;
  private applicationCounter: number;

  constructor() {
    this.users = new Map();
    this.enquiriesMap = new Map();
    this.applicationsMap = new Map();
    this.applicationCounter = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getEnquiries(): Promise<Enquiry[]> {
    return Array.from(this.enquiriesMap.values());
  }

  async getEnquiry(id: string): Promise<Enquiry | undefined> {
    return this.enquiriesMap.get(id);
  }

  async createEnquiry(insertEnquiry: InsertEnquiry, createdBy: string): Promise<Enquiry> {
    const id = randomUUID();
    const enquiry = { 
      ...insertEnquiry, 
      id,
      createdBy,
      createdAt: new Date(),
      // Convert undefined to null for database compatibility
      bloodGroup: insertEnquiry.bloodGroup ?? null,
      fatherOccupation: insertEnquiry.fatherOccupation ?? null,
      motherOccupation: insertEnquiry.motherOccupation ?? null,
      siblingAdmissionNo: insertEnquiry.siblingAdmissionNo ?? null,
      siblingName: insertEnquiry.siblingName ?? null,
      siblingClass: insertEnquiry.siblingClass ?? null,
      previousSchool: insertEnquiry.previousSchool ?? null,
      lastExamPassed: insertEnquiry.lastExamPassed ?? null,
      marksheet: insertEnquiry.marksheet ?? null,
      height: insertEnquiry.height ?? null,
      weight: insertEnquiry.weight ?? null,
      medicalConditionDetails: insertEnquiry.medicalConditionDetails ?? null,
      doctorName: insertEnquiry.doctorName ?? null,
      doctorPhone: insertEnquiry.doctorPhone ?? null,
      localGuardianName: insertEnquiry.localGuardianName ?? null,
      localGuardianAddress: insertEnquiry.localGuardianAddress ?? null,
      localGuardianPhone: insertEnquiry.localGuardianPhone ?? null,
      localGuardianRelation: insertEnquiry.localGuardianRelation ?? null,
      studentSignature: insertEnquiry.studentSignature ?? null,
      parentSignature: insertEnquiry.parentSignature ?? null,
      customFollowUp: insertEnquiry.customFollowUp ?? null,
      notes: insertEnquiry.notes ?? null,
    } as Enquiry;
    this.enquiriesMap.set(id, enquiry);
    return enquiry;
  }

  async updateEnquiry(id: string, updates: Partial<InsertEnquiry>): Promise<Enquiry | undefined> {
    const existingEnquiry = this.enquiriesMap.get(id);
    if (!existingEnquiry) {
      return undefined;
    }
    const updatedEnquiry: Enquiry = { ...existingEnquiry, ...updates };
    this.enquiriesMap.set(id, updatedEnquiry);
    return updatedEnquiry;
  }

  async getApplications(): Promise<Admission[]> {
    return Array.from(this.applicationsMap.values());
  }

  async getApplication(id: string): Promise<Admission | undefined> {
    return this.applicationsMap.get(id);
  }

  async createApplication(insertApplication: InsertAdmission, createdBy: string): Promise<Admission> {
    const id = randomUUID();
    const applicationNo = `APP-${new Date().getFullYear()}-${String(this.applicationCounter).padStart(4, '0')}`;
    this.applicationCounter++;
    
    const application: Admission = { 
      ...insertApplication, 
      id,
      applicationNo,
      createdBy,
    };
    this.applicationsMap.set(id, application);
    return application;
  }

  async updateApplication(id: string, updates: Partial<InsertAdmission>): Promise<Admission | undefined> {
    const existingApplication = this.applicationsMap.get(id);
    if (!existingApplication) {
      return undefined;
    }
    const updatedApplication: Admission = { ...existingApplication, ...updates };
    this.applicationsMap.set(id, updatedApplication);
    return updatedApplication;
  }
}

// Use database storage
export const storage = new DBStorage();
