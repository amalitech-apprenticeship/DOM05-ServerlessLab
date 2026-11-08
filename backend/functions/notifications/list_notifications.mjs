import { getUser } from "../shared/auth.mjs";
import { json } from "../shared/http.mjs";
import { recipientsFor, queryNotifications, toNotification } from "../shared/notifications.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);

    const lists = await Promise.all(recipientsFor(user).map((recipientId) => queryNotifications(recipientId)));
    const notifications = lists
      .flat()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toNotification);

    return json(200, notifications);
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};