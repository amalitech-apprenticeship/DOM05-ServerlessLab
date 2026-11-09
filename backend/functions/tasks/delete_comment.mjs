import { getUser } from "../shared/auth.mjs";
import { json } from "../shared/http.mjs";
import { getTask } from "../shared/tasks.mjs";
import { getComment, removeComment } from "../shared/comments.mjs";
import { toTaskResponse } from "../shared/attachments.mjs";

const decode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const handler = async (event) => {
  try {
    const user = getUser(event);

    const task = await getTask(event.pathParameters.taskId);
    if (!task || (!user.isAdmin && task.assigneeId !== user.id)) {
      return json(404, { error: "Task not found" });
    }

    const commentId = decode(event.pathParameters.commentId);
    const comment = await getComment(task.id, commentId);
    if (!comment) {
      return json(404, { error: "Comment not found" });
    }
    if (!user.isAdmin && comment.authorId !== user.id) {
      return json(403, { error: "You can only delete your own comments" });
    }

    await removeComment(task.id, commentId);

    return json(200, await toTaskResponse(task));
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
