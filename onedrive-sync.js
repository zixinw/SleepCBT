// Microsoft认证配置
const msalConfig = {
    auth: {
        clientId: "YOUR_CLIENT_ID", // 需要在Microsoft Azure Portal注册应用获取
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin // 你的网站地址
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

// OneDrive同步类
class OneDriveSync {
    constructor() {
        this.msalInstance = msalInstance;
        this.graphClient = null;
        this.syncFileName = 'sleep-tracker-data.json';
    }

    // 登录
    async login() {
        try {
            const loginResponse = await this.msalInstance.loginPopup({
                scopes: ["Files.ReadWrite"]
            });
            await this.initializeGraphClient(loginResponse.accessToken);
            document.getElementById('syncStatus').textContent = '已连接到OneDrive';
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    }

    // 初始化Graph客户端
    async initializeGraphClient(accessToken) {
        this.graphClient = MicrosoftGraph.Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });
    }

    // 上传数据到OneDrive
    async uploadData() {
        try {
            const data = localStorage.getItem('sleepHistory');
            const file = new Blob([data], { type: 'application/json' });
            
            await this.graphClient.api(`/me/drive/root:/${this.syncFileName}:/content`)
                .put(file);
            
            document.getElementById('syncStatus').textContent = '数据已同步到OneDrive';
            return true;
        } catch (error) {
            console.error('Upload failed:', error);
            return false;
        }
    }

    // 从OneDrive下载数据
    async downloadData() {
        try {
            const response = await this.graphClient.api(`/me/drive/root:/${this.syncFileName}:/content`)
                .get();
            
            const data = await response.text();
            localStorage.setItem('sleepHistory', data);
            
            document.getElementById('syncStatus').textContent = '数据已从OneDrive同步';
            return true;
        } catch (error) {
            if (error.statusCode === 404) {
                // 文件不存在，可能是首次使用
                return false;
            }
            console.error('Download failed:', error);
            return false;
        }
    }

    // 自动同步
    async autoSync() {
        if (!this.graphClient) {
            await this.login();
        }
        
        // 先尝试下载最新数据
        const downloadSuccess = await this.downloadData();
        if (downloadSuccess) {
            // 如果下载成功，刷新页面显示
            location.reload();
        }
        
        // 设置定期同步
        setInterval(async () => {
            await this.uploadData();
        }, 5 * 60 * 1000); // 每5分钟同步一次
    }
} 