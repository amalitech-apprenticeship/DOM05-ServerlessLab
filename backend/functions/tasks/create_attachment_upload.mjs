import { getUser } from "../shared/auth.mjs";
import { json, parseBody } from "../shared/http.mjs";
import { getTask } from "../shared/tasks.mjs";
import { MAX_SIZE, ALLOWED_TYPES, createUploadUrl } from "../shared/attachments.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user.isAdmin) {
      return json(403, { error: "Only admins can add attachments" });
    }

    const input = parseBody(event);
    if (!input || typeof input.name !== "string" || !input.name.trim()) {
      return json(400, { error: "name is required" });
    }
    if (!ALLOWED_TYPES.includes(input.type)) {
      return json(400, { error: "This file type isn't allowed" });
    }
    if (typeof input.size !== "number" || input.size <= 0 || input.size > MAX_SIZE) {
      return json(400, { error: "Files must be smaller than 10 MB" });
    }

    const task = await getTask(event.pathParameters.taskId);
    if (!task) {
      return json(404, { error: "Task not found" });
    }
    if (task.archivedAt) {
      return json(409, { error: "Archived tasks are read-only" });
    }

    const { key, uploadUrl } = await createUploadUrl(task.id, input);

    return json(200, { key, uploadUrl, headers: { "Content-Type": input.type } });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};