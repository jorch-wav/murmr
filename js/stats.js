// =====================================================
// MURMR - Stats Dashboard
// Chart rendering and stats display
// =====================================================

class StatsView {
    constructor(storage) {
        this.storage = storage;
        this.currentPeriod = 'daily';
        this.chart = null;
        this.chartCtx = null;
        
        this.init();
    }
    
    init() {
        this.chartCtx = document.getElementById('stats-chart');
        this.bindEvents();
    }
    
    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentPeriod = btn.dataset.period;
                this.update();
            });
        });
    }
    
    update() {
        const stats = this.storage.getStats(this.currentPeriod);
        
        // Update session count
        document.getElementById('sessions-stat').textContent = stats.sessions;
        const sessionChange = document.getElementById('sessions-change');
        if (stats.sessionChange !== 0) {
            sessionChange.textContent = `${stats.sessionChange > 0 ? '+' : ''}${stats.sessionChange} vs prev`;
            sessionChange.className = 'stat-change ' + (stats.sessionChange <= 0 ? 'positive' : 'negative');
        } else {
            sessionChange.textContent = 'No change';
            sessionChange.className = 'stat-change';
        }
        
        // Update spending
        document.getElementById('spending-stat').textContent = '$' + stats.spending.toFixed(2);
        const spendingChange = document.getElementById('spending-change');
        if (stats.spendingChange !== 0) {
            spendingChange.textContent = `${stats.spendingChange > 0 ? '+' : ''}$${stats.spendingChange.toFixed(2)} vs prev`;
            spendingChange.className = 'stat-change ' + (stats.spendingChange <= 0 ? 'positive' : 'negative');
        } else {
            spendingChange.textContent = 'No change';
            spendingChange.className = 'stat-change';
        }
        
        // Update longest streak
        document.getElementById('streak-stat').textContent = this.storage.formatDuration(stats.longestStreak);
        
        // Update average time between
        if (stats.avgTimeBetween) {
            document.getElementById('average-stat').textContent = this.storage.formatDuration(stats.avgTimeBetween);
        } else {
            document.getElementById('average-stat').textContent = '--';
        }
        
        // Update chart title
        const periodLabels = {
            hourly: 'Last Hour',
            daily: 'Last 24 Hours',
            weekly: 'Last 7 Days',
            monthly: 'Last 30 Days',
            yearly: 'Last Year'
        };
        document.getElementById('chart-title').textContent = periodLabels[this.currentPeriod] || 'Activity';
        
        // Render chart
        this.renderChart(stats.chartData);
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
        const padding = { top: 10, right: 10, bottom: 30, left: 10 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        const barCount = data.labels.length;
        
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
            ctx.fillText('No sessions logged yet', width / 2, height / 2);
            return;
        }
        
        const barWidth = Math.min(30, (chartWidth / barCount) * 0.7);
        const barGap = (chartWidth - (barWidth * barCount)) / (barCount + 1);
        
        // Find max value
        const maxSessions = Math.max(1, ...data.sessionCounts);
        
        // Draw bars
        for (let i = 0; i < barCount; i++) {
            const x = padding.left + barGap + (i * (barWidth + barGap));
            const sessionHeight = Math.max(2, (data.sessionCounts[i] / maxSessions) * chartHeight);
            const y = padding.top + chartHeight - sessionHeight;
            
            // Session bar - use simple rect for compatibility
            if (data.sessionCounts[i] > 0) {
                const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
                gradient.addColorStop(0, 'rgba(248, 113, 113, 1)');
                gradient.addColorStop(1, 'rgba(248, 113, 113, 0.5)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                // Rounded rect with fallback
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, barWidth, sessionHeight, 3);
                } else {
                    ctx.rect(x, y, barWidth, sessionHeight);
                }
                ctx.fill();
                
                // Draw count on bar
                ctx.fillStyle = '#333';
                ctx.font = '10px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(data.sessionCounts[i], x + barWidth / 2, y - 4);
            }
            
            // Draw label (only every 4th label to avoid crowding)
            const labelInterval = Math.max(1, Math.ceil(barCount / 6));
            if (barCount <= 6 || i % labelInterval === 0) {
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
