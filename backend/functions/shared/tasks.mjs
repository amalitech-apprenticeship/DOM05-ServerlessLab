import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

export const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const TABLE_NAME = process.env.TASKS_TABLE_NAME;

export const PRIORITIES = ["low", "medium", "high", "urgent"];
export const STATUSES = ["new", "to_do", "in_progress", "completed", "blocked"];
export const MEMBER_STATUS_TRANSITIONS = {
  new: ["to_do"],
  to_do: ["in_progress"],
  in_progress: ["completed", "blocked"],
  blocked: ["in_progress"],
  completed: [],
};
export const STATUS_LABELS = {
  new: "New",
  to_do: "To do",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Needs attention",
};

export const isValidDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value));

export const toTask = (item) => ({
  assigneeId: null,
  archivedAt: null,
  comments: [],
  ...item,
});

export const getTask = async (id) => {
  const result = await db.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } }),
  );
  return result.Item;
};

export const applyUpdate = async (id, fields, entry, options = {}) => {
  const { remove = [], condition, conditionValues = {} } = options;

  const names = { "#updatedAt": "updatedAt", "#history": "history" };
  const values = {
    ":updatedAt": entry.at,
    ":entry": [entry],
    ":empty": [],
    ...conditionValues,
  };
  const sets = [
    "#updatedAt = :updatedAt",
    "#history = list_append(if_not_exists(#history, :empty), :entry)",
  ];

  for (const [key, value] of Object.entries(fields)) {
    names[`#${key}`] = key;
    values[`:${key}`] = value;
    sets.push(`#${key} = :${key}`);
  }
  for (const key of remove) {
    names[`#${key}`] = key;
  }

  let expression = `SET ${sets.join(", ")}`;
  if (remove.length) {
    expression += ` REMOVE ${remove.map((key) => `#${key}`).join(", ")}`;
  }

  const result = await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: expression,
      ConditionExpression: condition,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    }),
  );
  return result.Attributes;
};
