import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';

export default defineConfig({
    plugins: [
        ...VitePluginNode({
            adapter: "nest",
            appPath: "./src/main.ts",
            tsCompiler: "swc",
            exportName: "enimeNodeApp"
        })
    ],
    optimizeDeps: {
        disabled: false,
        exclude: [
            "@nestjs/microservices",
            "@nestjs/websockets",
            "cache-manager",
            "class-transformer",
            "class-validator",
            "fastify-swagger",
        ]
    }
});