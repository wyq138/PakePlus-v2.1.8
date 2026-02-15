const ACCOUNTS_KEY = 'animal_hospital_accounts';
const CURRENT_USER_KEY = 'animal_hospital_current_user';
const STORAGE_FILE = 'accounts.json';

function getStoragePath() {
    if (window.__TAURI__) {
        return window.__TAURI__.path.join(window.__TAURI__.path.appDataDir(), STORAGE_FILE);
    }
    return null;
}

async function readStorageFile() {
    try {
        if (window.__TAURI__) {
            const fs = window.__TAURI__.fs;
            const path = await getStoragePath();
            
            if (await fs.exists(path)) {
                const content = await fs.readTextFile(path);
                return JSON.parse(content);
            }
            return {};
        }
    } catch (error) {
        console.error('Error reading storage file:', error);
    }
    return {};
}

async function writeStorageFile(data) {
    try {
        if (window.__TAURI__) {
            const fs = window.__TAURI__.fs;
            const path = await getStoragePath();
            const dir = await window.__TAURI__.path.appDataDir();
            
            if (!(await fs.exists(dir))) {
                await fs.createDir(dir, { recursive: true });
            }
            
            await fs.writeTextFile(path, JSON.stringify(data, null, 2));
            return true;
        }
    } catch (error) {
        console.error('Error writing storage file:', error);
    }
    return false;
}

function getAccounts() {
    const accounts = localStorage.getItem(ACCOUNTS_KEY);
    return accounts ? JSON.parse(accounts) : [];
}

async function saveAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    await writeStorageFile({ [ACCOUNTS_KEY]: accounts });
}

function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
}

async function initStorage() {
    if (window.__TAURI__) {
        const storageData = await readStorageFile();
        if (storageData[ACCOUNTS_KEY]) {
            localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(storageData[ACCOUNTS_KEY]));
        }
    }
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type} show`;
    
    const duration = type === 'success' && message.includes('导出到') ? 10000 : 3000;
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, duration);
}

function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'manage') {
        renderAccountList();
    }
}

function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showMessage('请输入用户名和密码', 'error');
        return;
    }
    
    const accounts = getAccounts();
    const account = accounts.find(acc => acc.username === username && acc.password === password);
    
    if (account) {
        setCurrentUser(account);
        showMessage('登录成功！', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        showMessage('用户名或密码错误', 'error');
    }
}

async function createAccount() {
    const username = document.getElementById('create-username').value.trim();
    const password = document.getElementById('create-password').value;
    const confirmPassword = document.getElementById('create-confirm-password').value;
    const role = document.getElementById('create-role').value;
    
    if (!username || !password) {
        showMessage('请输入用户名和密码', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('两次输入的密码不一致', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('密码长度至少为6位', 'error');
        return;
    }
    
    const accounts = getAccounts();
    
    if (accounts.find(acc => acc.username === username)) {
        showMessage('该用户名已存在', 'error');
        return;
    }
    
    const newAccount = {
        id: Date.now().toString(),
        username: username,
        password: password,
        role: role,
        createdAt: new Date().toISOString()
    };
    
    accounts.push(newAccount);
    await saveAccounts(accounts);
    
    showMessage('账号创建成功！', 'success');
    
    document.getElementById('create-username').value = '';
    document.getElementById('create-password').value = '';
    document.getElementById('create-confirm-password').value = '';
}

function renderAccountList() {
    const accounts = getAccounts();
    const accountList = document.getElementById('account-list');
    
    if (accounts.length === 0) {
        accountList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <p>暂无账号</p>
            </div>
        `;
        return;
    }
    
    accountList.innerHTML = accounts.map(account => `
        <div class="account-item">
            <div class="account-info">
                <div class="account-name">${account.username}</div>
                <div class="account-role">${account.role === 'admin' ? '管理员' : '医生'} - ${new Date(account.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="account-actions">
                <button class="btn-small btn-delete" onclick="deleteAccount('${account.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

async function deleteAccount(accountId) {
    if (!confirm('确定要删除该账号吗？')) {
        return;
    }
    
    const accounts = getAccounts();
    const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
    await saveAccounts(filteredAccounts);
    
    showMessage('账号删除成功！', 'success');
    renderAccountList();
}

async function exportAccounts() {
    const accounts = getAccounts();
    
    if (accounts.length === 0) {
        showMessage('暂无账号数据可导出', 'error');
        return;
    }
    
    try {
        const dataStr = JSON.stringify(accounts, null, 2);
        const fileName = `accounts_${new Date().toISOString().split('T')[0]}.json`;
        
        if (window.__TAURI__) {
            const { save } = window.__TAURI__.dialog;
            const { writeTextFile } = window.__TAURI__.fs;
            
            const filePath = await save({
                defaultPath: fileName,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (filePath) {
                await writeTextFile(filePath, dataStr);
                showMessage(`账号数据已导出到：${filePath}`, 'success');
            }
        } else {
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            
            URL.revokeObjectURL(url);
            showMessage('账号数据导出成功！', 'success');
        }
    } catch (error) {
        console.error('Export error:', error);
        showMessage('导出失败：' + error.message, 'error');
    }
}

async function importAccounts() {
    try {
        if (window.__TAURI__) {
            const { open } = window.__TAURI__.dialog;
            const { readTextFile } = window.__TAURI__.fs;
            
            const selected = await open({
                multiple: false,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (selected) {
                const content = await readTextFile(selected);
                processImportData(content);
            }
        } else {
            const fileInput = document.getElementById('import-file');
            const file = fileInput.files[0];
            
            if (!file) {
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                processImportData(e.target.result);
            };
            reader.readAsText(file);
            fileInput.value = '';
        }
    } catch (error) {
        console.error('Import error:', error);
        showMessage('导入失败：' + error.message, 'error');
    }
}

async function processImportData(dataStr) {
    try {
        const importedAccounts = JSON.parse(dataStr);
        
        if (!Array.isArray(importedAccounts)) {
            showMessage('导入文件格式错误', 'error');
            return;
        }
        
        const existingAccounts = getAccounts();
        const existingUsernames = existingAccounts.map(acc => acc.username);
        
        let newCount = 0;
        let duplicateCount = 0;
        
        importedAccounts.forEach(account => {
            if (!existingUsernames.includes(account.username)) {
                existingAccounts.push(account);
                newCount++;
            } else {
                duplicateCount++;
            }
        });
        
        await saveAccounts(existingAccounts);
        
        let message = `导入完成！新增 ${newCount} 个账号`;
        if (duplicateCount > 0) {
            message += `，跳过 ${duplicateCount} 个重复账号`;
        }
        
        showMessage(message, 'success');
        renderAccountList();
    } catch (error) {
        showMessage('导入文件格式错误', 'error');
    }
}

function checkAuth() {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

function logout() {
    clearCurrentUser();
    window.location.href = 'login.html';
}

function updateNavWithUserInfo() {
    const user = getCurrentUser();
    
    if (user) {
        const navLinks = document.querySelector('.nav-links');
        
        if (navLinks) {
            const userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            userInfo.innerHTML = `
                <span class="user-name">${user.username}</span>
                <span class="user-role">(${user.role === 'admin' ? '管理员' : '医生'})</span>
                <button class="btn-logout" onclick="logout()">退出</button>
            `;
            
            navLinks.appendChild(userInfo);
        }
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    await initStorage();
    
    if (window.location.pathname.includes('login.html')) {
        return;
    }
    
    checkAuth();
    updateNavWithUserInfo();
});
