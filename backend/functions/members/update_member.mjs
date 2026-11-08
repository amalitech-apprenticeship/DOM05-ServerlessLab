import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminUserGlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getUser } from "../shared/auth.mjs";
import { json, parseBody } from "../shared/http.mjs";
import {
  db,
  cognito,
  USERS_TABLE_NAME,
  TASKS_TABLE_NAME,
  USER_POOL_ID,
  toUser,
  getMemberRow,
  tasksForMember,
} from "../shared/users.mjs";
import {
  startDeadline,
  stopDeadline,
  restartDeadline,
} from "../shared/deadlines.mjs";

const unassignOpenTasks = async (memberId, adminId, at) => {
  const openTasks = (await tasksForMember(memberId)).filter(
    (task) => task.status !== "completed",
  );

  for (const task of openTasks) {
    await db.send(
      new UpdateCommand({
        TableName: TASKS_TABLE_NAME,
        Key: { id: task.id },
        UpdateExpression:
          "SET #status = :new, #updatedAt = :at, #history = list_append(if_not_exists(#history, :empty), :entry) REMOVE #assigneeId",
        ExpressionAttributeNames: {
          "#status": "status",
          "#updatedAt": "updatedAt",
          "#history": "history",
          "#assigneeId": "assigneeId",
        },
        ExpressionAttributeValues: {
          ":new": "new",
          ":at": at,
          ":empty": [],
          ":entry": [
            {
              at,
              by: adminId,
              action: "assigned",
              assigneeId: null,
              status: "new",
            },
          ],
        },
      }),
    );
  }

  return openTasks.length;
};

export const handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user.isAdmin) {
      return json(403, { error: "Only admins can update members" });
    }

    const input = parseBody(event);
    if (!input || typeof input.active !== "boolean") {
      return json(400, { error: "active (true or false) is required" });
    }

    const row = await getMemberRow(event.pathParameters.memberId);
    if (!row) {
      return json(404, { error: "Member not found" });
    }

    const isActive = !row.deactivatedAt;
    if (input.active === isActive) {
      return json(200, { ...toUser(row), unassignedTasks: 0 });
    }

    if (!input.active) {
      const at = new Date().toISOString();
      await cognito.send(
        new AdminDisableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: row.username,
        }),
      );
      await cognito.send(
        new AdminUserGlobalSignOutCommand({
          UserPoolId: USER_POOL_ID,
          Username: row.username,
        }),
      );

      const result = await db.send(
        new UpdateCommand({
          TableName: USERS_TABLE_NAME,
          Key: { id: row.id },
          UpdateExpression: "SET #deactivatedAt = :at",
          ExpressionAttributeNames: { "#deactivatedAt": "deactivatedAt" },
          ExpressionAttributeValues: { ":at": at },
          ReturnValues: "ALL_NEW",
        }),
      );

      const unassignedTasks = await unassignOpenTasks(row.id, user.id, at);
      return json(200, { ...toUser(result.Attributes), unassignedTasks });
    }

    await cognito.send(
      new AdminEnableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: row.username,
      }),
    );

    await stopDeadline(task, { save: false });

    const result = await db.send(
      new UpdateCommand({
        TableName: USERS_TABLE_NAME,
        Key: { id: row.id },
        UpdateExpression: "REMOVE #deactivatedAt",
        ExpressionAttributeNames: { "#deactivatedAt": "deactivatedAt" },
        ReturnValues: "ALL_NEW",
      }),
    );

    return json(200, { ...toUser(result.Attributes), unassignedTasks: 0 });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
