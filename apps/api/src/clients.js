import { ObjectId } from 'mongodb';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAdmin, requireSession } from './auth.js';

const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).default(''),
  workTypes: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  portalEnabled: z.boolean().default(false),
  loginId: z.string().trim().max(100).optional().default(''),
  password: z.string().max(200).optional().default('')
}).superRefine((client, context) => {
  if (!client.portalEnabled) return;
  if (client.loginId.length < 3) context.addIssue({ code: z.ZodIssueCode.custom, path: ['loginId'], message: 'Enter a client login ID of at least 3 characters.' });
  if (client.password.length < 8) context.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Enter a client password of at least 8 characters.' });
});

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function clientRecord(client) {
  return {
    id: client._id.toString(),
    name: client.name,
    company: client.company ?? '',
    workTypes: client.workTypes ?? [],
    portalEnabled: Boolean(client.portalEnabled),
    loginId: client.loginId ?? '',
    createdAt: client.createdAt
  };
}

function requireClient(request, response, next) {
  if (request.user?.accountRole !== 'client' || !request.user.clientId) {
    return response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Client portal access is required.' } });
  }
  return next();
}

export function createClientsRouter({ database }) {
  const router = Router();

  router.get('/', requireSession(database), requireAdmin, asyncHandler(async (_request, response) => {
    const clients = await database.collection('clients').find({}).sort({ createdAt: -1 }).toArray();
    return response.json({ data: { clients: clients.map(clientRecord) } });
  }));

  router.post('/', requireSession(database), requireAdmin, asyncHandler(async (request, response) => {
    const input = clientSchema.safeParse(request.body);
    if (!input.success) return response.status(400).json({ error: { code: 'INVALID_CLIENT', message: 'Enter a client name, work types, and valid portal credentials when enabling the portal.' } });

    const data = input.data;
    const clientId = new ObjectId();
    const now = new Date();
    const workTypes = [...new Set(data.workTypes.map((type) => type.trim()).filter(Boolean))];
    const client = {
      _id: clientId,
      name: data.name,
      company: data.company,
      workTypes,
      portalEnabled: data.portalEnabled,
      loginId: data.portalEnabled ? data.loginId : '',
      createdAt: now,
      updatedAt: now
    };

    if (data.portalEnabled) {
      const existing = await database.collection('users').findOne({ loginId: data.loginId });
      if (existing) return response.status(409).json({ error: { code: 'LOGIN_ID_EXISTS', message: 'That login ID is already in use.' } });
    }

    await database.collection('clients').insertOne(client);
    if (data.portalEnabled) {
      try {
        await database.collection('users').insertOne({
          fullName: data.name,
          loginId: data.loginId,
          passwordHash: await bcrypt.hash(data.password, 12),
          accountRole: 'client',
          clientId,
          roleIds: [],
          isActive: true,
          createdAt: now,
          updatedAt: now
        });
      } catch (error) {
        await database.collection('clients').deleteOne({ _id: clientId });
        if (error.code === 11000) return response.status(409).json({ error: { code: 'LOGIN_ID_EXISTS', message: 'That login ID is already in use.' } });
        throw error;
      }
    }

    return response.status(201).json({ data: { client: clientRecord(client) } });
  }));

  return router;
}

export function createClientPortalRouter({ database }) {
  const router = Router();
  router.get('/tasks', requireSession(database), requireClient, asyncHandler(async (request, response) => {
    const clientId = request.user.clientId;
    const tasks = await database.collection('tasks').find({ clientId }).sort({ createdAt: -1 }).limit(200).toArray();
    return response.json({ data: { tasks: tasks.map((task) => ({
      id: task._id.toString(),
      title: task.title,
      description: task.description,
      status: task.status,
      completionDate: task.completionDueAt?.toISOString().slice(0, 10) ?? '',
      reportingDate: task.reportAt?.toISOString().slice(0, 10) ?? '',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      submittedAt: task.submission?.submittedAt ?? null,
      workSummary: task.submission?.summary ?? ''
    })) } });
  }));
  return router;
}
