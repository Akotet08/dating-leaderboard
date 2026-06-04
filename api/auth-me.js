import { findUserById } from "./_db.js";
import { readSession, sanitizeUser } from "./_auth.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = readSession(request);
    if (!session?.id) {
      return response.status(200).json({ user: null });
    }

    const user = await findUserById(session.id);
    return response.status(200).json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error("auth-me failed", error);
    return response.status(500).json({ error: "Unable to load session" });
  }
}
