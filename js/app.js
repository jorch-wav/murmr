// =====================================================
// MURMR - Main Application
// Menu toggle, modals, and state management
// =====================================================

class MurmrApp {
    constructor() {
        // Core components
        this.storage = new MurmrStorage();
        this.murmuration = new Murmuration('murmuration-canvas');
        this.statsView = new StatsView(this.storage);
        
        // UI state
        this.loggingVisible = false;
        this.statsVisible = false;
        
        // Elements
        this.loggingOverlay = document.getElementById('logging-overlay');
        this.statsScreen = document.getElementById('stats-screen');
        this.modalOverlay = document.getElementById('modal-overlay');
        this.expenseModal = document.getElementById('expense-modal');
        this.confirmModal = document.getElementById('confirm-modal');
        this.menuToggle = document.getElementById('menu-toggle');
        this.themeBtn = document.getElementById('toggle-theme-btn');
        
        // Initialize theme from storage
        this.isDarkMode = localStorage.getItem('murmr_dark_mode') === 'true';
        // Apply theme after a short delay to ensure murmuration is ready
        setTimeout(() => this.applyTheme(), 100);
        
        // Initialize
        this.bindEvents();
        this.startUpdateLoop();
        this.updateDisplay();
    }
    
    // =====================================================
    // EVENT BINDING
    // =====================================================
    
    bindEvents() {
        // Menu toggle button
        this.menuToggle.addEventListener('click', () => this.toggleMenu());
        
        // Logging buttons
        document.getElementById('log-session-btn').addEventListener('click', () => this.showConfirmModal());
        document.getElementById('log-expense-btn').addEventListener('click', () => this.showExpenseModal());
        document.getElementById('toggle-theme-btn').addEventListener('click', () => this.toggleTheme());
        
        // Modal buttons
        document.getElementById('cancel-session').addEventListener('click', () => this.hideModals());
        document.getElementById('confirm-session').addEventListener('click', () => this.logSession());
        document.getElementById('cancel-expense').addEventListener('click', () => this.hideModals());
        document.getElementById('save-expense').addEventListener('click', () => this.saveExpense());
        
        // Close stats
        document.getElementById('close-stats').addEventListener('click', () => this.hideStats());
        
        // Modal overlay click to close
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.hideModals();
            }
        });
        
        // Keyboard support for expense input
        document.getElementById('expense-amount').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveExpense();
            }
        });
        
        // Handle back swipe on stats screen
        this.statsScreen.addEventListener('touchstart', (e) => {
            this.statsSwipeStartX = e.touches[0].clientX;
        }, { passive: true });
        
        this.statsScreen.addEventListener('touchmove', (e) => {
            if (this.statsSwipeStartX !== undefined) {
                const deltaX = e.touches[0].clientX - this.statsSwipeStartX;
                if (deltaX > 50) {
                    // Swiping right on stats - close it
                    this.hideStats();
                    this.statsSwipeStartX = undefined;
                }
            }
        }, { passive: true });
    }
    
    // =====================================================
    // UI STATE MANAGEMENT
    // =====================================================
    
    toggleMenu() {
        if (this.loggingVisible) {
            this.hideLogging();
        } else {
            this.showLogging();
        }
    }
    
    showLogging() {
        this.loggingVisible = true;
        this.loggingOverlay.classList.add('visible');
        this.menuToggle.classList.add('open');
    }
    
    hideLogging() {
        this.loggingVisible = false;
        this.loggingOverlay.classList.remove('visible');
        this.menuToggle.classList.remove('open');
    }
    
    showStats() {
        this.statsVisible = true;
        this.statsScreen.classList.add('visible');
        // Wait for CSS transition and layout before rendering chart
        setTimeout(() => {
            this.statsView.update();
        }, 50);
    }
    
    hideStats() {
        this.statsVisible = false;
        this.statsScreen.classList.remove('visible');
        this.hideLogging();
    }
    
    showConfirmModal() {
        this.hideLogging();
        this.modalOverlay.classList.add('visible');
        this.confirmModal.classList.add('active');
        this.expenseModal.classList.remove('active');
    }
    
    showExpenseModal() {
        this.hideLogging();
        this.modalOverlay.classList.add('visible');
        this.expenseModal.classList.add('active');
        this.confirmModal.classList.remove('active');
        
        // Focus input
        setTimeout(() => {
            document.getElementById('expense-amount').focus();
        }, 100);
    }
    
    hideModals() {
        this.modalOverlay.classList.remove('visible');
        this.confirmModal.classList.remove('active');
        this.expenseModal.classList.remove('active');
        
        // Clear inputs
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-quantity').value = '1';
        document.getElementById('expense-note').value = '';
    }
    
    // =====================================================
    // ACTIONS
    // =====================================================
    
    logSession() {
        this.hideModals();
        
        // Trigger death animation, then reset
        this.murmuration.triggerDeath(() => {
            this.storage.logSession();
            this.murmuration.reset();
            this.updateDisplay();
        });
    }
    
    saveExpense() {
        const amount = document.getElementById('expense-amount').value;
        const quantity = document.getElementById('expense-quantity').value || 1;
        const note = document.getElementById('expense-note').value;
        
        if (!amount || parseFloat(amount) <= 0) {
            document.getElementById('expense-amount').focus();
            return;
        }
        
        this.storage.logExpense(amount, quantity, note);
        this.hideModals();
        
        // Brief visual feedback
        document.getElementById('log-expense-btn').style.transform = 'scale(0.95)';
        setTimeout(() => {
            document.getElementById('log-expense-btn').style.transform = '';
        }, 100);
    }
    
    // =====================================================
    // THEME TOGGLE
    // =====================================================
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('murmr_dark_mode', this.isDarkMode);
        this.applyTheme();
    }
    
    applyTheme() {
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
            this.themeBtn.querySelector('.icon').textContent = '🌕';
            this.themeBtn.querySelector('.text').textContent = 'Light Mode';
            // Update murmuration background and bird color
            if (this.murmuration) {
                this.murmuration.setDarkMode(true);
            }
        } else {
            document.body.classList.remove('dark-mode');
            this.themeBtn.querySelector('.icon').textContent = '🌑';
            this.themeBtn.querySelector('.text').textContent = 'Dark Mode';
            // Update murmuration background and bird color
            if (this.murmuration) {
                this.murmuration.setDarkMode(false);
            }
        }
    }
    
    // =====================================================
    // DISPLAY UPDATES
    // =====================================================
    
    updateDisplay() {
        // Update bird count
        const targetBirds = this.storage.calculateBirds();
        this.murmuration.setBoidCount(targetBirds);
        // Display actual rendered bird count (GPU uses WIDTH*WIDTH grid)
        const actualBirds = this.murmuration.getBoidCount();
        document.getElementById('bird-number').textContent = actualBirds;
        
        // Update time display
        const duration = this.storage.getStreakDuration();
        document.getElementById('elapsed-time').textContent = this.storage.formatDuration(duration);
    }
    
    startUpdateLoop() {
        // Update every second
        setInterval(() => {
            this.updateDisplay();
        }, 1000);
    }
}

// =====================================================
// INITIALIZATION
// =====================================================

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    // Prevent zoom on double-tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
    
    // Prevent pinch zoom
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    
    // Initialize app
    window.murmrApp = new MurmrApp();
});

// Handle visibility changes (pause/resume when tab hidden)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.murmrApp) {
        window.murmrApp.updateDisplay();
    }
});

// Service worker for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {
            // Service worker registration failed - app will still work online
        });
    });
}
