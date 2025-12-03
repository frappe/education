import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { frappeApi } from "./db";
import { z } from "zod";

// Authentication middleware - checks Frappe session
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user is authenticated with Frappe
    const result = await frappeApi.get('/api/method/education.education.api.get_user_info') as any;
    
    if (result && result.message) {
      req.user = {
        id: result.message.name,
        username: result.message.name,
        name: result.message.full_name,
        email: result.message.email,
        role: result.message.user_type || 'System User',
      } as any;
      next();
    } else {
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Unauthorized - Please log in" });
  }
}

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  
  // POST /api/auth/login - Login with Frappe
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      // Login to Frappe
      const result = await frappeApi.post('/api/method/login', {
        usr: username,
        pwd: password,
      }) as any;
      
      if (result.message === "Logged In") {
        // Get user info after login
        const userInfo = await frappeApi.get('/api/method/education.education.api.get_user_info') as any;
        
        if (userInfo && userInfo.message) {
          req.session.userId = userInfo.message.name;
          
          const user = {
            id: userInfo.message.name,
            username: userInfo.message.name,
            name: userInfo.message.full_name,
            email: userInfo.message.email,
            role: userInfo.message.user_type || 'System User',
          };
          
          return res.json({ user });
        }
      }
      
      return res.status(401).json({ message: "Invalid username or password" });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(401).json({ message: "Invalid username or password" });
    }
  });
  
  // GET /api/auth/me - Get current user
  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    res.json({ user: req.user });
  });
  
  // POST /api/auth/logout - Logout
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      await frappeApi.post('/api/method/logout', {});
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // GET /api/students/search?id=STU001 - Search student by ID/admission number for sibling lookup
  app.get("/api/students/search", requireAuth, async (req: Request, res: Response) => {
    try {
      const studentId = req.query.id as string;
      
      if (!studentId) {
        return res.status(400).json({ message: "Student ID is required" });
      }
      
      // Query Frappe for student
      const result = await frappeApi.get(`/api/resource/Student/${studentId}`) as any;
      
      if (!result || !result.data) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Return only necessary fields for sibling lookup
      res.json({
        id: result.data.name,
        name: result.data.student_name,
        class: result.data.class || result.data.program,
      });
    } catch (error) {
      console.error("Error searching student:", error);
      res.status(404).json({ message: "Student not found" });
    }
  });

  // GET /api/enquiries - Get all enquiries
  app.get("/api/enquiries", requireAuth, async (_req: Request, res: Response) => {
    try {
      // Query Frappe for Student Applicant documents (enquiries)
      const result = await frappeApi.get('/api/resource/Student Applicant?fields=["*"]&limit_page_length=0') as any;
      res.json(result.data || []);
    } catch (error) {
      console.error("Error fetching enquiries:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/enquiries - Create new enquiry
  app.post("/api/enquiries", requireAuth, async (req: Request, res: Response) => {
    try {
      // Create Student Applicant in Frappe
      const result = await frappeApi.post('/api/resource/Student Applicant', {
        data: {
          ...req.body,
          owner: req.user!.name,
        }
      }) as any;
      
      res.status(201).json(result.data);
    } catch (error) {
      console.error("Error creating enquiry:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/enquiries/:id - Update enquiry
  app.patch("/api/enquiries/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await frappeApi.put(`/api/resource/Student Applicant/${id}`, {
        data: req.body
      }) as any;
      
      res.json(result.data);
    } catch (error) {
      console.error("Error updating enquiry:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/applications - Get all applications
  app.get("/api/applications", requireAuth, async (_req: Request, res: Response) => {
    try {
      // Query Frappe for Program Enrollment documents (applications)
      const result = await frappeApi.get('/api/resource/Program Enrollment?fields=["*"]&limit_page_length=0') as any;
      res.json(result.data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/applications/:id - Get single application by ID
  app.get("/api/applications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await frappeApi.get(`/api/resource/Program Enrollment/${id}`) as any;
      
      if (!result || !result.data) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      res.json(result.data);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(404).json({ message: "Application not found" });
    }
  });

  // POST /api/applications - Create new application
  app.post("/api/applications", requireAuth, async (req: Request, res: Response) => {
    try {
      // Create Program Enrollment in Frappe
      const result = await frappeApi.post('/api/resource/Program Enrollment', {
        data: {
          ...req.body,
          owner: req.user!.name,
        }
      }) as any;
      
      res.status(201).json(result.data);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/applications/:id - Update application
  app.patch("/api/applications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await frappeApi.put(`/api/resource/Program Enrollment/${id}`, {
        data: req.body
      }) as any;
      
      res.json(result.data);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
