import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

export const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const cognito = new CognitoIdentityProviderClient({});

export const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME;
export const TASKS_TABLE_NAME = process.env.TASKS_TABLE_NAME;
export const USER_POOL_ID = process.env.USER_POOL_ID;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const toUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  createdAt: row.createdAt,
  ...(row.deactivatedAt && { deactivatedAt: row.deactivatedAt }),
});

export const getUserRow = async (id) => {
  const result = await db.send(new GetCommand({ TableName: USERS_TABLE_NAME, Key: { id } }));
  return result.Item;
};

export const getMemberRow = async (id) => {
  const row = await getUserRow(id);
  return row && row.role === "member" ? row : undefined;
};

const readAll = async (Command, params) => {
  const items = [];
  do {
    const result = await db.send(new Command(params));
    items.push(...result.Items);
    params.ExclusiveStartKey = result.LastEvaluatedKey;
  } while (params.ExclusiveStartKey);
  return items;
};

const count = (tasks) => ({
  openTasks: tasks.filter((task) => task.status !== "completed").length,
  completedTasks: tasks.filter((task) => task.status === "completed").length,
});

export const tasksForMember = (memberId) =>
  readAll(QueryCommand, {
    TableName: TASKS_TABLE_NAME,
    IndexName: "byAssignee",
    KeyConditionExpression: "#assigneeId = :memberId",
    ExpressionAttributeNames: { "#assigneeId": "assigneeId" },
    ExpressionAttributeValues: { ":memberId": memberId },
  });

export const countsForMember = async (memberId) => count(await tasksForMember(memberId));

export const countsForAllMembers = async () => {
  const tasks = await readAll(ScanCommand, {
    TableName: TASKS_TABLE_NAME,
    ProjectionExpression: "#assigneeId, #status",
    ExpressionAttributeNames: { "#assigneeId": "assigneeId", "#status": "status" },
  });
  const byMember = {};
  for (const task of tasks) {
    if (!task.assigneeId) continue;
    (byMember[task.assigneeId] ??= []).push(task);
  }
  return (memberId) => count(byMember[memberId] ?? []);
};

export const listMemberRows = () =>
  readAll(ScanCommand, {
    TableName: USERS_TABLE_NAME,
    FilterExpression: "#role = :member",
    ExpressionAttributeNames: { "#role": "role" },
    ExpressionAttributeValues: { ":member": "member" },
  });