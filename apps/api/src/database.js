import { MongoClient } from 'mongodb';

const collectionDefinitions = [
  { name: 'users', indexes: [{ key: { loginId: 1 }, options: { unique: true, name: 'users_login_id_unique' } }] },
  { name: 'job_roles', indexes: [{ key: { name: 1 }, options: { unique: true, name: 'job_roles_name_unique' } }] },
  { name: 'tasks', indexes: [{ key: { status: 1, dueAt: 1 }, options: { name: 'tasks_status_due_at' } }, { key: { claimedBy: 1, status: 1 }, options: { name: 'tasks_claimed_by_status' } }] },
  { name: 'task_activity', indexes: [{ key: { taskId: 1, createdAt: -1 }, options: { name: 'task_activity_task_created' } }] },
  { name: 'task_comments', indexes: [{ key: { taskId: 1, createdAt: 1 }, options: { name: 'task_comments_task_created' } }] },
  { name: 'sessions', indexes: [{ key: { tokenHash: 1 }, options: { unique: true, name: 'sessions_token_hash_unique' } }, { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'sessions_expiry_ttl' } }] }
];

export async function connectDatabase({ uri, databaseName }) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const database = client.db(databaseName);

  try {
    for (const definition of collectionDefinitions) {
      const exists = await database.listCollections({ name: definition.name }, { nameOnly: true }).hasNext();
      if (!exists) await database.createCollection(definition.name);
      if (definition.name === 'users') {
        const collection = database.collection(definition.name);
        const oldEmailIndex = (await collection.listIndexes().toArray()).find((index) => index.name === 'users_email_unique');
        if (oldEmailIndex) await collection.dropIndex(oldEmailIndex.name);
      }
      if (definition.indexes.length) {
        await database.collection(definition.name).createIndexes(definition.indexes);
      }
    }
  } catch (error) {
    await client.close();
    throw error;
  }

  return { client, database };
}
