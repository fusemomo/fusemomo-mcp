import { z } from 'zod';

const ConfigSchema = z.object({
  apiUrl: z
    .string()
    .url('FUSEMOMO_API_URL must be a valid URL')
    .default('https://api.fusemomo.com'),
  apiKey: z
    .string()
    .min(1, 'FUSEMOMO_API_KEY is required')
    .refine(
      (k) => k.startsWith('sk_live_') || k.startsWith('sk_test_'),
      'FUSEMOMO_API_KEY must start with sk_live_ or sk_test_',
    ),
  timeout: z.coerce.number().int().positive().default(30000),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  nodeEnv: z.enum(['development', 'production']).default('production'),
});

export type Config = z.infer<typeof ConfigSchema>;

//  Load + validate 

function loadConfig(): Config {
  const result = ConfigSchema.safeParse({
    apiUrl: process.env['FUSEMOMO_API_URL'],
    apiKey: process.env['FUSEMOMO_API_KEY'],
    timeout: process.env['FUSEMOMO_TIMEOUT'],
    logLevel: process.env['LOG_LEVEL'],
    nodeEnv: process.env['NODE_ENV'],
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    process.stderr.write(`ERROR: Invalid configuration\n${issues}\n`);
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
