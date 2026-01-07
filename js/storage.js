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
    // First time users get 7200 birds to see the full murmuration
    calculateBirds() {
        const sessions = this.getSessions();
        
        // If no sessions logged yet, show the full murmuration (7200 birds = a month)
        if (sessions.length === 0) {
            return 7200;
        }
        
        // After first session, birds based on streak duration
        // 10 birds per hour = 240 per day
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
    // This resets the streak if the retroactive session is more recent than current streak start
    logSessionAt(timestamp) {
        const sessions = this.getSessions();
        const currentStreakStart = this.getStreakStart();
        
        // Calculate previous streak duration at time of this session
        let previousStreak = 0;
        if (currentStreakStart && timestamp > currentStreakStart) {
            // This session breaks the current streak
            previousStreak = timestamp - currentStreakStart;
        }
        
        sessions.push({
            id: timestamp,
            timestamp: timestamp,
            previousStreak: previousStreak,
            retroactive: true
        });
        
        // Sort sessions by timestamp
        sessions.sort((a, b) => a.timestamp - b.timestamp);
        
        this.saveSessions(sessions);
        
        // Update streak start to most recent session
        this.recalculateStreakStart();
        
        return sessions.find(s => s.timestamp === timestamp);
    }
    
    // Recalculate streak start based on all sessions
    recalculateStreakStart() {
        const sessions = this.getSessions();
        if (sessions.length === 0) return;
        
        // Find the maximum timestamp (most recent session)
        let maxTimestamp = 0;
        for (const session of sessions) {
            if (session.timestamp > maxTimestamp) {
                maxTimestamp = session.timestamp;
            }
        }
        
        if (maxTimestamp > 0) {
            this.setStreakStart(maxTimestamp);
        }
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
    
    // Delete session by index
    deleteSession(index) {
        const sessions = this.getSessions();
        if (index >= 0 && index < sessions.length) {
            sessions.splice(index, 1);
            this.saveSessions(sessions);
            
            // Recalculate streak from remaining sessions
            this.recalculateStreakStart();
        }
    }
    
    // Update session at index
    updateSession(index, timestamp) {
        const sessions = this.getSessions();
        if (index >= 0 && index < sessions.length) {
            sessions[index].timestamp = timestamp;
            sessions.sort((a, b) => a.timestamp - b.timestamp);
            this.saveSessions(sessions);
            
            // Recalculate streak
            this.recalculateStreakStart();
        }
    }
    
    // Delete expense by index
    deleteExpense(index) {
        const expenses = this.getExpenses();
        if (index >= 0 && index < expenses.length) {
            expenses.splice(index, 1);
            this.saveExpenses(expenses);
        }
    }
    
    // Update expense at index
    updateExpense(index, timestamp, amount, quantity, note) {
        const expenses = this.getExpenses();
        if (index >= 0 && index < expenses.length) {
            expenses[index].timestamp = timestamp;
            expenses[index].amount = parseFloat(amount) || 0;
            expenses[index].quantity = parseFloat(quantity) || 1;
            expenses[index].note = note.trim();
            expenses.sort((a, b) => a.timestamp - b.timestamp);
            this.saveExpenses(expenses);
        }
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
    
    // Get start of day (midnight)
    getStartOfDay(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }
    
    // Get start of week (Monday midnight)
    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }
    
    // Get start of month (1st midnight)
    getStartOfMonth(date) {
        const d = new Date(date);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }
    
    // Get start of year (Jan 1 midnight)
    getStartOfYear(date) {
        const d = new Date(date);
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }
    
    // Get period boundaries based on type and offset (0 = current, -1 = previous, etc.)
    getPeriodBoundaries(period, offset = 0) {
        const now = new Date();
        let startTime, endTime;
        
        switch (period) {
            case 'daily': {
                const today = new Date(this.getStartOfDay(now));
                today.setDate(today.getDate() + offset);
                startTime = today.getTime();
                const nextDay = new Date(today);
                nextDay.setDate(nextDay.getDate() + 1);
                endTime = offset === 0 ? Date.now() : nextDay.getTime();
                break;
            }
            case 'weekly': {
                const weekStart = new Date(this.getStartOfWeek(now));
                weekStart.setDate(weekStart.getDate() + (offset * 7));
                startTime = weekStart.getTime();
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);
                endTime = offset === 0 ? Date.now() : weekEnd.getTime();
                break;
            }
            case 'monthly': {
                const monthStart = new Date(this.getStartOfMonth(now));
                monthStart.setMonth(monthStart.getMonth() + offset);
                startTime = monthStart.getTime();
                const monthEnd = new Date(monthStart);
                monthEnd.setMonth(monthEnd.getMonth() + 1);
                endTime = offset === 0 ? Date.now() : monthEnd.getTime();
                break;
            }
            case 'yearly': {
                const yearStart = new Date(this.getStartOfYear(now));
                yearStart.setFullYear(yearStart.getFullYear() + offset);
                startTime = yearStart.getTime();
                const yearEnd = new Date(yearStart);
                yearEnd.setFullYear(yearEnd.getFullYear() + 1);
                endTime = offset === 0 ? Date.now() : yearEnd.getTime();
                break;
            }
            default:
                return this.getPeriodBoundaries('daily', offset);
        }
        
        return { startTime, endTime };
    }
    
    // Format period label for display
    getPeriodLabel(period, offset) {
        const { startTime } = this.getPeriodBoundaries(period, offset);
        const date = new Date(startTime);
        
        if (offset === 0) {
            switch (period) {
                case 'daily': return 'Today';
                case 'weekly': return 'This Week';
                case 'monthly': return 'This Month';
                case 'yearly': return 'This Year';
            }
        }
        
        switch (period) {
            case 'daily':
                if (offset === -1) return 'Yesterday';
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            case 'weekly':
                if (offset === -1) return 'Last Week';
                const weekEnd = new Date(startTime);
                weekEnd.setDate(weekEnd.getDate() + 6);
                return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            case 'monthly':
                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            case 'yearly':
                return date.getFullYear().toString();
        }
        return '';
    }
    
    getStats(period = 'daily', offset = 0) {
        const { startTime, endTime } = this.getPeriodBoundaries(period, offset);
        const { startTime: prevStart, endTime: prevEnd } = this.getPeriodBoundaries(period, offset - 1);
        
        // Current period stats
        const currentSessions = this.getSessionsInRange(startTime, endTime);
        const currentExpenses = this.getExpensesInRange(startTime, endTime);
        const currentSpending = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Previous period stats
        const previousSessions = this.getSessionsInRange(prevStart, prevEnd);
        const previousExpenses = this.getExpensesInRange(prevStart, prevEnd);
        const previousSpending = previousExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Calculate changes
        const sessionChange = currentSessions.length - previousSessions.length;
        const spendingChange = currentSpending - previousSpending;
        
        // ========================================
        // Spending card: monthly for day/week/month, yearly for year
        // ========================================
        let spendingCardAmount, spendingCardChange, spendingCardLabel;
        
        if (period === 'yearly') {
            // For year view: show this year's spending vs last year
            const yearStart = this.getStartOfYear(new Date());
            yearStart.setFullYear(yearStart.getFullYear() + offset);
            const yearEnd = new Date(yearStart);
            yearEnd.setFullYear(yearEnd.getFullYear() + 1);
            
            const prevYearStart = new Date(yearStart);
            prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
            const prevYearEnd = new Date(yearStart);
            
            const thisYearExpenses = this.getExpensesInRange(yearStart.getTime(), yearEnd.getTime());
            const lastYearExpenses = this.getExpensesInRange(prevYearStart.getTime(), prevYearEnd.getTime());
            
            spendingCardAmount = thisYearExpenses.reduce((sum, e) => sum + e.amount, 0);
            const lastYearAmount = lastYearExpenses.reduce((sum, e) => sum + e.amount, 0);
            spendingCardChange = spendingCardAmount - lastYearAmount;
            spendingCardLabel = offset === 0 ? 'Spent This Year' : `Spent ${yearStart.getFullYear()}`;
        } else {
            // For day/week/month view: show this month's spending vs last month
            const monthStart = this.getStartOfMonth(new Date());
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            
            const prevMonthStart = new Date(monthStart);
            prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
            const prevMonthEnd = new Date(monthStart);
            
            const thisMonthExpenses = this.getExpensesInRange(monthStart.getTime(), monthEnd.getTime());
            const lastMonthExpenses = this.getExpensesInRange(prevMonthStart.getTime(), prevMonthEnd.getTime());
            
            spendingCardAmount = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
            const lastMonthAmount = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
            spendingCardChange = spendingCardAmount - lastMonthAmount;
            spendingCardLabel = 'Spent This Month';
        }
        
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
            offset,
            periodLabel: this.getPeriodLabel(period, offset),
            sessions: currentSessions.length,
            sessionChange,
            spending: currentSpending,
            spendingChange,
            // New spending card data
            spendingCardAmount,
            spendingCardChange,
            spendingCardLabel,
            longestStreak,
            avgTimeBetween,
            chartData: this.getChartData(period, startTime, endTime)
        };
    }
    
    getChartData(period, startTime, endTime) {
        const sessions = this.getSessionsInRange(startTime, endTime);
        const expenses = this.getExpensesInRange(startTime, endTime);
        
        let buckets = [];
        
        switch (period) {
            case 'daily': {
                // Hourly buckets for the day
                for (let h = 0; h < 24; h++) {
                    const bucketStart = startTime + (h * 60 * 60 * 1000);
                    const bucketEnd = bucketStart + (60 * 60 * 1000);
                    const label = new Date(bucketStart).toLocaleTimeString([], { hour: 'numeric' });
                    buckets.push({ bucketStart, bucketEnd, label });
                }
                break;
            }
            case 'weekly': {
                // Daily buckets for the week
                for (let d = 0; d < 7; d++) {
                    const bucketStart = startTime + (d * 24 * 60 * 60 * 1000);
                    const bucketEnd = bucketStart + (24 * 60 * 60 * 1000);
                    const label = new Date(bucketStart).toLocaleDateString([], { weekday: 'short' });
                    buckets.push({ bucketStart, bucketEnd, label });
                }
                break;
            }
            case 'monthly': {
                // Daily buckets for the month
                const monthStart = new Date(startTime);
                const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
                for (let d = 0; d < daysInMonth; d++) {
                    const bucketStart = startTime + (d * 24 * 60 * 60 * 1000);
                    const bucketEnd = bucketStart + (24 * 60 * 60 * 1000);
                    const label = (d + 1).toString();
                    buckets.push({ bucketStart, bucketEnd, label });
                }
                break;
            }
            case 'yearly': {
                // Monthly buckets for the year
                const yearStart = new Date(startTime);
                for (let m = 0; m < 12; m++) {
                    const monthDate = new Date(yearStart.getFullYear(), m, 1);
                    const bucketStart = monthDate.getTime();
                    const nextMonth = new Date(yearStart.getFullYear(), m + 1, 1);
                    const bucketEnd = nextMonth.getTime();
                    const label = monthDate.toLocaleDateString([], { month: 'short' });
                    buckets.push({ bucketStart, bucketEnd, label });
                }
                break;
            }
        }
        
        const labels = [];
        const sessionCounts = [];
        const spendingAmounts = [];
        
        for (const bucket of buckets) {
            labels.push(bucket.label);
            
            const bucketSessions = sessions.filter(s => 
                s.timestamp >= bucket.bucketStart && s.timestamp < bucket.bucketEnd
            );
            sessionCounts.push(bucketSessions.length);
            
            const bucketExpenses = expenses.filter(e => 
                e.timestamp >= bucket.bucketStart && e.timestamp < bucket.bucketEnd
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
