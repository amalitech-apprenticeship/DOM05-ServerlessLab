import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

export const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.COMMENTS_TABLE_NAME;

export const toComment = (item) => ({
  id: item.id,
  authorId: item.authorId,
  body: item.body,
  attachment: null,
  createdAt: item.createdAt.split("#")[0],
});

const readAll = async (Command, params) => {
  const items = [];
  do {
    const result = await db.send(new Command(params));
    items.push(...result.Items);
    params.ExclusiveStartKey = result.LastEvaluatedKey;
  } while (params.ExclusiveStartKey);
  return items;
};

const queryTaskComments = (taskId) =>
  readAll(QueryCommand, {
    TableName: TABLE_NAME,
    KeyConditionExpression: "#taskId = :taskId",
    ExpressionAttributeNames: { "#taskId": "taskId" },
    ExpressionAttributeValues: { ":taskId": taskId },
  });

export const commentsForTask = async (taskId) => (await queryTaskComments(taskId)).map(toComment);

export const commentsByTask = async () => {
  const items = await readAll(ScanCommand, { TableName: TABLE_NAME });
  const grouped = {};
  for (const item of items) {
    (grouped[item.taskId] ??= []).push(item);
  }
  for (const list of Object.values(grouped)) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return (taskId) => (grouped[taskId] ?? []).map(toComment);
};

export const getComment = async (taskId, id) => {
  const result = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { taskId, createdAt: id } }));
  return result.Item;
};

export const putComment = async (taskId, authorId, body) => {
  const id = `${new Date().toISOString()}#${randomUUID()}`;
  await db.send(new PutCommand({ TableName: TABLE_NAME, Item: { taskId, createdAt: id, id, authorId, body } }));
};

export const removeComment = (taskId, id) =>
  db.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { taskId, createdAt: id } }));

export const removeTaskComments = async (taskId) => {
  for (const item of await queryTaskComments(taskId)) {
    await removeComment(taskId, item.createdAt);
  }
};