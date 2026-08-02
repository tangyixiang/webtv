import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import devServer from '@hono/vite-dev-server';

export default defineConfig({
  plugins: [
    react(),
    devServer({
      entry: 'src/worker/index.ts',
      exclude: [
        /^\/(src|node_modules|@vite|@react-refresh|favicon\.ico|assets|index\.html).*/,
        /^(?!\/api\/).*/,
      ],
    }),
  ],
  server: {
    port: 3000,
  },
});
