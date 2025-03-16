const githubSync = new GitHubSync();

document.addEventListener('DOMContentLoaded', async function() {
    // 设置今天的日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateSelect').value = today;

    // 初始化日历
    initializeCalendar();

    // 初始化滑块
    initializeSliders();

    // 初始化表单
    initializeForm();

    // 添加醒来记录按钮事件监听
    const addWakeRecordBtn = document.getElementById('addWakeRecord');
    if (addWakeRecordBtn) {
        addWakeRecordBtn.addEventListener('click', addWakeRecord);
    }

    // 初始化 GitHub 同步
    await githubSync.init();

    // 添加GitHub登录按钮事件
    const githubLoginBtn = document.getElementById('githubLoginBtn');
    if (githubLoginBtn) {
        githubLoginBtn.addEventListener('click', () => {
            githubSync.login();
        });
    }

    // 添加表单提交事件监听
    const sleepForm = document.getElementById('sleepForm');
    if (sleepForm) {
        sleepForm.addEventListener('submit', handleFormSubmit);
    }

    // 添加日期选择事件监听
    const dateSelect = document.getElementById('dateSelect');
    if (dateSelect) {
        dateSelect.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            initializeCalendar(selectedDate);
            loadDayData(this.value);
        });
    }

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

    // 添加醒来记录按钮事件监听
    document.getElementById('addWakeRecord').addEventListener('click', addWakeRecord);

    // 表单提交处理
    document.getElementById('sleepForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 收集醒来记录数据
        const wakeRecords = Array.from(document.querySelectorAll('.wake-record')).map(record => ({
            time: record.querySelector('.wake-time').value,
            duration: record.querySelector('.wake-duration').value,
            activity: record.querySelector('.wake-activity').value
        }));

        // 收集表单数据
        const data = {
            date: document.getElementById('dateSelect').value,
            bedTime: document.getElementById('bedTime').value,
            lightsOffTime: document.getElementById('lightsOffTime').value,
            timeToSleep: document.getElementById('timeToSleep').value,
            wakeCount: document.getElementById('wakeCount').value,
            wakeRecords: wakeRecords,
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

    // 添加登出按钮事件
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('确定要断开 GitHub 连接吗？本地数据将保留。')) {
            githubSync.logout();
        }
    });
});

// 全局变量（确保在 DOMContentLoaded 外部定义）
let wakeRecordCount = 0;

// 定义图标映射
const qualityIcons = {
    1: '<i class="fas fa-face-sad-cry" style="color: #ff4444;"></i>',      // 很差
    2: '<i class="fas fa-face-sad-tear" style="color: #ffbb33;"></i>',     // 较差
    3: '<i class="fas fa-face-meh" style="color: #00C851;"></i>',          // 一般
    4: '<i class="fas fa-face-smile" style="color: #33b5e5;"></i>',        // 较好
    5: '<i class="fas fa-face-laugh-beam" style="color: #4080FF;"></i>'    // 很好
};

const fatigueIcons = {
    1: '<i class="fas fa-battery-empty" style="color: #ff4444;"></i>',     // 非常疲惫
    2: '<i class="fas fa-battery-quarter" style="color: #ffbb33;"></i>',   // 较为疲惫
    3: '<i class="fas fa-battery-half" style="color: #00C851;"></i>',      // 一般
    4: '<i class="fas fa-battery-three-quarters" style="color: #33b5e5;"></i>', // 较为清醒
    5: '<i class="fas fa-battery-full" style="color: #4080FF;"></i>'       // 精神饱满
};

// 更新图标显示函数
function updateQualityIcon(value, type, element) {
    const icons = type === 'sleep' ? qualityIcons : fatigueIcons;
    if (element && icons[value]) {
        element.innerHTML = icons[value];
    }
}

// 修改滑块初始化函数
function initializeSliders() {
    const sliders = {
        'sleepQuality': {
            valueId: 'sleepQualityValue',
            iconId: 'sleepQualityIcon',
            type: 'sleep',
            labels: ['很差', '较差', '一般', '较好', '很好']
        },
        'fatigueLevel': {
            valueId: 'fatigueLevelValue',
            iconId: 'fatigueLevelIcon',
            type: 'fatigue',
            labels: ['非常疲惫', '较为疲惫', '一般', '较为清醒', '精神饱满']
        }
    };
    
    Object.entries(sliders).forEach(([sliderId, config]) => {
        const slider = document.getElementById(sliderId);
        if (!slider) return;

        const valueDisplay = document.getElementById(config.valueId);
        const iconDisplay = document.getElementById(config.iconId);
        
        if (valueDisplay && iconDisplay) {
            // 初始化显示
            valueDisplay.textContent = `${slider.value}分`;
            updateQualityIcon(slider.value, config.type, iconDisplay);
            
            // 监听变化
            slider.addEventListener('input', function() {
                valueDisplay.textContent = `${this.value}分`;
                updateQualityIcon(this.value, config.type, iconDisplay);
            });
        }
    });
}

// 计算睡眠指标
function updateSleepMetrics(data) {
    const metrics = calculateSleepMetrics(data);
    
    // 更新显示并应用颜色
    document.getElementById('actualSleepTime').textContent = metrics.actualSleepTime;
    
    const sleepDurationElement = document.getElementById('sleepDuration');
    sleepDurationElement.textContent = metrics.sleepDuration;
    sleepDurationElement.style.color = metrics.sleepDurationColor;
    
    document.getElementById('fallAsleepSpeed').textContent = metrics.fallAsleepSpeed;
    document.getElementById('effectiveSleep').textContent = metrics.effectiveSleep;
    
    const efficiencyElement = document.getElementById('efficiencyNumber');
    efficiencyElement.textContent = metrics.efficiency;
    efficiencyElement.style.color = getSleepEfficiencyColor(metrics.efficiency);
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

    // 计算总睡眠时长（小时）
    const totalSleepHours = sleepDurationMinutes / 60;
    
    return {
        actualSleepTime: `${formatTime(sleepStartTime)} - ${formatTime(finalWakeTime)}`,
        sleepDuration: `${hours}h ${minutes}m`,
        sleepDurationHours: totalSleepHours,
        sleepDurationColor: getSleepDurationColor(totalSleepHours),
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
async function saveSleepData(data) {
    const sleepHistory = JSON.parse(localStorage.getItem('sleepHistory') || '[]');
    sleepHistory.push(data);
    localStorage.setItem('sleepHistory', JSON.stringify(sleepHistory));
    
    // 同步到GitHub
    if (githubSync.isLoggedIn) {
        await githubSync.syncData(sleepHistory);
    }
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
                backgroundColor: function(context) {
                    const value = context.raw;
                    return getSleepEfficiencyColor(value);
                }
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '睡眠效率 (%)'
                    }
                }
            }
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

// 修改日期选择器的事件监听
document.addEventListener('DOMContentLoaded', function() {
    const dateSelect = document.getElementById('dateSelect');
    
    // 监听日期选择变化
    dateSelect.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        initializeCalendar(selectedDate);
        loadDayData(this.value);
    });
    
    // 初始化为今天的日期
    const today = new Date();
    const todayString = today.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('/').join('-');
    
    dateSelect.value = todayString;
    initializeCalendar(today);
    loadDayData(todayString);
});

function initializeCalendar(selectedDate = new Date()) {
    const weekDays = document.querySelector('.week-days');
    if (!weekDays) return;
    
    weekDays.innerHTML = '';
    
    // 处理时区问题：确保使用本地时间
    const localDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000);
    
    // 获取所选日期所在周的周日
    const sunday = new Date(localDate);
    sunday.setDate(localDate.getDate() - localDate.getDay());
    
    weekDays.innerHTML = `
        <button class="week-nav prev">&lt;</button>
        <div class="days-container">
            <div class="day-item">
                <span class="weekday">周日</span>
                <span class="date"></span>
            </div>
            <div class="day-item">
                <span class="weekday">周一</span>
                <span class="date"></span>
            </div>
            <div class="day-item">
                <span class="weekday">周二</span>
                <span class="date"></span>
            </div>
            <div class="day-item">
                <span class="weekday">周三</span>
                <span class="date"></span>
            </div>
            <div class="day-item">
                <span class="weekday">周四</span>
                <span class="date"></span>
            </div>
            <div class="day-item">
                <span class="weekday">周五</span>
                <span class="date"></span>
            </div>
            <div class="day-item">
                <span class="weekday">周六</span>
                <span class="date"></span>
            </div>
        </div>
        <button class="week-nav next">&gt;</button>
    `;
    
    // 填充日期
    const dayItems = weekDays.querySelectorAll('.day-item');
    const dateSelect = document.getElementById('dateSelect');
    const selectedDateString = dateSelect.value;
    
    dayItems.forEach((item, index) => {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + index);
        // 使用 toLocaleDateString 来获取正确的日期字符串
        const dateString = date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).split('/').join('-');
        
        const dateSpan = item.querySelector('.date');
        dateSpan.textContent = date.getDate();
        
        item.dataset.date = dateString;
        
        // 设置选中日期的样式
        if (dateString === selectedDateString) {
            item.classList.add('current');
        } else {
            item.classList.remove('current');
        }
        
        // 添加点击事件
        item.addEventListener('click', function() {
            dayItems.forEach(di => di.classList.remove('current'));
            this.classList.add('current');
            dateSelect.value = this.dataset.date;
            loadDayData(this.dataset.date);
        });
    });
    
    // 添加周切换事件
    weekDays.querySelector('.prev').addEventListener('click', () => {
        const newDate = new Date(sunday);
        newDate.setDate(newDate.getDate() - 7);
        const newDateString = newDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).split('/').join('-');
        dateSelect.value = newDateString;
        initializeCalendar(newDate);
        loadDayData(newDateString);
    });
    
    weekDays.querySelector('.next').addEventListener('click', () => {
        const newDate = new Date(sunday);
        newDate.setDate(newDate.getDate() + 7);
        const newDateString = newDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).split('/').join('-');
        dateSelect.value = newDateString;
        initializeCalendar(newDate);
        loadDayData(newDateString);
    });
}

// 修改初始化函数
function initializeForm() {
    // 清空所有时间输入
    const timeInputs = ['bedTime', 'lightsOffTime', 'timeToSleep', 'finalWakeTime', 'getUpTime'];
    timeInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });

    // 重置显示的指标
    const metrics = {
        'actualSleepTime': '--:-- - --:--',
        'sleepDuration': '--h --m',
        'fallAsleepSpeed': '--分钟',
        'effectiveSleep': '--h --m',
        'efficiencyNumber': '--'
    };

    Object.entries(metrics).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    // 重置睡眠质量和疲劳度滑块
    const sliders = ['sleepQuality', 'fatigueLevel'];
    sliders.forEach(id => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(`${id}Value`);
        if (slider) slider.value = 3;
        if (valueDisplay) valueDisplay.textContent = '3分';
    });
    
    // 清空醒来记录
    const wakeRecords = document.getElementById('wakeRecords');
    if (wakeRecords) wakeRecords.innerHTML = '';
    wakeRecordCount = 0;

    // 重置梦境相关
    const hadDream = document.getElementById('hadDream');
    const dreamContent = document.getElementById('dreamContent');
    if (hadDream) hadDream.checked = false;
    if (dreamContent) dreamContent.value = '';
    const dreamContainer = document.getElementById('dreamContentContainer');
    if (dreamContainer) dreamContainer.style.display = 'none';
}

// 修改日期切换时的数据加载函数
function loadDayData(date) {
    const sleepHistory = JSON.parse(localStorage.getItem('sleepHistory') || '[]');
    const dayData = sleepHistory.find(record => record.date === date);
    
    if (dayData) {
        // 如果有数据则填充
        Object.keys(dayData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = dayData[key];
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
        // 如果没有数据则重置表单
        initializeForm();
    }
}

// 添加睡眠时长颜色判断函数
function getSleepDurationColor(hours) {
    if (hours < 6) return 'var(--error-color)';     // 红色
    if (hours < 7) return 'var(--warning-color)';   // 黄色
    if (hours <= 8) return 'var(--success-color)';  // 绿色
    return 'var(--primary-color)';                  // 蓝色
}

// 添加睡眠效率颜色判断函数
function getSleepEfficiencyColor(efficiency) {
    const efficiencyNum = parseFloat(efficiency);
    if (efficiencyNum < 50) return 'var(--error-color)';      // 红色
    if (efficiencyNum < 60) return 'var(--warning-color)';    // 黄色
    if (efficiencyNum < 80) return 'var(--success-color)';    // 绿色
    return 'var(--primary-color)';                            // 蓝色
}

// 添加醒来记录的函数
function addWakeRecord() {
    const wakeRecords = document.getElementById('wakeRecords');
    const newRecord = document.createElement('div');
    newRecord.className = 'form-group wake-record';
    newRecord.innerHTML = `
        <label>醒来记录 #${++wakeRecordCount}</label>
        <div class="wake-record-grid">
            <div class="wake-time-input">
                <label>时间</label>
                <input type="time" class="wake-time" required>
            </div>
            <div class="wake-duration-input">
                <label>持续时间（分钟）</label>
                <input type="number" class="wake-duration" min="1" required>
            </div>
            <div class="wake-activity-input">
                <label>醒来活动</label>
                <input type="text" class="wake-activity" placeholder="例如：上厕所、喝水...">
            </div>
        </div>
        <button type="button" class="remove-wake-record" onclick="removeWakeRecord(this)">删除</button>
    `;
    wakeRecords.appendChild(newRecord);
}

// 添加删除醒来记录的函数
function removeWakeRecord(button) {
    button.parentElement.remove();
    // 重新编号
    document.querySelectorAll('.wake-record').forEach((record, index) => {
        record.querySelector('label').textContent = `醒来记录 #${index + 1}`;
    });
    wakeRecordCount--;
}

function updateWeeklyAverages(data) {
    // 计算平均关灯时间
    const avgLightsOff = calculateAverageLightsOffTime(data);
    document.getElementById('avgLightsOffTime').textContent = formatTime(avgLightsOff);
    
    // 计算平均睡眠时间
    const avgSleepDuration = calculateAverageSleepDuration(data);
    document.getElementById('avgSleepDuration').textContent = 
        `${Math.floor(avgSleepDuration)}h ${Math.round((avgSleepDuration % 1) * 60)}m`;
    
    // 更新进度条
    updateProgressBars(avgLightsOff, avgSleepDuration);
}

function calculateAverageLightsOffTime(data) {
    const times = data.map(record => {
        const [hours, minutes] = record.lightsOffTime.split(':');
        return new Date(2000, 0, 1, hours, minutes);
    });
    
    const totalMinutes = times.reduce((sum, time) => {
        let minutes = time.getHours() * 60 + time.getMinutes();
        // 处理跨午夜的情况
        if (minutes < 12 * 60) { // 如果时间在凌晨
            minutes += 24 * 60;
        }
        return sum + minutes;
    }, 0);
    
    const avgMinutes = totalMinutes / times.length;
    const avgHours = Math.floor(avgMinutes / 60) % 24;
    const avgMins = Math.round(avgMinutes % 60);
    
    return new Date(2000, 0, 1, avgHours, avgMins);
}

function calculateAverageSleepDuration(data) {
    const durations = data.map(record => {
        const metrics = calculateSleepMetrics(record);
        return metrics.sleepDurationHours;
    });
    
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
}

function updateProgressBars(avgLightsOff, avgSleepDuration) {
    // 关灯时间进度条逻辑
    const lightsOffHour = avgLightsOff.getHours();
    const lightsOffMinutes = avgLightsOff.getMinutes();
    const lightsOffProgress = ((lightsOffHour * 60 + lightsOffMinutes) - (20 * 60)) / (8 * 60); // 20:00-04:00范围
    
    // 睡眠时间进度条逻辑
    const sleepProgress = avgSleepDuration / 12; // 假设最大12小时
    
    // 更新进度条显示
    const greenDots = document.querySelectorAll('.bar-dots.green span');
    const yellowDots = document.querySelectorAll('.bar-dots.yellow span');
    
    greenDots.forEach((dot, index) => {
        dot.style.opacity = index / greenDots.length <= lightsOffProgress ? '1' : '0.3';
    });
    
    yellowDots.forEach((dot, index) => {
        dot.style.opacity = index / yellowDots.length <= sleepProgress ? '1' : '0.3';
    });
}