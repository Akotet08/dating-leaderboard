import {
  createLeaderboardUser,
  deleteLeaderboardUser,
  findUserById,
  listLeaderboardUsers,
  updateLeaderboardUser
} from "./_db.js";
import { readSession } from "./_auth.js";

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const candidates = await listLeaderboardUsers();
      return response.status(200).json({ candidates: candidates.map(toCandidate) });
    }

    const admin = await requireAdmin(request);
    if (!admin) {
      return response.status(403).json({ error: "Admin access required" });
    }

    if (request.method === "POST") {
      const candidate = normalizeCandidate(request.body ?? {});
      await createLeaderboardUser(candidate);
      const candidates = await listLeaderboardUsers();
      return response.status(201).json({ candidates: candidates.map(toCandidate) });
    }

    if (request.method === "PUT") {
      const { id } = request.body ?? {};
      if (!id) {
        return response.status(400).json({ error: "Candidate id is required" });
      }

      const candidate = normalizeCandidate(request.body ?? {});
      await updateLeaderboardUser(String(id), candidate);
      const candidates = await listLeaderboardUsers();
      return response.status(200).json({ candidates: candidates.map(toCandidate) });
    }

    if (request.method === "DELETE") {
      const { id } = request.body ?? {};
      if (!id) {
        return response.status(400).json({ error: "Candidate id is required" });
      }

      await deleteLeaderboardUser(String(id));
      const candidates = await listLeaderboardUsers();
      return response.status(200).json({ candidates: candidates.map(toCandidate) });
    }

    response.setHeader("Allow", "GET, POST, PUT, DELETE");
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error?.code === "VALIDATION") {
      return response.status(400).json({ error: error.message });
    }

    if (error?.code === "23505") {
      return response.status(409).json({ error: "That name is already taken" });
    }

    console.error("candidates failed", error);
    return response.status(500).json({ error: "Unable to update candidates" });
  }
}

async function requireAdmin(request) {
  const session = readSession(request);
  if (!session?.id) {
    return null;
  }

  const user = await findUserById(session.id);
  return user?.role === "admin" ? user : null;
}

function normalizeCandidate(candidate) {
  const name = String(candidate.name ?? "").trim();
  const note = String(candidate.note ?? "").trim();
  const tier = ["S-Tier", "A-Tier", "B-Tier", "C-Tier"].includes(candidate.tier) ? candidate.tier : "C-Tier";

  if (name.length < 1 || note.length < 1) {
    throw Object.assign(new Error("Name and note are required"), { code: "VALIDATION" });
  }

  return {
    name,
    pickupLine: String(candidate.pickupLine ?? "").trim() || null,
    tier,
    score: clampScore(Number(candidate.score ?? 0)),
    note,
    delta: String(candidate.delta ?? "").trim(),
    isUser: Boolean(candidate.isUser),
    password: String(candidate.password ?? "")
  };
}

function toCandidate(user) {
  return {
    id: user.id,
    name: user.name,
    pickupLine: user.pickup_line,
    tier: user.tier,
    score: user.score,
    note: user.note,
    delta: user.delta ?? undefined,
    isUser: user.is_boostable,
    hasLogin: user.has_login
  };
}

function clampScore(score) {
  if (Number.isNaN(score)) {
    return 0;
  }
  return Math.min(80, Math.max(0, Math.round(score)));
}
