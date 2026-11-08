import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.NOTIFICATIONS_TABLE_NAME;

export const recipientsFor = (user) => (user.isAdmin ? [user.id, "admin"] : [user.id]);

export const toNotification = (item) => ({
  id: item.id,
  recipientId: item.recipientId,
  type: item.type,
  taskId: item.taskId ?? null,
  title: item.title,
  message: item.message,
  createdAt: item.createdAt.split("#")[0],
  read: item.read === true,
});

export const queryNotifications = async (recipientId, { unreadOnly = false } = {}) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "#recipientId = :recipientId",
    ExpressionAttributeNames: { "#recipientId": "recipientId" },
    ExpressionAttributeValues: { ":recipientId": recipientId },
  };
  if (unreadOnly) {
    params.FilterExpression = "#read = :false";
    params.ExpressionAttributeNames["#read"] = "read";
    params.ExpressionAttributeValues[":false"] = false;
  }

  const items = [];
  do {
    const result = await db.send(new QueryCommand(params));
    items.push(...result.Items);
    params.ExclusiveStartKey = result.LastEvaluatedKey;
  } while (params.ExclusiveStartKey);
  return items;
};

export const markAsRead = (recipientId, id) =>
  db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { recipientId, createdAt: id },
      UpdateExpression: "SET #read = :true",
      ConditionExpression: "attribute_exists(createdAt)",
      ExpressionAttributeNames: { "#read": "read" },
      ExpressionAttributeValues: { ":true": true },
    }),
  );