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
        document.getElementById('view-stats-btn').addEventListener('click', () => this.showStats());
        document.getElementById('toggle-theme-btn').addEventListener('click', () => this.toggleTheme());
        
        // Modal buttons
        document.getElementById('cancel-session').addEventListener('click', () => this.hideModals());
        document.getElementById('confirm-session').addEventListener('click', () => this.logSession());
        document.getElementById('cancel-expense').addEventListener('click', () => this.hideModals());
        document.getElementById('save-expense').addEventListener('click', () => this.saveExpense());
        
        // Retroactive entry buttons
        document.getElementById('retro-session-btn').addEventListener('click', () => this.showRetroSessionModal());
        document.getElementById('retro-expense-btn').addEventListener('click', () => this.showRetroExpenseModal());
        document.getElementById('cancel-retro-session').addEventListener('click', () => this.hideModals());
        document.getElementById('save-retro-session').addEventListener('click', () => this.saveRetroSession());
        document.getElementById('cancel-retro-expense').addEventListener('click', () => this.hideModals());
        document.getElementById('save-retro-expense').addEventListener('click', () => this.saveRetroExpense());
        
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
        document.getElementById('retro-session-modal').classList.remove('active');
        document.getElementById('retro-expense-modal').classList.remove('active');
        
        // Clear inputs
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-quantity').value = '1';
        document.getElementById('expense-note').value = '';
        document.getElementById('retro-session-date').value = '';
        document.getElementById('retro-session-time').value = '';
        document.getElementById('retro-expense-date').value = '';
        document.getElementById('retro-expense-time').value = '';
        document.getElementById('retro-expense-amount').value = '';
        document.getElementById('retro-expense-quantity').value = '1';
        document.getElementById('retro-expense-note').value = '';
    }
    
    showRetroSessionModal() {
        this.modalOverlay.classList.add('visible');
        const modal = document.getElementById('retro-session-modal');
        modal.classList.add('active');
        
        // Set default to now
        const now = new Date();
        document.getElementById('retro-session-date').value = now.toISOString().split('T')[0];
        document.getElementById('retro-session-time').value = now.toTimeString().slice(0, 5);
    }
    
    showRetroExpenseModal() {
        this.modalOverlay.classList.add('visible');
        const modal = document.getElementById('retro-expense-modal');
        modal.classList.add('active');
        
        // Set default to now
        const now = new Date();
        document.getElementById('retro-expense-date').value = now.toISOString().split('T')[0];
        document.getElementById('retro-expense-time').value = now.toTimeString().slice(0, 5);
        
        setTimeout(() => {
            document.getElementById('retro-expense-amount').focus();
        }, 100);
    }
    
    saveRetroSession() {
        const dateStr = document.getElementById('retro-session-date').value;
        const timeStr = document.getElementById('retro-session-time').value;
        
        if (!dateStr || !timeStr) {
            alert('Please enter both date and time');
            return;
        }
        
        const timestamp = new Date(`${dateStr}T${timeStr}`).getTime();
        
        // Add session at specific timestamp
        this.storage.logSessionAt(timestamp);
        this.hideModals();
        this.statsView.update();
        this.updateDisplay();
    }
    
    saveRetroExpense() {
        const dateStr = document.getElementById('retro-expense-date').value;
        const timeStr = document.getElementById('retro-expense-time').value;
        const amount = parseFloat(document.getElementById('retro-expense-amount').value);
        const quantity = parseFloat(document.getElementById('retro-expense-quantity').value) || 1;
        const note = document.getElementById('retro-expense-note').value.trim();
        
        if (!dateStr || !timeStr) {
            alert('Please enter both date and time');
            return;
        }
        
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        const timestamp = new Date(`${dateStr}T${timeStr}`).getTime();
        
        // Add expense at specific timestamp
        this.storage.logExpenseAt(timestamp, amount, quantity, note);
        this.hideModals();
        this.statsView.update();
        this.updateDisplay();
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
        const iconEl = this.themeBtn.querySelector('.icon');
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
            iconEl.className = 'icon pixel-sun';
            this.themeBtn.querySelector('.text').textContent = 'Light Mode';
            // Update murmuration background and bird color
            if (this.murmuration) {
                this.murmuration.setDarkMode(true);
            }
        } else {
            document.body.classList.remove('dark-mode');
            iconEl.className = 'icon pixel-moon';
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

// Service worker for offline support with auto-update
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then((registration) => {
            // Check for updates immediately
            registration.update();
            
            // When a new service worker is installed, reload to activate it
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                        // New version available, reload to get it
                        window.location.reload();
                    }
                });
            });
        }).catch(() => {
            // Service worker registration failed - app will still work online
        });
    });
    
    // Also check for updates when app becomes visible (e.g., switching back to it)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.update();
            });
        }
    });
}
