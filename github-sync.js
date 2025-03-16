class GitHubSync {
    constructor() {
        this.clientId = 'Ov23liZDvjK5SCG3VYVM';
        this.redirectUri = 'https://zixinw.github.io/SleepCBT/';
        this.isLoggedIn = false;
        this.gistId = localStorage.getItem('gist_id');
        
        // 检查是否已登录
        this.token = localStorage.getItem('github_token');
        if (this.token) {
            this.isLoggedIn = true;
        }
    }

    // 初始化
    async init() {
        // 检查URL中是否有授权码
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
            await this.handleAuthCode(code);
        }
        this.updateLoginButton();
        if (this.isLoggedIn) {
            await this.loadData();
        }
    }

    // 添加设置 token 的方法
    setToken(token) {
        this.token = token;
        localStorage.setItem('github_token', token);
        this.isLoggedIn = true;
        this.updateLoginButton();
    }

    // 显示 token 输入对话框
    showTokenInput() {
        const tokenInput = prompt('请输入你的 GitHub Personal Access Token：');
        if (tokenInput) {
            this.setToken(tokenInput);
            this.loadData().then(data => {
                if (data) {
                    // 更新UI显示同步状态
                    document.getElementById('syncStatus').textContent = '数据已同步 ' + new Date().toLocaleTimeString();
                    // 重新加载当前日期数据
                    if (typeof loadCurrentDateData === 'function') {
                        loadCurrentDateData();
                    }
                }
            });
        }
    }

    // 修改登录方法
    login() {
        this.showTokenInput();
    }

    // 更新登录按钮状态
    updateLoginButton() {
        const loginBtn = document.getElementById('githubLoginBtn');
        if (!loginBtn) return; // 如果按钮不存在则返回
        
        if (this.isLoggedIn) {
            loginBtn.innerHTML = '<i class="fab fa-github"></i><span>已连接到GitHub</span>';
            loginBtn.disabled = true;
        } else {
            loginBtn.innerHTML = '<i class="fab fa-github"></i><span>连接GitHub</span>';
            loginBtn.disabled = false;
        }
    }

    // 添加登出方法
    logout() {
        localStorage.removeItem('github_token');
        localStorage.removeItem('gist_id');
        this.token = null;
        this.gistId = null;
        this.isLoggedIn = false;
        this.updateLoginButton();
    }

    // 同步数据到Gist
    async syncData(data) {
        if (!this.isLoggedIn) return;

        try {
            if (!this.gistId) {
                await this.createGist(data);
            } else {
                await this.updateGist(data);
            }
            document.getElementById('syncStatus').textContent = '数据已同步 ' + new Date().toLocaleTimeString();
            return true;
        } catch (error) {
            console.error('Sync failed:', error);
            document.getElementById('syncStatus').textContent = '同步失败';
            return false;
        }
    }

    // 创建新的Private Gist
    async createGist(data) {
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: 'Sleep Tracker Data',
                public: false,
                files: {
                    'sleep-data.json': {
                        content: JSON.stringify(data)
                    }
                }
            })
        });

        const gist = await response.json();
        this.gistId = gist.id;
        localStorage.setItem('gist_id', this.gistId);
    }

    // 更新现有的Gist
    async updateGist(data) {
        await fetch(`https://api.github.com/gists/${this.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: {
                    'sleep-data.json': {
                        content: JSON.stringify(data)
                    }
                }
            })
        });
    }

    // 加载数据
    async loadData() {
        if (!this.isLoggedIn || !this.gistId) return null;

        try {
            const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                headers: {
                    'Authorization': `token ${this.token}`
                }
            });
            
            const gist = await response.json();
            const data = JSON.parse(gist.files['sleep-data.json'].content);
            
            // 将数据保存到本地存储，按日期分开存储
            if (data && typeof data === 'object') {
                Object.keys(data).forEach(date => {
                    localStorage.setItem(`sleep_data_${date}`, JSON.stringify(data[date]));
                });
            }
            
            return data;
        } catch (error) {
            console.error('Load failed:', error);
            return null;
        }
    }
    
    // 添加fetchDataFromGitHub函数，供index.html调用
    async fetchDataFromGitHub() {
        return await this.loadData();
    }
}

// 创建全局实例
const githubSync = new GitHubSync();

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    githubSync.init();
    
    // 绑定登录按钮事件
    const loginBtn = document.getElementById('githubLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            githubSync.login();
        });
    }
    
    // 绑定登出按钮事件
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            githubSync.logout();
            alert('已断开GitHub连接');
            location.reload(); // 刷新页面
        });
    }
});

// 导出fetchDataFromGitHub函数，供index.html调用
window.fetchDataFromGitHub = function(token) {
    if (token && !githubSync.isLoggedIn) {
        githubSync.setToken(token);
    }
    return githubSync.fetchDataFromGitHub();
};

// 导出保存数据的函数
window.saveDataToGitHub = function(data) {
    return githubSync.syncData(data);
};