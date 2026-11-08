import { getUser } from "../shared/auth.mjs";
import { json } from "../shared/http.mjs";
import { toUser, getMemberRow, countsForMember } from "../shared/users.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user.isAdmin) {
      return json(403, { error: "Only admins can view members" });
    }

    const row = await getMemberRow(event.pathParameters.memberId);
    if (!row) {
      return json(404, { error: "Member not found" });
    }

    return json(200, { ...toUser(row), ...(await countsForMember(row.id)) });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};