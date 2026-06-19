import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_BASE_URL: z.string().url(),
  ANTHROPIC_MODEL: z.string().min(1),
  ANTHROPIC_AUTH_TOKEN: z.string().min(1),
  NEWSAPI_API_KEY: z.string().min(1),
  PYTHON_PATH: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

export const env = parsed.data;
