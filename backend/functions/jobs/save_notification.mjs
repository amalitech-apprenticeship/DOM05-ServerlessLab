import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.NOTIFICATIONS_TABLE_NAME;

export const handler = async (event) => {
  for (const record of event.Records) {
    const data = JSON.parse(record.Sns.Message);
    if (!data.recipientId) {
      console.error("Skipping message without recipientId", record.Sns.MessageId);
      continue;
    }

    const id = `${record.Sns.Timestamp}#${randomUUID()}`;

    await db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          recipientId: data.recipientId,
          createdAt: id,
          id,
          type: data.type,
          taskId: data.taskId ?? null,
          title: data.title,
          message: data.message,
          read: false,
        },
      }),
    );
  }
};