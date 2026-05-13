import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Lark Blue を基準にする（CLAUDE.md §3.1）
        brand: {
          primary: '#3370FF',
          primaryHover: '#2858D3',
          primaryActive: '#1E47B5',
          primarySoft: '#E8F0FF',
        },
        text: {
          primary: '#1D2129',
          secondary: '#4E5969',
          tertiary: '#86909C',
          disabled: '#C9CDD4',
          inverse: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E5E6EB',
          strong: '#C9CDD4',
          focus: '#3370FF',
        },
        bg: {
          base: '#FFFFFF',
          subtle: '#F7F8FA',
          muted: '#F2F3F5',
        },
        status: {
          success: '#00B42A',
          successSoft: '#E8F8EE',
          warning: '#FF7D00',
          warningSoft: '#FFF3E8',
          error: '#F53F3F',
          errorSoft: '#FFECE8',
          info: '#3370FF',
          infoSoft: '#E8F0FF',
          neutral: '#86909C',
          neutralSoft: '#F2F3F5',
        },
      },
      borderRadius: {
        // CLAUDE.md §3.4 に従う。12px 以上は使わない
        none: '0',
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        full: '9999px',
      },
      fontFamily: {
        sans: [
          'Hiragino Sans',
          'Hiragino Kaku Gothic ProN',
          'Noto Sans JP',
          'Yu Gothic UI',
          'Meiryo',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      fontSize: {
        // CLAUDE.md §3.2
        display: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        h1: ['16px', { lineHeight: '24px', fontWeight: '600' }],
        h2: ['14px', { lineHeight: '22px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '22px', fontWeight: '400' }],
        sm: ['13px', { lineHeight: '20px', fontWeight: '400' }],
        xs: ['12px', { lineHeight: '18px', fontWeight: '400' }],
      },
      boxShadow: {
        // 1 種類だけ。Modal/Popover/Dropdown 用
        overlay: '0 4px 10px rgba(29,33,41,0.10), 0 0 1px rgba(29,33,41,0.30)',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};

export default config;
