
// ThemeManager Test Suite
window.runThemeTests = function(describe, it, expect) {
    describe('ThemeManager Unit Tests', () => {
        
        it('should initialize with default theme (system)', () => {
            localStorage.clear();
            const tm = new ThemeManager();
            expect(tm.currentTheme).toBe('system');
        });

        it('should load saved theme from localStorage', () => {
            localStorage.setItem('app_theme', 'dark');
            const tm = new ThemeManager();
            expect(tm.currentTheme).toBe('dark');
        });

        it('should apply dark theme correctly', () => {
            const tm = new ThemeManager();
            tm.setTheme('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            expect(localStorage.getItem('app_theme')).toBe('dark');
        });

        it('should apply light theme correctly', () => {
            const tm = new ThemeManager();
            tm.setTheme('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
            expect(localStorage.getItem('app_theme')).toBe('light');
        });
    });

    describe('ThemeManager Integration Tests', () => {
        it('should emit themeChanged event', () => {
            let eventFired = false;
            let eventTheme = '';
            
            const handler = (e) => {
                eventFired = true;
                eventTheme = e.detail.theme;
            };
            
            window.addEventListener('themeChanged', handler);
            
            const tm = new ThemeManager();
            tm.setTheme('light');
            
            expect(eventFired).toBeTruthy();
            expect(eventTheme).toBe('light');
            
            window.removeEventListener('themeChanged', handler);
        });
        
        it('should update UI radio buttons', () => {
            // Create dummy UI elements
            const containerDiv = document.createElement('div');
            containerDiv.innerHTML = `
                <input type="radio" name="theme" value="light">
                <input type="radio" name="theme" value="dark">
                <input type="radio" name="theme" value="system">
            `;
            document.body.appendChild(containerDiv);
            
            const tm = new ThemeManager();
            tm.setTheme('dark');
            
            // Wait for UI update (it's synchronous in our implementation but good practice)
            const darkRadio = document.querySelector('input[value="dark"]');
            expect(darkRadio.checked).toBeTruthy();
            
            document.body.removeChild(containerDiv);
        });
    });
};
