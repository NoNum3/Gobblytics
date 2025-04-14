/** @type {import('vite').UserConfig} */
module.exports = {
    server: {
        // Ensure HMR works properly by forcing the client to use the correct server URL
        hmr: {
            clientPort: null, // Use the same port as the server
            host: "localhost", // Use localhost instead of IP
        },
    },
    build: {
        outDir: "dist",
        assetsDir: "assets",
    },
};
