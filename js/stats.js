// =====================================================
// MURMR - Stats Dashboard
// Chart rendering and stats display
// =====================================================

class StatsView {
    constructor(storage) {
        this.storage = storage;
        this.currentPeriod = 'daily';
        this.periodOffset = 0; // 0 = current, -1 = previous, etc.
        this.chart = null;
        this.chartCtx = null;
        // Spending toggle: false = period view, true = monthly view
        this.spendingShowMonthly = localStorage.getItem('murmr_spending_monthly') === 'true';
        
        this.init();
    }
    
    init() {
        this.chartCtx = document.getElementById('stats-chart');
        this.historyLogsContainer = document.getElementById('history-logs');
        this.editingLog = null;
        this.sinceLastInterval = null;
        this.chartBars = [];
        this.chartTooltip = null;
        this.bindEvents();
    }
    
    bindEvents() {
        // Spending card toggle
        document.getElementById('spending-card')?.addEventListener('click', () => {
            this.spendingShowMonthly = !this.spendingShowMonthly;
            localStorage.setItem('murmr_spending_monthly', this.spendingShowMonthly);
            this.update();
        });
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentPeriod = btn.dataset.period;
                this.periodOffset = 0; // Reset to current when switching tabs
                this.hideChartTooltip();
                this.update();
            });
        });
        
        // Period navigation
        document.getElementById('period-prev')?.addEventListener('click', () => {
            this.periodOffset--;
            this.hideChartTooltip();
            this.update();
        });
        
        document.getElementById('period-next')?.addEventListener('click', () => {
            if (this.periodOffset < 0) {
                this.periodOffset++;
                this.hideChartTooltip();
                this.update();
            }
        });
        
        // Chart touch interaction for tooltip
        this.chartCtx?.addEventListener('click', (e) => this.handleChartTouch(e));
        this.chartCtx?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleChartTouch(e.touches[0]);
        }, { passive: false });
    }
    
    handleChartTouch(e) {
        if (!this.chartBars || this.chartBars.length === 0) return;
        
        const canvas = this.chartCtx;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Find which bar was touched
        for (const bar of this.chartBars) {
            if (x >= bar.x && x <= bar.x + bar.width && 
                y >= bar.y && y <= bar.y + bar.height + 10) { // +10 for easier touch
                if (bar.count > 0) {
                    this.showChartTooltip(bar, rect);
                    return;
                }
            }
        }
        
        // Clicked outside bars - hide tooltip
        this.hideChartTooltip();
    }
    
    showChartTooltip(bar, canvasRect) {
        this.hideChartTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        
        const isDaily = this.chartBars.length === 24;
        let text = '';
        if (isDaily) {
            text = `${bar.count} session${bar.count > 1 ? 's' : ''} at ${bar.label}`;
        } else {
            text = `${bar.count} session${bar.count > 1 ? 's' : ''} · ${bar.label}`;
        }
        tooltip.textContent = text;
        
        document.body.appendChild(tooltip);
        this.chartTooltip = tooltip;
        
        // Position tooltip above the bar
        const tooltipRect = tooltip.getBoundingClientRect();
        const left = canvasRect.left + bar.x + bar.width / 2 - tooltipRect.width / 2;
        const top = canvasRect.top + bar.y - tooltipRect.height - 8;
        
        tooltip.style.left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10)) + 'px';
        tooltip.style.top = Math.max(10, top) + 'px';
        
        // Auto-hide after 2 seconds
        setTimeout(() => this.hideChartTooltip(), 2000);
    }
    
    hideChartTooltip() {
        if (this.chartTooltip) {
            this.chartTooltip.remove();
            this.chartTooltip = null;
        }
    }
    
    update() {
        try {
            const stats = this.storage.getStats(this.currentPeriod, this.periodOffset);
            const allSessions = this.storage.getSessions();
            
            // Update period label/title
            document.getElementById('chart-title').textContent = stats.periodLabel;
            
            // Show/hide next button (can't go to future)
            const nextBtn = document.getElementById('period-next');
            if (nextBtn) {
                nextBtn.style.opacity = this.periodOffset < 0 ? '1' : '0.3';
                nextBtn.style.pointerEvents = this.periodOffset < 0 ? 'auto' : 'none';
            }
            
            // Update sessions label based on period
            const sessionsLabel = document.getElementById('sessions-label');
            const totalSessions = this.storage.getSessions().length;
            const periodLabels = {
                'daily': this.periodOffset === 0 ? 'Sessions Today' : 'Sessions',
                'weekly': this.periodOffset === 0 ? 'Sessions This Week' : 'Sessions',
                'monthly': this.periodOffset === 0 ? 'Sessions This Month' : 'Sessions',
                'yearly': this.periodOffset === 0 ? 'Sessions This Year' : 'Sessions'
            };
            if (sessionsLabel) {
                sessionsLabel.textContent = periodLabels[stats.period] || 'Sessions';
            }
            
            // Update session count - show period count, with total in subtext
            document.getElementById('sessions-stat').textContent = stats.sessions || 0;
            const sessionChange = document.getElementById('sessions-change');
            if (stats.sessionChange && stats.sessionChange !== 0) {
                sessionChange.textContent = `${stats.sessionChange > 0 ? '+' : ''}${stats.sessionChange} vs prev · ${totalSessions} total`;
                sessionChange.className = 'stat-change ' + (stats.sessionChange <= 0 ? 'positive' : 'negative');
            } else {
                sessionChange.textContent = totalSessions > 0 ? `${totalSessions} total` : 'No sessions yet';
                sessionChange.className = 'stat-change';
            }
            
            // Update spending card - toggleable between period and monthly view
            const spendingLabel = document.getElementById('spending-label');
            const spendingCard = document.getElementById('spending-card');
            const spendingChange = document.getElementById('spending-change');
            
            if (this.spendingShowMonthly) {
                // Show monthly spending
                if (spendingLabel) spendingLabel.textContent = 'Spent This Month';
                document.getElementById('spending-stat').textContent = '$' + (stats.monthlySpending || 0).toFixed(2);
                const monthlyChange = stats.monthlySpendingChange || 0;
                if (monthlyChange !== 0) {
                    spendingChange.textContent = `${monthlyChange > 0 ? '+' : ''}$${monthlyChange.toFixed(2)} vs last month`;
                    spendingChange.className = 'stat-change ' + (monthlyChange <= 0 ? 'positive' : 'negative');
                } else {
                    spendingChange.textContent = 'Tap to see period';
                    spendingChange.className = 'stat-change';
                }
            } else {
                // Show period spending
                const periodSpendingLabels = {
                    'daily': 'Spent Today',
                    'weekly': 'Spent This Week',
                    'monthly': 'Spent This Month',
                    'yearly': 'Spent This Year'
                };
                if (spendingLabel) spendingLabel.textContent = periodSpendingLabels[stats.period] || 'Spending';
                document.getElementById('spending-stat').textContent = '$' + (stats.spending || 0).toFixed(2);
                const spendingChangeVal = stats.spendingChange || 0;
                if (spendingChangeVal !== 0) {
                    spendingChange.textContent = `${spendingChangeVal > 0 ? '+' : ''}$${spendingChangeVal.toFixed(2)} vs prev`;
                    spendingChange.className = 'stat-change ' + (spendingChangeVal <= 0 ? 'positive' : 'negative');
                } else {
                    spendingChange.textContent = 'Tap for monthly';
                    spendingChange.className = 'stat-change';
                }
            }
            
            // Update longest streak
            document.getElementById('streak-stat').textContent = this.storage.formatDuration(stats.longestStreak);
            
            // Update time since last session (and start live counter)
            this.updateTimeSinceLast();
            this.startSinceLastCounter();
            
            // Update chart title with period label
            document.getElementById('chart-title').textContent = stats.periodLabel || 'Activity';
            
            // Render chart
            this.renderChart(stats.chartData);
            
            // Render combined history
            this.renderHistory();
        } catch (error) {
            console.error('Stats update error:', error);
        }
    }
    
    updateTimeSinceLast() {
        const sessions = this.storage.getSessions();
        const sinceLastEl = document.getElementById('since-last-stat');
        
        if (sessions.length === 0) {
            sinceLastEl.textContent = '--';
            return;
        }
        
        // Find most recent session
        const mostRecent = sessions[sessions.length - 1];
        const timeSince = Date.now() - mostRecent.timestamp;
        sinceLastEl.textContent = this.storage.formatDuration(timeSince);
    }
    
    startSinceLastCounter() {
        // Clear existing interval if any
        if (this.sinceLastInterval) {
            clearInterval(this.sinceLastInterval);
        }
        
        // Update every second
        this.sinceLastInterval = setInterval(() => {
            this.updateTimeSinceLast();
        }, 1000);
    }
    
    stopSinceLastCounter() {
        if (this.sinceLastInterval) {
            clearInterval(this.sinceLastInterval);
            this.sinceLastInterval = null;
        }
    }
    
    renderHistory() {
        const sessions = this.storage.getSessions();
        const expenses = this.storage.getExpenses();
        const container = this.historyLogsContainer;
        
        if (!container) return;
        
        // Combine sessions and expenses with type marker
        const allItems = [
            ...sessions.map((s, idx) => ({ ...s, type: 'session', originalIndex: idx })),
            ...expenses.map((e, idx) => ({ ...e, type: 'expense', originalIndex: idx }))
        ];
        
        // Sort by timestamp descending (most recent first)
        allItems.sort((a, b) => b.timestamp - a.timestamp);
        
        if (allItems.length === 0) {
            container.innerHTML = '<div class="logs-empty">No history yet</div>';
            return;
        }
        
        // Group items by day
        const groupedByDay = {};
        allItems.forEach(item => {
            const date = new Date(item.timestamp);
            const dayKey = date.toDateString(); // e.g., "Sun Jan 11 2026"
            if (!groupedByDay[dayKey]) {
                groupedByDay[dayKey] = [];
            }
            groupedByDay[dayKey].push(item);
        });
        
        // Convert to array and take recent days
        const dayKeys = Object.keys(groupedByDay).slice(0, 14); // Last 14 days with activity
        
        container.innerHTML = dayKeys.map(dayKey => {
            const items = groupedByDay[dayKey];
            const date = new Date(items[0].timestamp);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            let dateLabel;
            if (date.toDateString() === today.toDateString()) {
                dateLabel = 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateLabel = 'Yesterday';
            } else {
                dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            }
            
            const sessionCount = items.filter(i => i.type === 'session').length;
            const expenseTotal = items.filter(i => i.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
            
            let summary = [];
            if (sessionCount > 0) summary.push(`${sessionCount} session${sessionCount > 1 ? 's' : ''}`);
            if (expenseTotal > 0) summary.push(`$${expenseTotal.toFixed(2)}`);
            
            const itemsHtml = items.map(item => {
                const time = new Date(item.timestamp);
                const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                
                if (item.type === 'session') {
                    return `
                        <div class="log-item log-session" data-type="session" data-index="${item.originalIndex}">
                            <div class="log-item-content">
                                <span class="log-item-time">${timeStr}</span>
                                <span class="log-item-value log-type-session">
                                    <span class="icon pixel-smoke"></span>
                                    Session
                                </span>
                            </div>
                            <div class="log-item-actions">
                                <div class="log-item-edit">Edit</div>
                                <div class="log-item-delete">Delete</div>
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="log-item log-expense" data-type="expense" data-index="${item.originalIndex}">
                            <div class="log-item-content">
                                <span class="log-item-time">${timeStr}${item.note ? ' · ' + item.note : ''}</span>
                                <span class="log-item-value log-type-expense">
                                    <span class="icon pixel-coin"></span>
                                    $${item.amount.toFixed(2)}
                                </span>
                            </div>
                            <div class="log-item-actions">
                                <div class="log-item-edit">Edit</div>
                                <div class="log-item-delete">Delete</div>
                            </div>
                        </div>
                    `;
                }
            }).join('');
            
            return `
                <div class="log-day-group" data-day="${dayKey}">
                    <div class="log-day-header">
                        <span class="log-day-date">${dateLabel}</span>
                        <span class="log-day-summary">${summary.join(' · ')}</span>
                        <span class="log-day-chevron">›</span>
                    </div>
                    <div class="log-day-items">
                        ${itemsHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        this.bindLogItemEvents(container);
        this.bindDayGroupEvents(container);
    }
    
    bindDayGroupEvents(container) {
        container.querySelectorAll('.log-day-header').forEach(header => {
            header.addEventListener('click', () => {
                const group = header.closest('.log-day-group');
                group.classList.toggle('expanded');
            });
        });
    }
    
    bindLogItemEvents(container) {
        const self = this;
        container.querySelectorAll('.log-item').forEach(item => {
            let startX = 0;
            let currentX = 0;
            const type = item.dataset.type;
            const index = parseInt(item.dataset.index);
            
            // Touch events for swipe
            item.addEventListener('touchstart', (e) => {
                // Don't interfere with button touches
                if (e.target.closest('.log-item-edit') || e.target.closest('.log-item-delete')) {
                    return;
                }
                startX = e.touches[0].clientX;
                item.classList.remove('swiped');
            }, { passive: true });
            
            item.addEventListener('touchmove', (e) => {
                if (e.target.closest('.log-item-edit') || e.target.closest('.log-item-delete')) {
                    return;
                }
                currentX = e.touches[0].clientX;
                const deltaX = startX - currentX;
                
                if (deltaX > 30) {
                    item.classList.add('swiped');
                } else if (deltaX < -30) {
                    item.classList.remove('swiped');
                }
            }, { passive: true });
            
            // Edit button - use touchend for mobile
            const editBtn = item.querySelector('.log-item-edit');
            editBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                self.editLogItem(type, index);
            });
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                self.editLogItem(type, index);
            });
            
            // Delete button - use touchend for mobile
            const deleteBtn = item.querySelector('.log-item-delete');
            deleteBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                self.deleteLogItem(type, index);
            });
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                self.deleteLogItem(type, index);
            });
        });
    }
    
    editLogItem(type, index) {
        if (type === 'session') {
            const sessions = this.storage.getSessions();
            const session = sessions[index];
            if (!session) return;
            
            const date = new Date(session.timestamp);
            document.getElementById('retro-session-date').value = date.toISOString().split('T')[0];
            document.getElementById('retro-session-time').value = date.toTimeString().slice(0, 5);
            
            // Store edit state
            this.editingLog = { type: 'session', index };
            
            // Show modal
            document.getElementById('modal-overlay').classList.add('visible');
            document.getElementById('retro-session-modal').classList.add('active');
        } else {
            const expenses = this.storage.getExpenses();
            const expense = expenses[index];
            if (!expense) return;
            
            const date = new Date(expense.timestamp);
            document.getElementById('retro-expense-date').value = date.toISOString().split('T')[0];
            document.getElementById('retro-expense-time').value = date.toTimeString().slice(0, 5);
            document.getElementById('retro-expense-amount').value = expense.amount;
            document.getElementById('retro-expense-quantity').value = expense.quantity || 1;
            document.getElementById('retro-expense-note').value = expense.note || '';
            
            // Store edit state
            this.editingLog = { type: 'expense', index };
            
            // Show modal
            document.getElementById('modal-overlay').classList.add('visible');
            document.getElementById('retro-expense-modal').classList.add('active');
        }
    }
    
    deleteLogItem(type, index) {
        if (confirm('Delete this log entry?')) {
            if (type === 'session') {
                this.storage.deleteSession(index);
            } else {
                this.storage.deleteExpense(index);
            }
            this.update();
            // Also update the main display
            if (window.murmrApp) {
                window.murmrApp.updateDisplay();
            }
        }
    }
    
    renderChart(data) {
        const canvas = this.chartCtx;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas size - wait for layout
        const container = canvas.parentElement;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const width = Math.max(200, rect.width - 40); // Account for padding
        const height = 150;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        // Reset and scale
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Chart dimensions
        const padding = { top: 15, right: 10, bottom: 30, left: 10 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        const barCount = data.labels.length;
        
        // Store bar positions for touch interaction
        this.chartBars = [];
        this.chartData = data;
        this.chartDimensions = { width, height, padding, chartWidth, chartHeight };
        
        // Draw baseline first
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(width - padding.right, padding.top + chartHeight);
        ctx.stroke();
        
        // If no data, show placeholder message
        if (barCount === 0 || data.sessionCounts.every(c => c === 0)) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.font = '14px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No sessions in this period', width / 2, height / 2);
            return;
        }
        
        // Much thicker bars - use almost all available width
        const isDaily = barCount === 24;
        const barWidth = isDaily 
            ? (chartWidth / barCount) * 0.85
            : Math.min(40, (chartWidth / barCount) * 0.8);
        const barGap = (chartWidth - (barWidth * barCount)) / (barCount + 1);
        
        // Find max value
        const maxSessions = Math.max(1, ...data.sessionCounts);
        
        // Draw bars
        for (let i = 0; i < barCount; i++) {
            const x = padding.left + barGap + (i * (barWidth + barGap));
            const count = data.sessionCounts[i];
            const sessionHeight = count > 0 
                ? Math.max(4, (count / maxSessions) * chartHeight)
                : 0;
            const y = padding.top + chartHeight - sessionHeight;
            
            // Store bar position for touch detection
            this.chartBars.push({
                x, y, width: barWidth, height: sessionHeight,
                count, label: data.labels[i], index: i
            });
            
            // Session bar
            if (count > 0) {
                const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
                gradient.addColorStop(0, 'rgba(248, 113, 113, 1)');
                gradient.addColorStop(1, 'rgba(248, 113, 113, 0.5)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, barWidth, sessionHeight, 4);
                } else {
                    ctx.rect(x, y, barWidth, sessionHeight);
                }
                ctx.fill();
            }
            
            // Draw x-axis labels (sparse for readability)
            let showLabel = false;
            if (isDaily) {
                showLabel = i % 6 === 0;
            } else if (barCount <= 7) {
                showLabel = true;
            } else if (barCount <= 12) {
                showLabel = true;
            } else {
                showLabel = (i + 1) % 5 === 0 || i === 0;
            }
            
            if (showLabel) {
                ctx.fillStyle = '#666';
                ctx.font = '9px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(data.labels[i], x + barWidth / 2, height - 8);
            }
        }
    }
}

// Export for use in app
window.StatsView = StatsView;
