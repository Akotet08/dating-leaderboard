import { createRegisteredUser } from "./_db.js";
import { createSessionCookie, sanitizeUser } from "./_auth.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, pickupLine, password } = request.body ?? {};
    const normalizedName = String(name ?? "").trim();
    const normalizedPickupLine = String(pickupLine ?? "").trim();
    const normalizedPassword = String(password ?? "");

    if (normalizedName.length < 2 || normalizedPickupLine.length < 2 || normalizedPassword.length < 8) {
      return response.status(400).json({ error: "Name, pickup line, and an 8+ character password are required" });
    }

    const user = await createRegisteredUser({
      name: normalizedName,
      pickupLine: normalizedPickupLine,
      password: normalizedPassword
    });

    response.setHeader("Set-Cookie", createSessionCookie(user));
    return response.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    if (error?.code === "23505") {
      return response.status(409).json({ error: "That name is already taken" });
    }

    console.error("register failed", error);
    return response.status(500).json({ error: "Unable to register" });
  }
}
