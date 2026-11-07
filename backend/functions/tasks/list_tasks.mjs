import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TASKS_TABLE_NAME;

export const handler = async (event) => {
  try {
    const claims = event.requestContext.authorizer.jwt.claims;
    const groups = String(claims["cognito:groups"] ?? "")
      .replace(/[[\]]/g, "")
      .split(/[\s,]+/)
      .filter(Boolean);
    const isAdmin = groups.includes("admin");
    const userId = claims.sub;

    const result = isAdmin
      ? await ddbDocClient.send(new ScanCommand({ TableName: TABLE_NAME }))
      : await ddbDocClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "byAssignee",
            KeyConditionExpression: "assigneeId = :userId",
            ExpressionAttributeValues: {
              ":userId": userId,
            },
          }),
        );
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
