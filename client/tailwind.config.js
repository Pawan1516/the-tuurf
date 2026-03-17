/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            padding: {
                'safe': 'env(safe-area-inset-bottom, 0px)',
            },
        },
    },
    plugins: [
        function ({ addUtilities }) {
            addUtilities({
                '.no-scrollbar::-webkit-scrollbar': { display: 'none' },
                '.no-scrollbar': { '-ms-overflow-style': 'none', 'scrollbar-width': 'none' },
                '.scrollbar-hide::-webkit-scrollbar': { display: 'none' },
                '.scrollbar-hide': { '-ms-overflow-style': 'none', 'scrollbar-width': 'none' },
                '.pb-safe': { 'padding-bottom': 'env(safe-area-inset-bottom, 0px)' },
                '.pt-safe': { 'padding-top': 'env(safe-area-inset-top, 0px)' },
            });
        }
    ],
}
