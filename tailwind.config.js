/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
				tb: {
					'bg': 'var(--tb-bg)',
					'surf': 'var(--tb-surf)',
					'surf2': 'var(--tb-surf2)',
					'text': 'var(--tb-text)',
					'muted': 'var(--tb-muted)',
					'faint': 'var(--tb-faint)',
					'line': 'var(--tb-line)',
					'wall': 'var(--tb-wall)',
					'gold': 'var(--tb-gold)',
					'gold-ink': 'var(--tb-gold-ink)',
					'gold-soft': 'var(--tb-gold-soft)',
					'ok': 'var(--tb-ok)',
					'ok-soft': 'var(--tb-ok-soft)',
					'late': 'var(--tb-late)',
					'late-soft': 'var(--tb-late-soft)',
					'bad': 'var(--tb-bad)',
					'bad-soft': 'var(--tb-bad-soft)',
					'sub': 'var(--tb-sub)',
					'sub-soft': 'var(--tb-sub-soft)',
					'guest': 'var(--tb-guest)',
					'guest-soft': 'var(--tb-guest-soft)',
				},
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: 0 },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: 0 }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
