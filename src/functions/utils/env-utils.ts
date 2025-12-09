export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new EnvError(`Missing required environment variable: ${name}`);
  }
  return value;
};
