export const boostPackages = {
  nudge: {
    id: "nudge",
    name: "Nudge",
    spots: 1,
    unitAmount: 299
  },
  push: {
    id: "push",
    name: "Push",
    spots: 3,
    unitAmount: 699
  },
  launch: {
    id: "launch",
    name: "Launch",
    spots: 5,
    unitAmount: 1299
  }
};

export function getBoostPackage(boostId) {
  return boostPackages[boostId] ?? null;
}

export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getFirstEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required environment variable. Tried: ${names.join(", ")}`);
}
