const THEMES = {
            midnight: {
                '--bg-body': '#0f1115', '--bg-card': '#181b21',
                '--glass-bg': 'rgba(24, 27, 33, 0.75)', '--glass-border': 'rgba(255, 255, 255, 0.08)',
                '--bg-input': '#090a0c', '--accent': '#c084fc', '--accent-dim': 'rgba(192, 132, 252, 0.1)',
                '--accent-hover': '#a855f7', '--text-main': '#e4e4e7', '--text-muted': '#a1a1aa',
                '--border': '#27272a', '--success': '#10b981', '--error': '#ef4444'
            },
            paper: {
                '--bg-body': '#f3f4f6', '--bg-card': '#ffffff',
                '--glass-bg': 'rgba(255, 255, 255, 0.9)', '--glass-border': 'rgba(0, 0, 0, 0.12)',
                '--bg-input': '#ffffff', '--accent': '#4f46e5', '--accent-dim': 'rgba(79, 70, 229, 0.1)',
                '--accent-hover': '#4338ca', '--text-main': '#1f2937', '--text-muted': '#6b7280',
                '--border': '#d1d5db', '--success': '#059669', '--error': '#dc2626'
            },
            oled: {
                '--bg-body': '#000000', '--bg-card': '#000000',
                '--glass-bg': 'rgba(0, 0, 0, 0.85)', '--glass-border': 'rgba(255, 255, 255, 0.2)',
                '--bg-input': '#000000', '--accent': '#e879f9', '--accent-dim': 'rgba(232, 121, 249, 0.1)',
                '--accent-hover': '#d946ef', '--text-main': '#ffffff', '--text-muted': '#a3a3a3',
                '--border': '#333333', '--success': '#22c55e', '--error': '#ef4444'
            },
            terminal: {
                '--bg-body': '#050505', '--bg-card': '#0a0a0a',
                '--glass-bg': 'rgba(10, 10, 10, 0.9)', '--glass-border': 'rgba(0, 255, 65, 0.3)',
                '--bg-input': '#000000', '--accent': '#00ff41', '--accent-dim': 'rgba(0, 255, 65, 0.1)',
                '--accent-hover': '#008f11', '--text-main': '#00ff41', '--text-muted': '#008f11',
                '--border': '#003b00', '--success': '#00ff41', '--error': '#f87171'
            }
        };

        (function() {
            try {
                const saved = localStorage.getItem('nomi_theme') || 'midnight';
                const t = THEMES[saved] || THEMES['midnight'];
                for (const [key, value] of Object.entries(t)) {
                    document.documentElement.style.setProperty(key, value);
                }
            } catch(e) {}
        })();