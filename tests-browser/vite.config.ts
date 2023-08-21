import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        browser: {
            enabled: true,
            name: 'chromium',
            provider: 'playwright'
        },
    }
})