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
  			// Indigo primary with a teal signal on deep slate. Token NAMES are unchanged from the
  			// previous blue palette on purpose — every component already references brand/signal/
  			// ink/graphite, so re-pointing the values re-skins the whole platform without touching
  			// a single component file.
  			brand: {
  				'50': '#EEF2FF',
  				'100': '#E0E7FF',
  				'400': '#818CF8',
  				'600': '#4F46E5',
  				'700': '#4338CA',
  				DEFAULT: '#4F46E5'
  			},
  			// Secondary in the gradient pair. Kept close to the primary so the sweep reads as one
  			// colour deepening rather than two colours fighting.
  			violet: {
  				'50': '#F5F3FF',
  				'600': '#7C5CFF',
  				DEFAULT: '#7C5CFF'
  			},
  			electric: {
  				'500': '#06B6D4',
  				DEFAULT: '#06B6D4'
  			},
  			// The accent that means "live" — status dots, success, active branches.
  			signal: {
  				'50': '#ECFDF7',
  				'500': '#14B8A6',
  				DEFAULT: '#14B8A6'
  			},
  			// Deep slate rather than near-black: it holds the indigo without turning muddy, and
  			// keeps large dark panels feeling like a surface instead of a hole.
  			ink: {
  				'800': '#152036',
  				'900': '#0B1220',
  				DEFAULT: '#0F172A'
  			},
  			graphite: {
  				'50': '#F8FAFC',
  				'100': '#F1F5F9',
  				'200': '#E2E8F0',
  				'400': '#94A3B8',
  				'600': '#475569',
  				'700': '#334155',
  				'800': '#1E293B',
  				DEFAULT: '#475569'
  			},
  			paper: '#FBFBFA',
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
