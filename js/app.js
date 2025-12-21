let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    currentUser = await AuthService.getCurrentUser();
    
    if (currentUser) {
        showApp();
        updateUserUI();
    } else {
        showAuth();
    }

    initAuthTabs();
    initAuthForms();
    initNavigation();
    initUserMenu();
}

function showAuth() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

function showApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

function initAuthTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (tab.dataset.tab === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
            }

            hideMessages();
        });
    });
}

function initAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('.submit-btn');
        btn.classList.add('loading');
        hideMessages();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const result = await AuthService.login(email, password);

        btn.classList.remove('loading');

        if (result.success) {
            currentUser = result.user;
            showApp();
            updateUserUI();
            showToast('Добро пожаловать!', 'success');
        } else {
            showError(result.error);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = registerForm.querySelector('.submit-btn');
        btn.classList.add('loading');
        hideMessages();

        const displayName = document.getElementById('registerDisplayName').value;
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        if (password !== passwordConfirm) {
            btn.classList.remove('loading');
            showError('Пароли не совпадают');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            btn.classList.remove('loading');
            showError('Юзернейм может содержать только буквы, цифры и _');
            return;
        }

        const result = await AuthService.register(email, password, username, displayName);

        btn.classList.remove('loading');

        if (result.success) {
            currentUser = result.user;
            showApp();
            updateUserUI();
            showToast('Аккаунт успешно создан!', 'success');
        } else {
            showError(result.error);
        }
    });
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(s => s.classList.add('hidden'));
            document.getElementById(`${item.dataset.section}Section`).classList.remove('hidden');
        });
    });
}

function initUserMenu() {
    const menuBtn = document.getElementById('userMenuBtn');
    const menu = document.getElementById('userMenu');

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        menu.classList.add('hidden');
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        const result = await AuthService.logout();
        if (result.success) {
            currentUser = null;
            showAuth();
            showToast('Вы вышли из аккаунта', 'info');
        }
    });

    document.getElementById('copyIdBtn').addEventListener('click', () => {
        copyUserId();
        menu.classList.add('hidden');
    });

    document.getElementById('editProfileBtn').addEventListener('click', () => {
        document.querySelector('[data-section="settings"]').click();
        menu.classList.add('hidden');
    });
}

function updateUserUI() {
    if (!currentUser) return;

    document.getElementById('userDisplayName').textContent = currentUser.displayName;
    document.getElementById('userUsername').textContent = `@${currentUser.username}`;
    document.getElementById('userAvatarLetter').textContent = currentUser.displayName.charAt(0).toUpperCase();

    document.getElementById('settingsUserId').textContent = currentUser.id;
    document.getElementById('settingsUsername').textContent = `@${currentUser.username}`;
    document.getElementById('settingsDisplayName').textContent = currentUser.displayName;
    document.getElementById('settingsEmail').textContent = currentUser.email;
}

function showError(message) {
    const errorEl = document.getElementById('authError');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function showSuccess(message) {
    const successEl = document.getElementById('authSuccess');
    successEl.textContent = message;
    successEl.classList.remove('hidden');
}

function hideMessages() {
    document.getElementById('authError').classList.add('hidden');
    document.getElementById('authSuccess').classList.add('hidden');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function copyUserId() {
    if (!currentUser) return;
    navigator.clipboard.writeText(currentUser.id);
    showToast('ID скопирован в буфер обмена', 'success');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') {
        closeModal();
    }
});

function openUsernameModal() {
    const content = `
        <form id="usernameForm">
            <div class="input-group">
                <input type="text" id="newUsername" required placeholder=" " pattern="[a-zA-Z0-9_]+" minlength="3" maxlength="20">
                <label>Новый юзернейм</label>
                <div class="input-highlight"></div>
            </div>
            <div class="input-group">
                <input type="password" id="usernamePassword" required placeholder=" ">
                <label>Подтвердите пароль</label>
                <div class="input-highlight"></div>
            </div>
            <div class="modal-actions">
                <button type="button" class="modal-btn secondary" onclick="closeModal()">Отмена</button>
                <button type="submit" class="modal-btn primary">Сохранить</button>
            </div>
        </form>
    `;
    openModal('Изменить юзернейм', content);

    document.getElementById('usernameForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('newUsername').value;
        const password = document.getElementById('usernamePassword').value;

        const result = await AuthService.updateUsername(newUsername, password);
        if (result.success) {
            currentUser.username = newUsername.toLowerCase();
            updateUserUI();
            closeModal();
            showToast('Юзернейм изменён', 'success');
        } else {
            showToast(result.error, 'error');
        }
    });
}

function openDisplayNameModal() {
    const content = `
        <form id="displayNameForm">
            <div class="input-group">
                <input type="text" id="newDisplayName" required placeholder=" " minlength="2" maxlength="32" value="${currentUser.displayName}">
                <label>Новое имя</label>
                <div class="input-highlight"></div>
            </div>
            <div class="modal-actions">
                <button type="button" class="modal-btn secondary" onclick="closeModal()">Отмена</button>
                <button type="submit" class="modal-btn primary">Сохранить</button>
            </div>
        </form>
    `;
    openModal('Изменить имя', content);

    document.getElementById('displayNameForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newDisplayName = document.getElementById('newDisplayName').value;

        const result = await AuthService.updateDisplayName(newDisplayName);
        if (result.success) {
            currentUser.displayName = newDisplayName;
            updateUserUI();
            closeModal();
            showToast('Имя изменено', 'success');
        } else {
            showToast(result.error, 'error');
        }
    });
}

function openPasswordModal() {
    const content = `
        <form id="passwordForm">
            <div class="input-group">
                <input type="password" id="currentPassword" required placeholder=" ">
                <label>Текущий пароль</label>
                <div class="input-highlight"></div>
            </div>
            <div class="input-group">
                <input type="password" id="newPassword" required placeholder=" " minlength="6">
                <label>Новый пароль</label>
                <div class="input-highlight"></div>
            </div>
            <div class="input-group">
                <input type="password" id="confirmNewPassword" required placeholder=" " minlength="6">
                <label>Подтвердите новый пароль</label>
                <div class="input-highlight"></div>
            </div>
            <div class="modal-actions">
                <button type="button" class="modal-btn secondary" onclick="closeModal()">Отмена</button>
                <button type="submit" class="modal-btn primary">Сохранить</button>
            </div>
        </form>
    `;
    openModal('Изменить пароль', content);

    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword !== confirmNewPassword) {
            showToast('Пароли не совпадают', 'error');
            return;
        }

        const result = await AuthService.updatePassword(currentPassword, newPassword);
        if (result.success) {
            closeModal();
            showToast('Пароль изменён', 'success');
        } else {
            showToast(result.error, 'error');
        }
    });
}
