document.addEventListener('DOMContentLoaded', function() {
    // 设置今天的日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateSelect').value = today;
    initializeCalendar();

    // 处理滑块值的显示
    initializeSliders();

    // 处理星级评分
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.dataset.rating;
            stars.forEach(s => {
                if (s.dataset.rating <= rating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });

    // 添加醒来记录
    let wakeRecordCount = 0;
    document.getElementById('addWakeRecord').addEventListener('click', function() {
        const wakeRecords = document.getElementById('wakeRecords');
        const newRecord = document.createElement('div');
        newRecord.className = 'form-group wake-record';
        newRecord.innerHTML = `
            <label>醒来记录 #${++wakeRecordCount}</label>
            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <label>时间</label>
                    <input type="time" class="wake-time" required>
                </div>
                <div style="flex: 1;">
                    <label>持续时间（分钟）</label>
                    <input type="number" class="wake-duration" required>
                </div>
            </div>
        `;
        wakeRecords.appendChild(newRecord);
    });

    // 表单提交处理
    document.getElementById('sleepForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 收集表单数据
        const data = {
            date: document.getElementById('dateSelect').value,
            bedTime: document.getElementById('bedTime').value,
            lightsOffTime: document.getElementById('lightsOffTime').value,
            timeToSleep: document.getElementById('timeToSleep').value,
            wakeCount: document.getElementById('wakeCount').value,
            wakeRecords: Array.from(document.querySelectorAll('.wake-record')).map(record => ({
                time: record.querySelector('.wake-time').value,
                duration: record.querySelector('.wake-duration').value
            })),
            finalWakeTime: document.getElementById('finalWakeTime').value,
            getUpTime: document.getElementById('getUpTime').value,
            sleepQuality: document.getElementById('sleepQuality').value,
            sleepAid: document.getElementById('sleepAid').value,
            dreamContent: document.getElementById('dreamContent').value,
            fatigueLevel: document.getElementById('fatigueLevel').value
        };

        // 计算睡眠指标
        updateSleepMetrics(data);

        // 保存到localStorage
        saveSleepData(data);

        // 更新图表
        updateCharts();

        alert('记录保存成功！');
    });

    // 导航按钮处理
    document.getElementById('historyBtn').addEventListener('click', showHistory);
    document.getElementById('analysisBtn').addEventListener('click', showAnalysis);

    // 导出按钮处理
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    document.getElementById('exportJSON').addEventListener('click', exportToJSON);

    // 添加梦境记录切换功能
    document.getElementById('hadDream').addEventListener('change', function() {
        const container = document.getElementById('dreamContentContainer');
        container.style.display = this.checked ? 'block' : 'none';
        if (!this.checked) {
            document.getElementById('dreamContent').value = '';
        }
    });
});

// 初始化滑块
function initializeSliders() {
    const sliders = {
        'sleepQuality': 'sleepQualityValue',
        'fatigueLevel': 'fatigueLevelValue'
    };
    
    Object.entries(sliders).forEach(([sliderId, valueId]) => {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        // 初始化显示
        valueDisplay.textContent = `${slider.value}分`;
        
        // 监听变化
        slider.addEventListener('input', function() {
            valueDisplay.textContent = `${this.value}分`;
        });
    });
}

// 计算睡眠指标
function updateSleepMetrics(data) {
    const metrics = calculateSleepMetrics(data);
    
    // 更新显示
    document.getElementById('actualSleepTime').textContent = metrics.actualSleepTime;
    document.getElementById('sleepDuration').textContent = metrics.sleepDuration;
    document.getElementById('fallAsleepSpeed').textContent = metrics.fallAsleepSpeed;
    document.getElementById('effectiveSleep').textContent = metrics.effectiveSleep;
    document.getElementById('efficiencyNumber').textContent = metrics.efficiency;
}

function calculateSleepMetrics(data) {
    // 将时间字符串转换为Date对象
    const baseDate = "2000/01/01 ";
    const lightsOffTime = new Date(baseDate + data.lightsOffTime);
    const timeToSleep = parseInt(data.timeToSleep); // 分钟
    const finalWakeTime = new Date(baseDate + data.finalWakeTime);
    const bedTime = new Date(baseDate + data.bedTime);
    const getUpTime = new Date(baseDate + data.getUpTime);

    // 计算实际睡眠时间
    const sleepStartTime = new Date(lightsOffTime.getTime() + timeToSleep * 60000);
    if (finalWakeTime < sleepStartTime) {
        finalWakeTime.setDate(finalWakeTime.getDate() + 1);
    }
    
    // 计算睡眠时长（分钟）
    const sleepDurationMinutes = (finalWakeTime - sleepStartTime) / 60000;
    const hours = Math.floor(sleepDurationMinutes / 60);
    const minutes = Math.floor(sleepDurationMinutes % 60);

    // 计算在床时间
    let timeInBed = (getUpTime - bedTime) / 60000;
    if (timeInBed < 0) {
        timeInBed += 24 * 60; // 跨越午夜
    }

    // 计算有效睡眠时间
    const wakeMinutes = data.wakeRecords.reduce((total, record) => 
        total + parseInt(record.duration), 0);
    const effectiveSleepMinutes = sleepDurationMinutes - wakeMinutes;

    // 计算睡眠效率
    const efficiency = ((effectiveSleepMinutes / timeInBed) * 100).toFixed(1);

    // 修改有效睡眠时间显示格式
    const effectiveHours = Math.floor(effectiveSleepMinutes / 60);
    const effectiveMinutes = Math.floor(effectiveSleepMinutes % 60);

    return {
        actualSleepTime: `${formatTime(sleepStartTime)} - ${formatTime(finalWakeTime)}`,
        sleepDuration: `${hours}h ${minutes}m`,
        fallAsleepSpeed: `${timeToSleep}分钟`,
        effectiveSleep: `${effectiveHours}h ${effectiveMinutes}m`,
        efficiency: efficiency
    };
}

// 格式化时间
function formatTime(date) {
    return date.toTimeString().slice(0, 5);
}

// 保存数据
function saveSleepData(data) {
    const sleepHistory = JSON.parse(localStorage.getItem('sleepHistory') || '[]');
    sleepHistory.push(data);
    localStorage.setItem('sleepHistory', JSON.stringify(sleepHistory));
}

// 显示历史记录
function showHistory() {
    const historySection = document.querySelector('.history-section');
    const analysisSection = document.querySelector('.analysis-section');
    historySection.style.display = 'block';
    analysisSection.style.display = 'none';
    
    // 加载历史数据
    loadHistoryData();
}

// 显示数据分析
function showAnalysis() {
    const historySection = document.querySelector('.history-section');
    const analysisSection = document.querySelector('.analysis-section');
    historySection.style.display = 'none';
    analysisSection.style.display = 'block';
    
    // 更新图表
    updateCharts();
}

// 更新图表
function updateCharts() {
    const sleepHistory = JSON.parse(localStorage.getItem('sleepHistory') || '[]');
    if (sleepHistory.length === 0) return;

    // 睡眠趋势图
    const trendChart = new Chart(document.getElementById('sleepTrendChart'), {
        type: 'line',
        data: {
            labels: sleepHistory.map(record => record.date),
            datasets: [{
                label: '睡眠时长',
                data: sleepHistory.map(record => {
                    const metrics = calculateSleepMetrics(record);
                    return parseFloat(metrics.sleepDuration);
                }),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        }
    });

    // 睡眠效率图
    const efficiencyChart = new Chart(document.getElementById('sleepEfficiencyChart'), {
        type: 'bar',
        data: {
            labels: sleepHistory.map(record => record.date),
            datasets: [{
                label: '睡眠效率',
                data: sleepHistory.map(record => {
                    const metrics = calculateSleepMetrics(record);
                    return parseFloat(metrics.efficiency);
                }),
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }]
        }
    });
}

// 导出功能
function exportToCSV() {
    const sleepHistory = JSON.parse(localStorage.getItem('sleepHistory') || '[]');
    if (sleepHistory.length === 0) {
        alert('没有可导出的数据');
        return;
    }

    const headers = ['日期', '上床时间', '关灯时间', '入睡时长', '睡眠效率', '睡眠质量', '疲劳程度'];
    const csvContent = [
        headers.join(','),
        ...sleepHistory.map(record => [
            record.date,
            record.bedTime,
            record.lightsOffTime,
            record.timeToSleep,
            calculateSleepMetrics(record).efficiency,
            record.sleepQuality,
            record.fatigueLevel
        ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'sleep-records.csv', 'text/csv');
}

function exportToJSON() {
    const sleepHistory = localStorage.getItem('sleepHistory') || '[]';
    downloadFile(sleepHistory, 'sleep-records.json', 'application/json');
}

function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

// 初始化日历
function initializeCalendar() {
    const weekDays = document.querySelector('.week-days');
    const today = new Date();
    weekDays.innerHTML = ''; // 清空现有内容
    
    for (let i = -3; i <= 3; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        const dayElement = document.createElement('div');
        dayElement.className = `day-item ${i === 0 ? 'current' : ''}`;
        dayElement.dataset.date = dateString;
        dayElement.innerHTML = `
            <span class="weekday">周${['日','一','二','三','四','五','六'][date.getDay()]}</span>
            <span class="date">${date.getDate()}</span>
        `;
        
        dayElement.addEventListener('click', function() {
            document.querySelectorAll('.day-item').forEach(item => 
                item.classList.remove('current'));
            this.classList.add('current');
            document.getElementById('dateSelect').value = this.dataset.date;
            loadDayData(this.dataset.date);
        });
        
        weekDays.appendChild(dayElement);
    }
}

// 添加加载日期数据功能
function loadDayData(date) {
    const sleepHistory = JSON.parse(localStorage.getItem('sleepHistory') || '[]');
    const dayData = sleepHistory.find(record => record.date === date);
    
    if (dayData) {
        // 填充表单数据
        Object.keys(dayData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = dayData[key];
                    // 触发梦境内容显示/隐藏
                    if (key === 'hadDream') {
                        document.getElementById('dreamContentContainer').style.display = 
                            dayData[key] ? 'block' : 'none';
                    }
                } else {
                    element.value = dayData[key];
                }
            }
        });
        updateSleepMetrics(dayData);
    } else {
        // 清空表单
        document.getElementById('sleepForm').reset();
        document.getElementById('dreamContentContainer').style.display = 'none';
    }
}