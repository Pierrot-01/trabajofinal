import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/vitest.setup.ts'],
    env: {
      DATABASE_URL: "mysql://db_user:db_password_123@localhost:3306/dummy_test_db",
      AUTH_SECRET: "dummy_secret_for_auth_testing_purpose_32chars"
    },
    coverage: {
      provider: 'v8',
      exclude: [
        'lib/prisma-client/**',
        'lib/prisma.ts',
        'lib/logger.ts',
        'lib/auth.ts',
        'tests/**'
      ]
    }
  },
});
