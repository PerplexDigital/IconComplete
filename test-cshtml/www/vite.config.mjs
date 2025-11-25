"use strict";
import dns from 'dns';
import { defineConfig, loadEnv } from 'vite';
import mkcert from 'vite-plugin-mkcert';
dns.setDefaultResultOrder('verbatim');
export default ({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
    const isDev = process.env.NODE_ENV === 'development';
    return defineConfig({
        appType: 'custom',
        base: isDev ? '' : '/dist',
        root: 'src',
        server: {
            cors: true,
            hmr: {
                protocol: 'wss',
            },
        },
        plugins: [mkcert()],
        build: {
            rollupOptions: {
                input: {
                    // Styles
                    mainStyles: 'src/styles/main.css',
                    // Scripts
                    mainScripts: 'src/scripts/main.ts',
                },
            },
            outDir: '../wwwroot/dist',
            emptyOutDir: true,
        },
    });
};
//# sourceMappingURL=vite.config.mjs.map