import type { Config } from 'tailwindcss';
export default { content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { ink: '#0A0A0A', panel: '#141414', edge: '#262626', gold: '#D4AF37', 'gold-light': '#F2D675' }, fontFamily: { display: ['var(--font-bebas)'], sans: ['var(--font-inter)'] } } }, plugins: [] } satisfies Config;
