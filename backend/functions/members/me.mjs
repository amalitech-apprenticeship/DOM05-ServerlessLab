import { getUser } from "../shared/auth.mjs";
import { json } from "../shared/http.mjs";
import { toUser, getUserRow } from "../shared/users.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    const claims = event.requestContext.authorizer.jwt.claims;
    const role = user.isAdmin ? "admin" : "member";

    const row = await getUserRow(user.id);
    if (row) {
      return json(200, { ...toUser(row), role });
    }

    return json(200, {
      id: user.id,
      name: claims.name ?? "",
      email: claims.email ?? "",
      role,
      createdAt: "",
    });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};