import { getUser } from "../shared/auth.mjs";
import { json } from "../shared/http.mjs";
import { recipientsFor, markAsRead } from "../shared/notifications.mjs";

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
    const id = decode(event.pathParameters.notificationId);

    for (const recipientId of recipientsFor(user)) {
      try {
        await markAsRead(recipientId, id);
        return json(200, { id });
      } catch (error) {
        if (error.name !== "ConditionalCheckFailedException") throw error;
      }
    }

    return json(404, { error: "Notification not found" });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};