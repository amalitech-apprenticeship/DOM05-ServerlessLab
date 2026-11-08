import { randomUUID } from "node:crypto";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

import { notifyAssigned } from "../shared/notify.mjs";
import {
  startDeadline,
  stopDeadline,
  restartDeadline,
} from "../shared/deadlines.mjs";

const PRIORITIES = ["low", "medium", "high", "urgent"];
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TASKS_TABLE_NAME;

export const handler = async (event) => {
  try {
    const claims = event.requestContext.authorizer.jwt.claims;
    const userId = claims.sub;
    const groups = String(claims["cognito:groups"] ?? "")
      .replace(/[[\]]/g, "")
      .split(/[\s,]+/)
      .filter(Boolean);
    const isAdmin = groups.includes("admin");

    if (!isAdmin) {
      return json(403, { error: "Only admins can create tasks" });
    }

    let input;

    try {
      input = JSON.parse(event.body ?? "{}");
    } catch (error) {
      return json(400, { error: "Invalid JSON in request body" });
    }

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return json(400, { error: "Invalid input, expected an object" });
    }
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) {
      return json(400, { error: "title is required" });
    }

    if (
      typeof input.dueDate !== "string" ||
      !DATE_FORMAT.test(input.dueDate) ||
      Number.isNaN(Date.parse(input.dueDate))
    ) {
      return json(400, { error: "dueDate is required, as YYYY-MM-DD" });
    }

    const priority = input.priority ?? "medium";
    if (!PRIORITIES.includes(priority)) {
      return json(400, {
        error: `priority must be one of: ${PRIORITIES.join(", ")}`,
      });
    }

    const assigneeId = input.assigneeId ?? null;
    if (assigneeId !== null && typeof assigneeId !== "string") {
      return json(400, { error: "assigneeId must be a string or null" });
    }

    const now = new Date().toISOString();
    const task = {
      id: randomUUID(),
      title: title.slice(0, 200),
      description: String(input.description ?? "").slice(0, 5000),
      category: String(input.category ?? "").slice(0, 100),
      priority,
      dueDate: input.dueDate,
      status: "new",
      attachment: null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          at: now,
          by: userId,
          action: "created",
          status: "new",
        },
      ],
    };

    if (assigneeId) {
      task.assigneeId = assigneeId;
      task.history.push({
        at: now,
        by: userId,
        action: "assigned",
        assigneeId,
      });
    }

    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: task,
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );

    if (assigneeId) {
      await notifyAssigned(task);
      await startDeadline(task);
    }

    return json(201, { ...task, assigneeId, archivedAt: null, comments: [] });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
