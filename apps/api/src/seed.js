import bcrypt from 'bcryptjs';

export async function seedDevelopmentAccounts(database, { adminLoginId, adminPassword, employeeLoginId, employeePassword }) {
  const roles = database.collection('job_roles');
  const users = database.collection('users');
  const now = new Date();

  await roles.updateOne(
    { name: 'Graphics Designing' },
    { $setOnInsert: { name: 'Graphics Designing', description: 'Create visual assets and graphic design work.', createdAt: now } },
    { upsert: true }
  );
  const graphicsRole = await roles.findOne({ name: 'Graphics Designing' });

  const accounts = [
    { loginId: adminLoginId, password: adminPassword, fullName: 'WorkGraph Admin', accountRole: 'admin', roleIds: [] },
    { loginId: employeeLoginId, password: employeePassword, fullName: 'Graphics Employee', accountRole: 'employee', roleIds: [graphicsRole._id] }
  ];

  for (const account of accounts) {
    if (!account.loginId || !account.password) continue;
    const passwordHash = await bcrypt.hash(account.password, 12);
    await users.updateOne(
      { loginId: account.loginId },
      { $setOnInsert: { fullName: account.fullName, loginId: account.loginId, passwordHash, accountRole: account.accountRole, roleIds: account.roleIds, isActive: true, createdAt: now, updatedAt: now } },
      { upsert: true }
    );
  }
}
