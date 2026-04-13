class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'app_theme';
        this.systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.currentTheme = localStorage.getItem(this.STORAGE_KEY) || 'system';
        
        // Apply theme immediately to avoid flash
        this.applyTheme();
        
        // Bind methods
        this.handleSystemChange = this.handleSystemChange.bind(this);
        this.handleUIChange = this.handleUIChange.bind(this);
        
        this.init();
    }

    init() {
        // Listen for system changes
        this.systemMediaQuery.addEventListener('change', this.handleSystemChange);
        
        // Listen for UI changes (radio buttons)
        document.addEventListener('DOMContentLoaded', () => {
            this.setupUI();
            this.initSliders();
        });

        // Listen for language changes to update sliders
        window.addEventListener('languageChanged', () => {
            // Small delay to ensure DOM is updated
            setTimeout(() => this.updateAllSliders(), 10);
        });
    }

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.applyTheme();
        this.updateUI(); // Sync UI if changed programmatically
    }

    applyTheme() {
        let mode = this.currentTheme;
        
        if (this.currentTheme === 'system') {
            mode = this.systemMediaQuery.matches ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', mode);
        
        // Dispatch event for components that might need JS-level theme info
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: mode } }));
    }

    handleSystemChange(e) {
        if (this.currentTheme === 'system') {
            this.applyTheme();
        }
    }

    setupUI() {
        const radios = document.querySelectorAll('input[name="theme"]');
        radios.forEach(radio => {
            radio.addEventListener('change', this.handleUIChange);
        });
        this.updateUI();
    }
    
    handleUIChange(e) {
        if (e.target.checked) {
            this.setTheme(e.target.value);
        }
    }

    updateUI() {
        const radios = document.querySelectorAll('input[name="theme"]');
        radios.forEach(radio => {
            if (radio.value === this.currentTheme) {
                radio.checked = true;
            }
        });
        this.updateAllSliders();
    }

    // Slider Logic for Segmented Controls
    initSliders() {
        const selectors = document.querySelectorAll('.theme-selector');
        selectors.forEach(selector => {
            const inputs = selector.querySelectorAll('input[type="radio"]');
            inputs.forEach(input => {
                input.addEventListener('change', () => this.updateSlider(selector));
            });
            // Initial update - disable animation for the first render
            requestAnimationFrame(() => this.updateSlider(selector, false));
        });
        
        // Update on resize
        window.addEventListener('resize', () => this.updateAllSliders(false));
    }

    updateAllSliders(animate = true) {
        const selectors = document.querySelectorAll('.theme-selector');
        selectors.forEach(selector => {
            this.updateSlider(selector, animate);
        });
    }

    updateSlider(selector, animate = true) {
        const slider = selector.querySelector('.theme-slider');
        if (!slider) return;
        
        const checked = selector.querySelector('input[type="radio"]:checked');
        if (checked) {
            const label = checked.closest('.theme-option');
            // Check if element is visible/has layout
            if (label && label.offsetWidth > 0) {
                if (!animate) {
                    slider.classList.add('no-transition');
                }
                
                slider.style.width = `${label.offsetWidth}px`;
                slider.style.transform = `translateX(${label.offsetLeft}px)`;
                slider.style.opacity = '1'; // Ensure visible

                if (!animate) {
                    // Force reflow
                    void slider.offsetWidth;
                    slider.classList.remove('no-transition');
                }
            } else {
                // If not visible (e.g. inside hidden modal), wait for it
                // Or set opacity 0 to hide initial jump
                // slider.style.opacity = '0'; 
            }
        }
    }
}

// Initialize on load
const themeManager = new ThemeManager();
window.themeManager = themeManager;
