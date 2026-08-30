/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'"SF Pro Display"',
  				'"Segoe UI"',
  				'Roboto',
  				'Helvetica',
  				'Arial',
  				'sans-serif'
  			],
  			mono: ['ui-monospace', '"Cascadia Code"', '"JetBrains Mono"', '"SFMono-Regular"', 'Menlo', 'Consolas', 'monospace']
  		},
  		colors: {
  			// Light-first retail palette taken from the reference design: white and near-black
  			// carry the page, a single red drives every call to action, and the saturated
  			// category colours only ever appear as whole blocks — never as text or borders.
  			// Token names are unchanged so the dashboards re-skin with the marketing pages.
  			brand: {
  				'50': '#FFF1F2',
  				'100': '#FFE0E2',
  				'400': '#FF6B73',
  				'600': '#F5333F',
  				'700': '#D91E2A',
  				DEFAULT: '#F5333F'
  			},
  			// Category block colours. Used as backgrounds behind cut-out product shots.
  			sun:   { DEFAULT: '#FFC93C', '600': '#F2B417' },
  			grass: { DEFAULT: '#21C25E', '600': '#17A34B' },
  			sky:   { DEFAULT: '#2D7FF9', '600': '#1B66DB' },
  			violet: {
  				'50': '#F5F3FF',
  				'600': '#7C5CFF',
  				DEFAULT: '#7C5CFF'
  			},
  			electric: {
  				'500': '#2D7FF9',
  				DEFAULT: '#2D7FF9'
  			},
  			// Success / live. Matches the green category block so the palette stays closed.
  			signal: {
  				'50': '#E8F9EF',
  				'500': '#21C25E',
  				DEFAULT: '#21C25E'
  			},
  			// Near-black rather than navy — the reference has no blue in its neutrals.
  			ink: {
  				'800': '#1F1F1F',
  				'900': '#0D0D0D',
  				DEFAULT: '#141414'
  			},
  			graphite: {
  				'50': '#F7F7F7',
  				'100': '#F0F0F0',
  				'200': '#E4E4E4',
  				'400': '#9A9A9A',
  				'600': '#5A5A5A',
  				'700': '#3D3D3D',
  				'800': '#262626',
  				DEFAULT: '#5A5A5A'
  			},
  			paper: '#FFFFFF',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		boxShadow: {
  			soft: '0 22px 48px -30px rgba(20,20,37,.35)',
  			glow: '0 0 60px -10px rgba(47,107,237,.5)',
  			'glow-sm': '0 8px 24px -8px rgba(47,107,237,.35)',
  			elevate: '0 1px 2px rgba(15,17,26,.04), 0 12px 28px -16px rgba(15,17,26,.14)'
  		},
  		backgroundImage: {
  			grid: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.06) 1px, transparent 0)',
  			'grid-light': 'radial-gradient(circle at 1px 1px, rgba(11,13,22,.07) 1px, transparent 0)',
  			'hair-diag': 'repeating-linear-gradient(135deg, rgba(11,13,22,.035) 0 1px, transparent 1px 14px)'
  		},
  		keyframes: {
  			spin_slow: {
  				to: {
  					transform: 'rotate(360deg)'
  				}
  			},
  			float: {
  				'0%,100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-8px)'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'spin-slow': 'spin_slow 40s linear infinite',
  			float: 'float 5s ease-in-out infinite',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [],
}
