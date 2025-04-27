import { Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "../src/lib/storage";
import { processUserInput, determineUserIntent, generateWelcomeMessage, extractPersonName } from "./nlp-processor";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

// Define schemas
const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email format"),
  fullName: z.string().optional()
});

const insertFormDraftSchema = z.object({
  userId: z.string(),
  formTypeId: z.number(),
  formData: z.string(),
  name: z.string().min(1, "Draft name is required")
});

// JWT config
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_EXPIRATION = "24h";

// Auth middleware and types
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
  headers: any;
  body: any;
  params: any;
}

const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };

    // Validate session
    const session = await storage.getUserSessionByToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export async function registerRoutes(app: express.Application): Promise<Server> {
  // ===== Authentication Routes =====

  // Register new user
  app.post('/api/auth/register', async (req, res) => {
    try {
      const registerSchema = insertUserSchema.extend({
        password: z.string().min(6, 'Password must be at least 6 characters'),
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
      });

      const { username, email, password, fullName } = registerSchema.parse(req.body);

      // Check existing username/email
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken' });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        fullName
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      // Create user session
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.createUserSession({
        userId: user.id,
        token,
        expiresAt
      });

      // Update last login time
      await storage.updateUser(user.id, { lastLogin: now });

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid user data', details: error.errors });
      } else {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
      }
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string()
      });

      const { username, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await storage.createUserSession({
        userId: user.id,
        token,
        expiresAt
      });

      await storage.updateUser(user.id, { lastLogin: now });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid login data', details: error.errors });
      } else {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
      }
    }
  });

  // Logout
  app.post('/api/auth/logout', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        await storage.deleteUserSession(token);
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  });

  // Get current user profile
  app.get('/api/user/profile', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // API route to get welcome message for a form code
  app.get('/api/welcome-message/:formCode', async (req, res) => {
    const { formCode } = req.params;
    try {
      const message = await generateWelcomeMessage(formCode);
      res.json({ message });
    } catch (error) {
      console.error('Error generating welcome message:', error);
      res.status(500).json({ message: 'Failed to generate welcome message' });
    }
  });

  // Create and return the HTTP server
  const server = createServer(app);
  return server;
}
