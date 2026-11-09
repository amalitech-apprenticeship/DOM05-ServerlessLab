import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { getUser } from "../shared/auth.mjs";
import { json } from "../shared/http.mjs";
import { db, TABLE_NAME } from "../shared/tasks.mjs";
import { stopDeadline } from "../shared/deadlines.mjs";
import { removeTaskComments } from "../shared/comments.mjs";

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
    await deleteAttachment(result.Attributes?.attachment);
    await removeTaskComments(event.pathParameters.taskId);

    return { statusCode: 204 };
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return json(404, { error: "Task not found" });
    }
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
