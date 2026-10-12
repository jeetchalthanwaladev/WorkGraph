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
const taskActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({
    action: z.literal('submit'),
    summary: z.string().trim().min(10).max(5000),
    link: z.union([z.string().url().refine((value) => /^https?:\/\//i.test(value)), z.literal('')]).default('')
  }),
  z.object({ action: z.literal('approve'), feedback: z.string().trim().max(2000).default('') }),
  z.object({ action: z.literal('request_changes'), feedback: z.string().trim().min(3).max(2000) })
]);

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
  const reviewerIds = [...new Map(tasks.filter((task) => task.review?.reviewedBy).map((task) => [task.review.reviewedBy.toString(), task.review.reviewedBy])).values()];
  const reviewers = reviewerIds.length ? await database.collection('users').find({ _id: { $in: reviewerIds } }, { projection: { fullName: 1 } }).toArray() : [];
  const assigneeNames = new Map(assignees.map((user) => [user._id.toString(), user.fullName]));
  const roleNames = new Map(roles.map((role) => [role._id.toString(), role.name]));
  const reviewerNames = new Map(reviewers.map((user) => [user._id.toString(), user.fullName]));

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
    submission: task.submission ? { summary: task.submission.summary, link: task.submission.link ?? '', submittedAt: task.submission.submittedAt } : null,
    review: task.review ? { feedback: task.review.feedback ?? '', reviewedAt: task.review.reviewedAt, reviewerName: reviewerNames.get(task.review.reviewedBy?.toString()) ?? 'Administrator' } : null,
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

  router.patch('/:id', requireSession(database), asyncHandler(async (request, response) => {
    if (!ObjectId.isValid(request.params.id)) return response.status(404).json({ error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' } });
    const input = taskActionSchema.safeParse(request.body);
    if (!input.success) return response.status(400).json({ error: { code: 'INVALID_TASK_ACTION', message: 'Add a submission note of at least 10 characters, a valid web link, or review feedback.' } });

    const taskId = new ObjectId(request.params.id);
    const task = await database.collection('tasks').findOne({ _id: taskId });
    if (!task) return response.status(404).json({ error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' } });
    const now = new Date();
    const action = input.data.action;
    let nextStatus;
    let update;
    let activity;

    if (request.user.accountRole === 'admin') {
      if (!['approve', 'request_changes'].includes(action)) return response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Administrators can approve work or request changes.' } });
      if (task.status !== 'submitted_for_review') return response.status(409).json({ error: { code: 'TASK_NOT_AWAITING_REVIEW', message: 'This task is not currently awaiting review.' } });
      nextStatus = action === 'approve' ? 'completed' : 'changes_requested';
      update = { status: nextStatus, review: { feedback: input.data.feedback, reviewedBy: request.user._id, reviewedAt: now }, updatedAt: now };
      activity = action === 'approve' ? 'Work approved and task completed' : 'Changes requested';
    } else {
      if (!task.assigneeId.equals(request.user._id)) return response.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only update tasks assigned to you.' } });
      if (action === 'start' && task.status === 'available') {
        nextStatus = 'in_progress';
        update = { status: nextStatus, updatedAt: now, startedAt: now };
        activity = 'Task started';
      } else if (action === 'submit' && ['in_progress', 'changes_requested'].includes(task.status)) {
        nextStatus = 'submitted_for_review';
        update = { status: nextStatus, submission: { summary: input.data.summary, link: input.data.link, submittedAt: now }, updatedAt: now };
        activity = task.status === 'changes_requested' ? 'Revised work resubmitted for review' : 'Work submitted for review';
      } else {
        return response.status(409).json({ error: { code: 'INVALID_TASK_TRANSITION', message: 'This task cannot be updated with that action in its current status.' } });
      }
    }

    const updated = await database.collection('tasks').updateOne({ _id: taskId, status: task.status }, { $set: update });
    if (!updated.matchedCount) return response.status(409).json({ error: { code: 'TASK_STATUS_CHANGED', message: 'The task changed while you were updating it. Refresh and try again.' } });
    await database.collection('task_activity').insertOne({ taskId, actorId: request.user._id, action: activity, createdAt: now });
    const [record] = await taskRecords(database, { _id: taskId });
    return response.json({ data: { task: record } });
  }));

  return router;
}
