// =====================================================
// MURMR - Data Storage Layer
// LocalStorage-based persistence for sessions and expenses
// =====================================================

class MurmrStorage {
    constructor() {
        this.KEYS = {
            LAST_SESSION: 'murmr_last_session',
            SESSIONS: 'murmr_sessions',
            EXPENSES: 'murmr_expenses',
            STREAK_START: 'murmr_streak_start',
            SETTINGS: 'murmr_settings'
        };
        
        this.init();
    }
    
    init() {
        // Initialize streak if not exists
        if (!this.getStreakStart()) {
            this.setStreakStart(Date.now());
        }
        
        // Initialize arrays if not exist
        if (!this.getSessions()) {
            this.saveSessions([]);
        }
        if (!this.getExpenses()) {
            this.saveExpenses([]);
        }
    }
    
    // =====================================================
    // STREAK MANAGEMENT
    // =====================================================
    
    getStreakStart() {
        const val = localStorage.getItem(this.KEYS.STREAK_START);
        return val ? parseInt(val, 10) : null;
    }
    
    setStreakStart(timestamp) {
        localStorage.setItem(this.KEYS.STREAK_START, timestamp.toString());
    }
    
    getStreakDuration() {
        const start = this.getStreakStart();
        if (!start) return 0;
        return Date.now() - start;
    }
    
    resetStreak() {
        this.setStreakStart(Date.now());
    }
    
    // Calculate birds based on streak (10 per hour, starting at 1)
    // First time users get 5000 birds to see the full murmuration
    calculateBirds() {
        const sessions = this.getSessions();
        
        // If no sessions logged yet, show the full murmuration (7200 birds = a month)
        if (sessions.length === 0) {
            return 7200;
        }
        
        // After first session, birds based on streak duration
        const durationMs = this.getStreakDuration();
        const hours = durationMs / (1000 * 60 * 60);
        return Math.max(1, Math.floor(1 + hours * 10));
    }
    
    // Check if this is user's first time (no sessions logged)
    isFirstTime() {
        return this.getSessions().length === 0;
    }
    
    // Format duration for display
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            const remainingHours = hours % 24;
            const remainingMinutes = minutes % 60;
            return `${days}d ${remainingHours}h ${remainingMinutes}m`;
        } else {
            const remainingMinutes = minutes % 60;
            const remainingSeconds = seconds % 60;
            return `${hours}:${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        }
    }
    
    // =====================================================
    // SESSIONS (Smoking Events)
    // =====================================================
    
    getSessions() {
        try {
            const data = localStorage.getItem(this.KEYS.SESSIONS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }
    
    saveSessions(sessions) {
        localStorage.setItem(this.KEYS.SESSIONS, JSON.stringify(sessions));
    }
    
    logSession() {
        const sessions = this.getSessions();
        const now = Date.now();
        
        // Calculate streak duration before reset
        const streakDuration = this.getStreakDuration();
        
        sessions.push({
            id: now,
            timestamp: now,
            previousStreak: streakDuration
        });
        
        this.saveSessions(sessions);
        this.resetStreak();
        
        return sessions[sessions.length - 1];
    }
    
    // Log session at a specific timestamp (retroactive)
    logSessionAt(timestamp) {
        const sessions = this.getSessions();
        
        sessions.push({
            id: timestamp,
            timestamp: timestamp,
            previousStreak: 0,
            retroactive: true
        });
        
        // Sort sessions by timestamp
        sessions.sort((a, b) => a.timestamp - b.timestamp);
        
        this.saveSessions(sessions);
        return sessions.find(s => s.timestamp === timestamp);
    }
    
    getSessionsInRange(startTime, endTime) {
        const sessions = this.getSessions();
        return sessions.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
    }
    
    // =====================================================
    // EXPENSES
    // =====================================================
    
    getExpenses() {
        try {
            const data = localStorage.getItem(this.KEYS.EXPENSES);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }
    
    saveExpenses(expenses) {
        localStorage.setItem(this.KEYS.EXPENSES, JSON.stringify(expenses));
    }
    
    logExpense(amount, quantity = 1, note = '') {
        const expenses = this.getExpenses();
        const now = Date.now();
        
        expenses.push({
            id: now,
            timestamp: now,
            amount: parseFloat(amount) || 0,
            quantity: parseInt(quantity) || 1,
            note: note.trim()
        });
        
        this.saveExpenses(expenses);
        
        return expenses[expenses.length - 1];
    }
    
    // Log expense at a specific timestamp (retroactive)
    logExpenseAt(timestamp, amount, quantity = 1, note = '') {
        const expenses = this.getExpenses();
        
        expenses.push({
            id: timestamp,
            timestamp: timestamp,
            amount: parseFloat(amount) || 0,
            quantity: parseFloat(quantity) || 1,
            note: note.trim(),
            retroactive: true
        });
        
        // Sort expenses by timestamp
        expenses.sort((a, b) => a.timestamp - b.timestamp);
        
        this.saveExpenses(expenses);
        return expenses.find(e => e.timestamp === timestamp);
    }
    
    getExpensesInRange(startTime, endTime) {
        const expenses = this.getExpenses();
        return expenses.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
    }
    
    getTotalSpending(startTime = 0, endTime = Date.now()) {
        const expenses = this.getExpensesInRange(startTime, endTime);
        return expenses.reduce((sum, e) => sum + e.amount, 0);
    }
    
    // =====================================================
    // STATISTICS
    // =====================================================
    
    getStats(period = 'daily') {
        const now = Date.now();
        let startTime, previousStart, previousEnd;
        
        switch (period) {
            case 'hourly':
                startTime = now - (60 * 60 * 1000);
                previousStart = now - (2 * 60 * 60 * 1000);
                previousEnd = startTime;
                break;
            case 'daily':
                startTime = now - (24 * 60 * 60 * 1000);
                previousStart = now - (2 * 24 * 60 * 60 * 1000);
                previousEnd = startTime;
                break;
            case 'weekly':
                startTime = now - (7 * 24 * 60 * 60 * 1000);
                previousStart = now - (14 * 24 * 60 * 60 * 1000);
                previousEnd = startTime;
                break;
            case 'monthly':
                startTime = now - (30 * 24 * 60 * 60 * 1000);
                previousStart = now - (60 * 24 * 60 * 60 * 1000);
                previousEnd = startTime;
                break;
            case 'yearly':
                startTime = now - (365 * 24 * 60 * 60 * 1000);
                previousStart = now - (730 * 24 * 60 * 60 * 1000);
                previousEnd = startTime;
                break;
            default:
                startTime = now - (24 * 60 * 60 * 1000);
                previousStart = now - (2 * 24 * 60 * 60 * 1000);
                previousEnd = startTime;
        }
        
        // Current period stats
        const currentSessions = this.getSessionsInRange(startTime, now);
        const currentExpenses = this.getExpensesInRange(startTime, now);
        const currentSpending = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Previous period stats
        const previousSessions = this.getSessionsInRange(previousStart, previousEnd);
        const previousExpenses = this.getExpensesInRange(previousStart, previousEnd);
        const previousSpending = previousExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Calculate changes
        const sessionChange = currentSessions.length - previousSessions.length;
        const spendingChange = currentSpending - previousSpending;
        
        // Calculate longest streak
        const allSessions = this.getSessions().sort((a, b) => a.timestamp - b.timestamp);
        let longestStreak = this.getStreakDuration(); // Current streak might be longest
        
        for (let i = 0; i < allSessions.length; i++) {
            if (allSessions[i].previousStreak && allSessions[i].previousStreak > longestStreak) {
                longestStreak = allSessions[i].previousStreak;
            }
        }
        
        // Calculate average time between sessions
        let avgTimeBetween = null;
        if (allSessions.length >= 2) {
            let totalGaps = 0;
            for (let i = 1; i < allSessions.length; i++) {
                totalGaps += allSessions[i].timestamp - allSessions[i - 1].timestamp;
            }
            avgTimeBetween = totalGaps / (allSessions.length - 1);
        }
        
        return {
            period,
            sessions: currentSessions.length,
            sessionChange,
            spending: currentSpending,
            spendingChange,
            longestStreak,
            avgTimeBetween,
            chartData: this.getChartData(period, startTime, now)
        };
    }
    
    getChartData(period, startTime, endTime) {
        const sessions = this.getSessionsInRange(startTime, endTime);
        const expenses = this.getExpensesInRange(startTime, endTime);
        
        let bucketSize, bucketCount, labelFormat;
        
        switch (period) {
            case 'hourly':
                bucketSize = 5 * 60 * 1000; // 5 minute buckets
                bucketCount = 12;
                labelFormat = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                break;
            case 'daily':
                bucketSize = 2 * 60 * 60 * 1000; // 2 hour buckets
                bucketCount = 12;
                labelFormat = (d) => d.toLocaleTimeString([], { hour: '2-digit' });
                break;
            case 'weekly':
                bucketSize = 24 * 60 * 60 * 1000; // 1 day buckets
                bucketCount = 7;
                labelFormat = (d) => d.toLocaleDateString([], { weekday: 'short' });
                break;
            case 'monthly':
                bucketSize = 24 * 60 * 60 * 1000; // 1 day buckets
                bucketCount = 30;
                labelFormat = (d) => d.getDate().toString();
                break;
            case 'yearly':
                bucketSize = 30 * 24 * 60 * 60 * 1000; // ~1 month buckets
                bucketCount = 12;
                labelFormat = (d) => d.toLocaleDateString([], { month: 'short' });
                break;
            default:
                bucketSize = 2 * 60 * 60 * 1000;
                bucketCount = 12;
                labelFormat = (d) => d.toLocaleTimeString([], { hour: '2-digit' });
        }
        
        const labels = [];
        const sessionCounts = [];
        const spendingAmounts = [];
        
        for (let i = 0; i < bucketCount; i++) {
            const bucketStart = startTime + (i * bucketSize);
            const bucketEnd = bucketStart + bucketSize;
            
            labels.push(labelFormat(new Date(bucketStart)));
            
            const bucketSessions = sessions.filter(s => 
                s.timestamp >= bucketStart && s.timestamp < bucketEnd
            );
            sessionCounts.push(bucketSessions.length);
            
            const bucketExpenses = expenses.filter(e => 
                e.timestamp >= bucketStart && e.timestamp < bucketEnd
            );
            spendingAmounts.push(bucketExpenses.reduce((sum, e) => sum + e.amount, 0));
        }
        
        return { labels, sessionCounts, spendingAmounts };
    }
    
    // =====================================================
    // DATA MANAGEMENT
    // =====================================================
    
    exportData() {
        return JSON.stringify({
            sessions: this.getSessions(),
            expenses: this.getExpenses(),
            streakStart: this.getStreakStart(),
            exportedAt: Date.now()
        });
    }
    
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.sessions) this.saveSessions(data.sessions);
            if (data.expenses) this.saveExpenses(data.expenses);
            if (data.streakStart) this.setStreakStart(data.streakStart);
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }
    
    clearAllData() {
        localStorage.removeItem(this.KEYS.SESSIONS);
        localStorage.removeItem(this.KEYS.EXPENSES);
        localStorage.removeItem(this.KEYS.STREAK_START);
        this.init();
    }
}

// Export for use in app
window.MurmrStorage = MurmrStorage;
