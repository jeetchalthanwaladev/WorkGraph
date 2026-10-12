import { ObjectId } from 'mongodb';
import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireSession } from './auth.js';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Enter a valid date.');
const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).default(''),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).default(''),
  phone: z.string().trim().max(30).default('')
});
const taskSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(1).max(5000),
  assigneeId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  roleId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  reportingDate: dateField,
  completionDate: dateField,
  hasClientInfo: z.boolean().default(false),
  client: clientSchema.optional()
}).superRefine((task, context) => {
  if (task.hasClientInfo && !task.client) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['client'], message: 'Enter the client details.' });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const field of ['completionDate', 'reportingDate']) {
    if (new Date(`${task[field]}T00:00:00`) < today) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Dates cannot be before today.' });
    }
  }
});

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

async function taskRecords(database, filter) {
  const tasks = await database.collection('tasks').find(filter).sort({ createdAt: -1 }).limit(100).toArray();
  if (!tasks.length) return [];

  const assigneeIds = [...new Map(tasks.map((task) => [task.assigneeId.toString(), task.assigneeId])).values()];
  const roleIds = [...new Map(tasks.map((task) => [task.roleId.toString(), task.roleId])).values()];
  const [assignees, roles] = await Promise.all([
    database.collection('users').find({ _id: { $in: assigneeIds } }, { projection: { fullName: 1 } }).toArray(),
    database.collection('job_roles').find({ _id: { $in: roleIds } }, { projection: { name: 1 } }).toArray()
  ]);
  const assigneeNames = new Map(assignees.map((user) => [user._id.toString(), user.fullName]));
  const roleNames = new Map(roles.map((role) => [role._id.toString(), role.name]));

  return tasks.map((task) => ({
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    status: task.status,
    assignee: { id: task.assigneeId.toString(), fullName: assigneeNames.get(task.assigneeId.toString()) ?? 'Former employee' },
    role: { id: task.roleId.toString(), name: roleNames.get(task.roleId.toString()) ?? 'Former role' },
    reportingDate: task.reportAt?.toISOString().slice(0, 10),
    completionDate: task.completionDueAt?.toISOString().slice(0, 10),
    dueAt: task.dueAt,
    hasClientInfo: task.hasClientInfo,
    client: task.hasClientInfo ? task.client : null,
    createdAt: task.createdAt
  }));
}

export function createTasksRouter({ database }) {
  const router = Router();

  router.get('/', requireSession(database), asyncHandler(async (request, response) => {
    const filter = request.user.accountRole === 'admin' ? {} : { assigneeId: request.user._id };
    response.json({ data: { tasks: await taskRecords(database, filter) } });
  }));

  router.post('/', requireSession(database), requireAdmin, asyncHandler(async (request, response) => {
    const input = taskSchema.safeParse(request.body);
    if (!input.success) return response.status(400).json({ error: { code: 'INVALID_TASK', message: 'Check the task title, description, assignee, role, dates, and client details.' } });

    const assigneeId = new ObjectId(input.data.assigneeId);
    const roleId = new ObjectId(input.data.roleId);
    const assignee = await database.collection('users').findOne({ _id: assigneeId, accountRole: 'employee', isActive: true });
    if (!assignee) return response.status(400).json({ error: { code: 'INVALID_ASSIGNEE', message: 'Choose an active employee.' } });
    if (!(assignee.roleIds ?? []).some((assignedRoleId) => assignedRoleId.equals(roleId))) {
      return response.status(400).json({ error: { code: 'ROLE_NOT_ASSIGNED', message: 'Choose a role assigned to this employee.' } });
    }

    const now = new Date();
    const reportAt = new Date(`${input.data.reportingDate}T12:00:00.000Z`);
    const completionDueAt = new Date(`${input.data.completionDate}T12:00:00.000Z`);
    const task = {
      title: input.data.title,
      description: input.data.description,
      assigneeId,
      roleId,
      reportAt,
      dueAt: reportAt,
      completionDueAt,
      hasClientInfo: input.data.hasClientInfo,
      client: input.data.hasClientInfo ? input.data.client : null,
      status: 'available',
      createdBy: request.user._id,
      createdAt: now,
      updatedAt: now
    };
    const result = await database.collection('tasks').insertOne(task);
    await database.collection('task_activity').insertOne({ taskId: result.insertedId, actorId: request.user._id, action: 'Task created', createdAt: now });
    const [record] = await taskRecords(database, { _id: result.insertedId });
    return response.status(201).json({ data: { task: record } });
  }));

  return router;
}
