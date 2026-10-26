import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { db } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { IUser } from '../models';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password, salt, rsaPublicKey, encryptedPrivateKey, privateKeyIv } = req.body;

      if (!email || !username || !password || !salt || !rsaPublicKey || !encryptedPrivateKey || !privateKeyIv) {
        res.status(400).json({ error: 'All fields are required (email, username, password, salt, rsaPublicKey, encryptedPrivateKey, privateKeyIv).' });
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      const cleanUsername = username.trim();

      const existingEmail = await db.findUserByEmail(cleanEmail);
      if (existingEmail) {
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }

      const existingUsername = await db.findUserByUsername(cleanUsername);
      if (existingUsername) {
        res.status(409).json({ error: 'Username is already taken. Please choose another.' });
        return;
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
      const newUser: IUser = {
        id: userId,
        email: cleanEmail,
        username: cleanUsername,
        passwordHash,
        salt,
        rsaPublicKey,
        encryptedPrivateKey,
        privateKeyIv,
        storageUsed: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.createUser(newUser);

      // Issue JWT
      const token = jwt.sign({ userId: newUser.id, email: newUser.email }, config.jwtSecret, {
        expiresIn: '7d',
      });

      // Log activity
      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: newUser.id,
        userName: newUser.username,
        userEmail: newUser.email,
        action: 'user_registered',
        targetType: 'user',
        targetId: newUser.id,
        targetName: newUser.username,
        details: 'User account registered and cryptographic keys initialized.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({
        message: 'Account created successfully.',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          salt: newUser.salt,
          rsaPublicKey: newUser.rsaPublicKey,
          encryptedPrivateKey: newUser.encryptedPrivateKey,
          privateKeyIv: newUser.privateKeyIv,
          storageUsed: newUser.storageUsed,
          createdAt: newUser.createdAt,
        },
      });
    } catch (err: any) {
      console.error('[AuthController.register] Error:', err);
      res.status(500).json({ error: 'Internal server error while registering account.' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { emailOrUsername, password } = req.body;

      if (!emailOrUsername || !password) {
        res.status(400).json({ error: 'Email/Username and password are required.' });
        return;
      }

      const cleanIdentifier = emailOrUsername.trim().toLowerCase();
      let user = await db.findUserByEmail(cleanIdentifier);
      if (!user) {
        user = await db.findUserByUsername(cleanIdentifier);
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials. User not found.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
        return;
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
        expiresIn: '7d',
      });

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'user_login',
        targetType: 'user',
        targetId: user.id,
        targetName: user.username,
        details: 'User authenticated successfully.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.json({
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          salt: user.salt,
          rsaPublicKey: user.rsaPublicKey,
          encryptedPrivateKey: user.encryptedPrivateKey,
          privateKeyIv: user.privateKeyIv,
          storageUsed: user.storageUsed,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.error('[AuthController.login] Error:', err);
      res.status(500).json({ error: 'Internal server error during login.' });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          salt: user.salt,
          rsaPublicKey: user.rsaPublicKey,
          encryptedPrivateKey: user.encryptedPrivateKey,
          privateKeyIv: user.privateKeyIv,
          storageUsed: user.storageUsed,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.error('[AuthController.getMe] Error:', err);
      res.status(500).json({ error: 'Internal server error fetching user.' });
    }
  }

  static async lookupPublicKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, username } = req.query;
      let targetUser: IUser | null = null;

      if (email && typeof email === 'string') {
        targetUser = await db.findUserByEmail(email);
      } else if (username && typeof username === 'string') {
        targetUser = await db.findUserByUsername(username);
      }

      if (!targetUser) {
        res.status(404).json({ error: 'Recipient user not found.' });
        return;
      }

      res.json({
        user: {
          id: targetUser.id,
          email: targetUser.email,
          username: targetUser.username,
          rsaPublicKey: targetUser.rsaPublicKey,
        },
      });
    } catch (err: any) {
      console.error('[AuthController.lookupPublicKey] Error:', err);
      res.status(500).json({ error: 'Internal server error looking up user.' });
    }
  }

  static async listUsersForShare(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const users = await db.listUsers(req.user!.id);
      res.json({ users });
    } catch (err: any) {
      console.error('[AuthController.listUsersForShare] Error:', err);
      res.status(500).json({ error: 'Internal server error listing users.' });
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword, newSalt, newEncryptedPrivateKey, newPrivateKeyIv } = req.body;
      const user = req.user!;

      if (!currentPassword || !newPassword || !newSalt || !newEncryptedPrivateKey || !newPrivateKeyIv) {
        res.status(400).json({ error: 'All fields are required to re-encrypt cryptographic keys under a new password.' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Current password is incorrect.' });
        return;
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await db.updateUser(user.id, {
        passwordHash: newPasswordHash,
        salt: newSalt,
        encryptedPrivateKey: newEncryptedPrivateKey,
        privateKeyIv: newPrivateKeyIv,
      });

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'user_login',
        targetType: 'user',
        targetId: user.id,
        targetName: user.username,
        details: 'User password changed and RSA private key re-wrapped with new Master Key.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.json({ message: 'Password updated and keys re-encrypted successfully.' });
    } catch (err: any) {
      console.error('[AuthController.changePassword] Error:', err);
      res.status(500).json({ error: 'Internal server error changing password.' });
    }
  }
}
