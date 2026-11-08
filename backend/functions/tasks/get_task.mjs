import { getUser } from "../shared/auth.mjs";
import { json } from "../shared/http.mjs";
import { getTask } from "../shared/tasks.mjs";
import { toTaskResponse } from "../shared/attachments.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    const task = await getTask(event.pathParameters.taskId);

    if (!task || (!user.isAdmin && task.assigneeId !== user.id)) {
      return json(404, { error: "Task not found" });
    }

    return json(200, await toTaskResponse(task));
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};