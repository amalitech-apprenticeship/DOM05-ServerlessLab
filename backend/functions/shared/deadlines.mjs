import { SFNClient, StartExecutionCommand, StopExecutionCommand } from "@aws-sdk/client-sfn";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./tasks.mjs";

export const sfn = new SFNClient({});
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN;
const DAY_MS = 24 * 60 * 60 * 1000;

const toTimestamp = (date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");

const saveExecutionArn = (taskId, executionArn) =>
  db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: taskId },
      UpdateExpression: executionArn ? "SET #executionArn = :arn" : "REMOVE #executionArn",
      ConditionExpression: "attribute_exists(id)",
      ExpressionAttributeNames: { "#executionArn": "executionArn" },
      ...(executionArn && { ExpressionAttributeValues: { ":arn": executionArn } }),
    }),
  );

export const startDeadline = async (task) => {
  if (!task.assigneeId || task.status === "completed" || task.archivedAt) return null;

  try {
    const dueAt = new Date(`${task.dueDate}T23:59:59Z`);
    const remindAt = new Date(dueAt.getTime() - DAY_MS);
    const input = {
      taskId: task.id,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate,
      remindAt: toTimestamp(remindAt),
      dueAt: toTimestamp(dueAt),
      skipReminder: dueAt <= new Date(),
    };

    const { executionArn } = await sfn.send(
      new StartExecutionCommand({
        stateMachineArn: STATE_MACHINE_ARN,
        name: `${task.id}-${Date.now()}`,
        input: JSON.stringify(input),
      }),
    );
    await saveExecutionArn(task.id, executionArn);
    return executionArn;
  } catch (error) {
    console.error("startDeadline failed", error);
    return null;
  }
};

export const stopDeadline = async (task, { save = true } = {}) => {
  if (!task?.executionArn) return;

  try {
    await sfn.send(new StopExecutionCommand({ executionArn: task.executionArn, cause: "Task changed" }));
  } catch (error) {
    console.error("stopDeadline failed", error);
  }

  if (save) {
    await saveExecutionArn(task.id, null).catch((error) => console.error("clear executionArn failed", error));
  }
};

export const restartDeadline = async (task) => {
  await stopDeadline(task, { save: false });
  const executionArn = await startDeadline(task);
  if (!executionArn && task.executionArn) {
    await saveExecutionArn(task.id, null).catch((error) => console.error("clear executionArn failed", error));
  }
};