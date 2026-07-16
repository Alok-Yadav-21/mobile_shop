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
  			brand: {
  				'50': '#EAF1FE',
  				'100': '#D3E1FC',
  				'600': '#2F6BED',
  				'700': '#1E55D6',
  				DEFAULT: '#2F6BED'
  			},
  			violet: {
  				'50': '#F1EBFE',
  				'600': '#7C3AED',
  				DEFAULT: '#7C3AED'
  			},
  			electric: {
  				'500': '#0EA5E9',
  				DEFAULT: '#0EA5E9'
  			},
  			signal: {
  				'500': '#22D3B8',
  				DEFAULT: '#22D3B8'
  			},
  			ink: {
  				'800': '#141726',
  				'900': '#0B0D16',
  				DEFAULT: '#12141F'
  			},
  			graphite: {
  				'50': '#F6F7F9',
  				'100': '#EEF0F3',
  				'200': '#E2E5EA',
  				'400': '#8A90A0',
  				'600': '#565C6D',
  				'800': '#20232E',
  				DEFAULT: '#565C6D'
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
