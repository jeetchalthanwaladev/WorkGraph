import { Router } from 'express';
import { requireAdmin, requireSession } from './auth.js';

const TASK_STATUSES = [
  { id: 'available', label: 'Available', color: 'blue' },
  { id: 'in_progress', label: 'In progress', color: 'purple' },
  { id: 'submitted_for_review', label: 'Awaiting review', color: 'amber' },
  { id: 'changes_requested', label: 'Changes requested', color: 'rose' },
  { id: 'completed', label: 'Completed', color: 'green' }
];

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export function createDashboardRouter({ database }) {
  const router = Router();
  const users = database.collection('users');
  const tasks = database.collection('tasks');

  router.get('/summary', requireSession(database), requireAdmin, asyncHandler(async (_request, response) => {
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const activeEmployeeFilter = { accountRole: 'employee', isActive: true };
    const openTaskFilter = { status: { $nin: ['completed', 'cancelled'] } };
    const [employeeCount, roleRecords, ...taskCounts] = await Promise.all([
      users.countDocuments(activeEmployeeFilter),
      database.collection('job_roles').find({}).sort({ name: 1 }).toArray(),
      tasks.countDocuments({}),
      tasks.countDocuments(openTaskFilter),
      ...TASK_STATUSES.map(({ id }) => tasks.countDocuments({ status: id })),
      tasks.countDocuments({ ...openTaskFilter, dueAt: { $lt: now } })
    ]);
    const [totalTasks, openTaskCount, ...counts] = taskCounts;
    const overdueTasks = counts.pop();
    const statuses = TASK_STATUSES.map((status, index) => ({ ...status, count: counts[index] }));
    const [upcomingDeadlines, recentActivity, workload] = await Promise.all([
      tasks.find({ ...openTaskFilter, dueAt: { $gte: now, $lte: inSevenDays } })
        .sort({ dueAt: 1 }).limit(5)
        .project({ _id: 1, title: 1, dueAt: 1, priority: 1, status: 1 }).toArray(),
      database.collection('task_activity').aggregate([
        { $sort: { createdAt: -1 } }, { $limit: 6 },
        { $lookup: { from: 'tasks', localField: 'taskId', foreignField: '_id', as: 'task' } },
        { $unwind: { path: '$task', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'users', localField: 'actorId', foreignField: '_id', as: 'actor' } },
        { $unwind: { path: '$actor', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, action: 1, oldStatus: 1, newStatus: 1, createdAt: 1, taskTitle: { $ifNull: ['$task.title', 'Task'] }, actorName: { $ifNull: ['$actor.fullName', 'Workspace'] } } }
      ]).toArray(),
      Promise.all(roleRecords.map(async (role) => ({
        id: role._id.toString(),
        name: role.name,
        employeeCount: await users.countDocuments({ ...activeEmployeeFilter, roleIds: role._id })
      })))
    ]);

    response.json({ data: {
      summary: { employeeCount, totalTasks, openTaskCount, overdueTasks },
      statuses,
      workload,
      upcomingDeadlines: upcomingDeadlines.map(({ _id, ...task }) => ({ id: _id.toString(), ...task })),
      recentActivity: recentActivity.map(({ _id, ...activity }) => ({ id: _id.toString(), ...activity }))
    } });
  }));

  return router;
}
