import { findUserById, updateUserPassword } from "./_db.js";
import { readSession, verifyPassword } from "./_auth.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = readSession(request);
    if (!session?.id) {
      return response.status(401).json({ error: "Login required" });
    }

    const { currentPassword, newPassword } = request.body ?? {};
    if (!currentPassword || String(newPassword ?? "").length < 8) {
      return response.status(400).json({ error: "Current password and an 8+ character new password are required" });
    }

    const user = await findUserById(session.id);
    const valid = await verifyPassword(String(currentPassword), user?.password_hash);
    if (!user || !valid) {
      return response.status(401).json({ error: "Current password is incorrect" });
    }

    await updateUserPassword(user.id, String(newPassword));
    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error("change-password failed", error);
    return response.status(500).json({ error: "Unable to change password" });
  }
}
