import { createHash, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const COOKIE_NAME = 'workgraph_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const loginSchema = z.object({ loginId: z.string().trim().min(1).max(100), password: z.string().min(1).max(200) });
const profileSchema = z.object({ fullName: z.string().trim().min(2).max(100), loginId: z.string().trim().min(3).max(100) });
const passwordChangeSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(8).max(200) });
const resetRequestSchema = z.object({ loginId: z.string().trim().min(1).max(100) });
const resetPasswordSchema = z.object({ newPassword: z.string().min(8).max(200) });
const employeeSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  loginId: z.string().trim().min(3).max(100),
  password: z.string().min(8).max(200),
  roleIds: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid role ID')).max(20).default([])
});
const roleSchema = z.object({ name: z.string().trim().min(2).max(60), description: z.string().trim().max(300).default('') });

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function getCookie(request, name) {
  const entry = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function setSessionCookie(response, token, { secure }) {
  const parts = [`${COOKIE_NAME}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${SESSION_DURATION_MS / 1000}`];
  if (secure) parts.push('Secure');
  response.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(response, { secure }) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`);
}

async function publicUser(database, user) {
  const roleIds = user.roleIds ?? [];
  const roles = roleIds.length
    ? await database.collection('job_roles').find({ _id: { $in: roleIds } }, { projection: { name: 1 } }).toArray()
    : [];
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    loginId: user.loginId,
    accountRole: user.accountRole,
    clientId: user.clientId?.toString() ?? null,
    roles: roles.map(({ _id, name }) => ({ id: _id.toString(), name }))
  };
}

export function createAuthRouter({ database, secureCookies }) {
  const router = Router();
  const users = database.collection('users');
  const sessions = database.collection('sessions');
  const secure = secureCookies;

  router.post('/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }), asyncHandler(async (request, response) => {
    const input = loginSchema.safeParse(request.body);
    if (!input.success) return response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Enter your login ID and password.' } });

    const user = await users.findOne({ loginId: input.data.loginId });
    const validPassword = user ? await bcrypt.compare(input.data.password, user.passwordHash) : false;
    if (!user || !user.isActive || !validPassword) {
      return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'The login ID or password is incorrect.' } });
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await sessions.insertOne({ tokenHash: hashToken(token), userId: user._id, createdAt: new Date(), expiresAt });
    setSessionCookie(response, token, { secure });
    return response.json({ data: { user: await publicUser(database, user) } });
  }));

  router.get('/auth/me', asyncHandler(async (request, response) => {
    const token = getCookie(request, COOKIE_NAME);
    if (!token) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
    const session = await sessions.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
    if (!session) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
    const user = await users.findOne({ _id: session.userId, isActive: true });
    if (!user) {
      await sessions.deleteOne({ _id: session._id });
      clearSessionCookie(response, { secure });
      return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
    }
    return response.json({ data: { user: await publicUser(database, user) } });
  }));

  router.post('/auth/logout', asyncHandler(async (request, response) => {
    const token = getCookie(request, COOKIE_NAME);
    if (token) await sessions.deleteOne({ tokenHash: hashToken(token) });
    clearSessionCookie(response, { secure });
    return response.json({ data: { success: true } });
  }));

  router.put('/auth/profile', requireSession(database), asyncHandler(async (request, response) => {
    const input = profileSchema.safeParse(request.body);
    if (!input.success) return response.status(400).json({ error: { code: 'INVALID_PROFILE', message: 'Enter a name and login ID with valid lengths.' } });
    const duplicate = await users.findOne({ loginId: input.data.loginId, _id: { $ne: request.user._id } });
    if (duplicate) return response.status(409).json({ error: { code: 'LOGIN_ID_EXISTS', message: 'That login ID is already in use.' } });
    await users.updateOne({ _id: request.user._id }, { $set: { ...input.data, updatedAt: new Date() } });
    return response.json({ data: { user: await publicUser(database, { ...request.user, ...input.data }) } });
  }));

  router.post('/auth/change-password', requireSession(database), asyncHandler(async (request, response) => {
    const input = passwordChangeSchema.safeParse(request.body);
    if (!input.success) return response.status(400).json({ error: { code: 'INVALID_PASSWORD', message: 'Enter your current password and a new password of at least 8 characters.' } });
    if (!await bcrypt.compare(input.data.currentPassword, request.user.passwordHash)) {
      return response.status(400).json({ error: { code: 'CURRENT_PASSWORD_INCORRECT', message: 'Your current password is incorrect.' } });
    }
    await users.updateOne({ _id: request.user._id }, { $set: { passwordHash: await bcrypt.hash(input.data.newPassword, 12), updatedAt: new Date() } });
    await sessions.deleteMany({ userId: request.user._id, tokenHash: { $ne: request.session.tokenHash } });
    return response.json({ data: { success: true } });
  }));

  router.post('/auth/password-reset-requests', rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }), asyncHandler(async (request, response) => {
    const input = resetRequestSchema.safeParse(request.body);
    if (!input.success) return response.status(200).json({ data: { success: true } });
    const user = await users.findOne({ loginId: input.data.loginId, isActive: true }, { projection: { _id: 1 } });
    if (user) {
      const requests = database.collection('password_reset_requests');
      const existing = await requests.findOne({ userId: user._id, status: 'pending' });
      if (existing) await requests.updateOne({ _id: existing._id }, { $set: { updatedAt: new Date() }, $inc: { requestCount: 1 } });
      else await requests.insertOne({ userId: user._id, status: 'pending', requestCount: 1, createdAt: new Date(), updatedAt: new Date() });
    }
    return response.json({ data: { success: true } });
  }));

  router.get('/auth/admin/password-reset-requests', requireSession(database), requireAdmin, asyncHandler(async (_request, response) => {
    const pending = await database.collection('password_reset_requests').aggregate([
      { $match: { status: 'pending' } }, { $sort: { updatedAt: -1 } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, requestCount: 1, createdAt: 1, updatedAt: 1, fullName: '$user.fullName', loginId: '$user.loginId' } }
    ]).toArray();
    return response.json({ data: { requests: pending.map(({ _id, ...item }) => ({ id: _id.toString(), ...item })) } });
  }));

  router.post('/auth/admin/password-reset-requests/:id/reset', requireSession(database), requireAdmin, asyncHandler(async (request, response) => {
    const input = resetPasswordSchema.safeParse(request.body);
    if (!input.success || !ObjectId.isValid(request.params.id)) return response.status(400).json({ error: { code: 'INVALID_PASSWORD', message: 'Enter a password with at least 8 characters.' } });
    const resetRequests = database.collection('password_reset_requests');
    const resetRequest = await resetRequests.findOne({ _id: new ObjectId(request.params.id), status: 'pending' });
    if (!resetRequest) return response.status(404).json({ error: { code: 'RESET_REQUEST_NOT_FOUND', message: 'This password reset request is no longer pending.' } });
    const result = await users.updateOne({ _id: resetRequest.userId, isActive: true }, { $set: { passwordHash: await bcrypt.hash(input.data.newPassword, 12), updatedAt: new Date() } });
    if (!result.matchedCount) return response.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'The account is no longer active.' } });
    await sessions.deleteMany({ userId: resetRequest.userId });
    await resetRequests.updateOne({ _id: resetRequest._id }, { $set: { status: 'resolved', resolvedBy: request.user._id, resolvedAt: new Date() } });
    return response.json({ data: { success: true } });
  }));

  router.get('/roles', requireSession(database), requireAdmin, asyncHandler(async (_request, response) => {
    const roles = await database.collection('job_roles').find({}).sort({ name: 1 }).toArray();
    response.json({ data: { roles: roles.map(({ _id, name, description }) => ({ id: _id.toString(), name, description })) } });
  }));

  router.post('/roles', requireSession(database), requireAdmin, asyncHandler(async (request, response) => {
    const input = roleSchema.safeParse(request.body);
    if (!input.success) return response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Enter a role name and a description up to 300 characters.' } });
    const now = new Date();
    try {
      const result = await database.collection('job_roles').insertOne({ ...input.data, createdAt: now });
      return response.status(201).json({ data: { role: { id: result.insertedId.toString(), ...input.data } } });
    } catch (error) {
      if (error.code === 11000) return response.status(409).json({ error: { code: 'ROLE_EXISTS', message: 'That role already exists.' } });
      throw error;
    }
  }));

  router.get('/employees', requireSession(database), requireAdmin, asyncHandler(async (_request, response) => {
    const employees = await database.collection('users').find({ accountRole: 'employee' }).sort({ fullName: 1 }).toArray();
    const records = await Promise.all(employees.map(async (employee) => ({
      ...await publicUser(database, employee),
      isActive: employee.isActive,
      createdAt: employee.createdAt
    })));
    response.json({ data: { employees: records } });
  }));

  router.post('/employees', requireSession(database), requireAdmin, asyncHandler(async (request, response) => {
    const input = employeeSchema.safeParse(request.body);
    if (!input.success) return response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Check the employee name, login ID, password (at least 8 characters), and selected roles.' } });

    const roleIds = [...new Set(input.data.roleIds)].map((id) => new ObjectId(id));
    const roles = await database.collection('job_roles').find({ _id: { $in: roleIds } }).toArray();
    if (roles.length !== roleIds.length) return response.status(400).json({ error: { code: 'INVALID_ROLE', message: 'One or more selected roles no longer exist.' } });

    const now = new Date();
    const employee = { fullName: input.data.fullName, loginId: input.data.loginId, passwordHash: await bcrypt.hash(input.data.password, 12), accountRole: 'employee', roleIds, isActive: true, createdAt: now, updatedAt: now };
    try {
      const result = await users.insertOne(employee);
      return response.status(201).json({ data: { employee: await publicUser(database, { ...employee, _id: result.insertedId }) } });
    } catch (error) {
      if (error.code === 11000) return response.status(409).json({ error: { code: 'LOGIN_ID_EXISTS', message: 'That login ID is already in use.' } });
      throw error;
    }
  }));

  return router;
}

export function requireSession(database) {
  return asyncHandler(async (request, response, next) => {
    const token = getCookie(request, COOKIE_NAME);
    if (!token) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
    const session = await database.collection('sessions').findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
    if (!session) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
    const user = await database.collection('users').findOne({ _id: session.userId, isActive: true });
    if (!user) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
    request.user = user;
    request.session = session;
    return next();
  });
}

export function requireAdmin(request, response, next) {
  if (request.user?.accountRole !== 'admin') return response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Administrator access is required.' } });
  return next();
}
