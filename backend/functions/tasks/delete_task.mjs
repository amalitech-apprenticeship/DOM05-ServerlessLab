import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { getUser } from "../shared/auth.mjs";
import { json } from "../shared/http.mjs";
import { db, TABLE_NAME } from "../shared/tasks.mjs";
import {
  startDeadline,
  stopDeadline,
  restartDeadline,
} from "../shared/deadlines.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user.isAdmin) {
      return json(403, { error: "Only admins can delete tasks" });
    }

    const result = await db.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id: event.pathParameters.taskId },
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "ALL_OLD",
      }),
    );

    await stopDeadline(result.Attributes, { save: false });

    return { statusCode: 204 };
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return json(404, { error: "Task not found" });
    }
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
