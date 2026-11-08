import { getUser } from "../shared/auth.mjs";
import { json } from "../shared/http.mjs";
import { toUser, listMemberRows, countsForAllMembers } from "../shared/users.mjs";

const parseFlag = (value) => (value === "true" ? true : value === "false" ? false : undefined);

export const handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user.isAdmin) {
      return json(403, { error: "Only admins can list members" });
    }

    const query = event.queryStringParameters ?? {};
    const name = String(query.name ?? "").trim().toLowerCase();
    const hasOpenTasks = parseFlag(query.hasOpenTasks);
    const hasCompletedTasks = parseFlag(query.hasCompletedTasks);

    const [rows, countsFor] = await Promise.all([listMemberRows(), countsForAllMembers()]);

    const members = rows
      .map((row) => ({ ...toUser(row), ...countsFor(row.id) }))
      .filter((member) => !name || member.name.toLowerCase().includes(name))
      .filter((member) => hasOpenTasks === undefined || member.openTasks > 0 === hasOpenTasks)
      .filter((member) => hasCompletedTasks === undefined || member.completedTasks > 0 === hasCompletedTasks)
      .sort((a, b) => a.name.localeCompare(b.name));

    return json(200, members);
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};