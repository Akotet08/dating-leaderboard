import { findLoginUserByName } from "./_db.js";
import { createSessionCookie, sanitizeUser, verifyPassword } from "./_auth.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, password } = request.body ?? {};
    if (!name || !password) {
      return response.status(400).json({ error: "Name and password are required" });
    }

    const user = await findLoginUserByName(String(name).trim());
    const valid = await verifyPassword(String(password), user?.password_hash);

    if (!user || !valid) {
      return response.status(401).json({ error: "Invalid login" });
    }

    response.setHeader("Set-Cookie", createSessionCookie(user));
    return response.status(200).json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error("login failed", error);
    return response.status(500).json({ error: "Unable to log in" });
  }
}
