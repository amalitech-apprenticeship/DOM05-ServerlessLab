import { getUser } from "../shared/auth.mjs";
import { json, parseBody } from "../shared/http.mjs";
import { getTask } from "../shared/tasks.mjs";
import { putComment } from "../shared/comments.mjs";
import { toTaskResponse } from "../shared/attachments.mjs";
import { notify } from "../shared/notify.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);

    const input = parseBody(event);
    const body = String(input?.body ?? "").trim();
    if (!body) {
      return json(400, { error: "Write a comment first" });
    }
    if (body.length > 2000) {
      return json(400, { error: "Comments must be 2000 characters or fewer" });
    }

    const task = await getTask(event.pathParameters.taskId);
    if (!task || (!user.isAdmin && task.assigneeId !== user.id)) {
      return json(404, { error: "Task not found" });
    }
    if (task.archivedAt) {
      return json(409, { error: "Archived tasks are read-only" });
    }

    await putComment(task.id, user.id, body);

    const recipientId = user.isAdmin ? task.assigneeId : "admin";
    if (recipientId && recipientId !== user.id) {
      const summary = body.length > 80 ? `${body.slice(0, 77)}...` : body;
      await notify({
        recipientId,
        type: "comment",
        taskId: task.id,
        title: `New comment: ${task.title}`,
        message: `${user.name || "Someone"} commented on "${task.title}": "${summary}"`,
      });
    }

    return json(201, await toTaskResponse(task));
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
