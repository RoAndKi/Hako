let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    showLoadingState();
    
    try {
        currentUser = await AuthService.getCurrentUser();
        
        if (currentUser) {
            showApp();
            updateUserUI();
        } else {
            showAuth();
        }
    } catch (error) {
        console.error("Init error:", error);
        showAuth();
    }

    initAuthTabs();
    initAuthForms();
    initNavigation();
    initUserMenu();
    
    hideLoadingState();
}

function showLoadingState() {
    document.body.style.opacity = '0.7';
}

function hideLoadingState() {
    document.body.style.opacity = '1';
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
    const indicator = document.querySelector('.tab-indicator');

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) {
                t.classList.remove('active');
            });
            tab.classList.add('active');

            if (tab.dataset.tab === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                indicator.style.transform = 'translateX(0)';
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                indicator.style.transform = 'translateX(100%)';
            }

            hideMessages();
        });
    });
}

function initAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = loginForm.querySelector('.submit-btn');
        btn.classList.add('loading');
        btn.disabled = true;
        hideMessages();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        const result = await AuthService.login(email, password);

        btn.classList.remove('loading');
        btn.disabled = false;

        if (result.success) {
            currentUser = result.user;
            showApp();
            updateUserUI();
            showToast('Добро пожаловать!', 'success');
            loginForm.reset();
        } else {
            showError(result.error);
        }
    });

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = registerForm.querySelector('.submit-btn');
        btn.classList.add('loading');
        btn.disabled = true;
        hideMessages();

        const displayName = document.getElementById('registerDisplayName').value.trim();
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        if (!displayName || !username || !email || !password || !passwordConfirm) {
            btn.classList.remove('loading');
            btn.disabled = false;
            showError('Заполните все поля');
            return;
        }

        if (password !== passwordConfirm) {
            btn.classList.remove('loading');
            btn.disabled = false;
            showError('Пароли не совпадают');
            return;
        }

        if (password.length < 6) {
            btn.classList.remove('loading');
            btn.disabled = false;
            showError('Пароль должен быть минимум 6 символов');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            btn.classList.remove('loading');
            btn.disabled = false;
            showError('Юзернейм может содержать только буквы, цифры и _');
            return;
        }

        if (username.length < 3) {
            btn.classList.remove('loading');
            btn.disabled = false;
            showError('Юзернейм должен быть минимум 3 символа');
            return;
        }

        const result = await AuthService.register(email, password, username, displayName);

        btn.classList.remove('loading');
        btn.disabled = false;

        if (result.success) {
            currentUser = result.user;
            showApp();
            updateUserUI();
            showToast('Аккаунт успешно создан!', 'success');
            registerForm.reset();
        } else {
            showError(result.error);
        }
    });
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(function(item) {
        item.addEventListener('click', function() {
            navItems.forEach(function(i) {
                i.classList.remove('active');
            });
            item.classList.add('active');

            sections.forEach(function(s) {
                s.classList.add('hidden');
            });
            
            const sectionId = item.dataset.section + 'Section';
            document.getElementById(sectionId).classList.remove('hidden');
        });
    });
}

function initUserMenu() {
    const menuBtn = document.getElementById('userMenuBtn');
    const menu = document.getElementById('userMenu');

    if (menuBtn && menu) {
        menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });

        document.addEventListener('click', function(e) {
            if (!menu.contains(e.target) && e.target !== menuBtn) {
                menu.classList.add('hidden');
            }
        });

        document.getElementById('logoutBtn').addEventListener('click', async function() {
            menu.classList.add('hidden');
            const result = await AuthService.logout();
            if (result.success) {
                currentUser = null;
                showAuth();
                showToast('Вы вышли из аккаунта', 'info');
            }
        });

        document.getElementById('copyIdBtn').addEventListener('click', function() {
            copyUserId();
            menu.classList.add('hidden');
        });

        document.getElementById('editProfileBtn').addEventListener('click', function() {
            document.querySelector('[data-section="settings"]').click();
            menu.classList.add('hidden');
        });
    }
}

function updateUserUI() {
    if (!currentUser) return;

    const displayNameEl = document.getElementById('userDisplayName');
    const usernameEl = document.getElementById('userUsername');
    const avatarEl = document.getElementById('userAvatarLetter');
    
    if (displayNameEl) displayNameEl.textContent = currentUser.displayName;
    if (usernameEl) usernameEl.textContent = '@' + currentUser.username;
    if (avatarEl) avatarEl.textContent = currentUser.displayName.charAt(0).toUpperCase();

    const settingsUserId = document.getElementById('settingsUserId');
    const settingsUsername = document.getElementById('settingsUsername');
    const settingsDisplayName = document.getElementById('settingsDisplayName');
    const settingsEmail = document.getElementById('settingsEmail');

    if (settingsUserId) settingsUserId.textContent = currentUser.id;
    if (settingsUsername) settingsUsername.textContent = '@' + currentUser.username;
    if (settingsDisplayName) settingsDisplayName.textContent = currentUser.displayName;
    if (settingsEmail) settingsEmail.textContent = currentUser.email;
}

function showError(message) {
    const errorEl = document.getElementById('authError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function showSuccess(message) {
    const successEl = document.getElementById('authSuccess');
    if (successEl) {
        successEl.textContent = message;
        successEl.classList.remove('hidden');
    }
}

function hideMessages() {
    const errorEl = document.getElementById('authError');
    const successEl = document.getElementById('authSuccess');
    if (errorEl) errorEl.classList.add('hidden');
    if (successEl) successEl.classList.add('hidden');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

function copyUserId() {
    if (!currentUser) return;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentUser.id).then(function() {
            showToast('ID скопирован в буфер обмена', 'success');
        }).catch(function() {
            fallbackCopyText(currentUser.id);
        });
    } else {
        fallbackCopyText(currentUser.id);
    }
}

function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('ID скопирован в буфер обмена', 'success');
    } catch (err) {
        showToast('Не удалось скопировать', 'error');
    }
    document.body.removeChild(textarea);
}

function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    
    var iconSvg = '';
    if (type === 'success') {
        iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
        iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
        iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = '<span class="toast-icon">' + iconSvg + '</span><span>' + message + '</span>';
    container.appendChild(toast);

    setTimeout(function() {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
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

document.addEventListener('DOMContentLoaded', function() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target.id === 'modalOverlay') {
                closeModal();
            }
        });
    }
});

function openUsernameModal() {
    var content = '<form id="usernameForm" onsubmit="handleUsernameSubmit(event)">' +
        '<div class="input-group">' +
        '<input type="text" id="newUsername" required placeholder=" " pattern="[a-zA-Z0-9_]+" minlength="3" maxlength="20">' +
        '<label>Новый юзернейм</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="input-group">' +
        '<input type="password" id="usernamePassword" required placeholder=" ">' +
        '<label>Подтвердите пароль</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="modal-btn secondary" onclick="closeModal()">Отмена</button>' +
        '<button type="submit" class="modal-btn primary">Сохранить</button>' +
        '</div>' +
        '</form>';
    openModal('Изменить юзернейм', content);
}

async function handleUsernameSubmit(e) {
    e.preventDefault();
    const newUsername = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('usernamePassword').value;

    if (!newUsername || !password) {
        showToast('Заполните все поля', 'error');
        return;
    }

    const result = await AuthService.updateUsername(newUsername, password);
    if (result.success) {
        currentUser.username = newUsername.toLowerCase();
        updateUserUI();
        closeModal();
        showToast('Юзернейм изменён', 'success');
    } else {
        showToast(result.error, 'error');
    }
}

function openDisplayNameModal() {
    var currentName = currentUser ? currentUser.displayName : '';
    var content = '<form id="displayNameForm" onsubmit="handleDisplayNameSubmit(event)">' +
        '<div class="input-group">' +
        '<input type="text" id="newDisplayName" required placeholder=" " minlength="2" maxlength="32" value="' + currentName + '">' +
        '<label>Новое имя</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="modal-btn secondary" onclick="closeModal()">Отмена</button>' +
        '<button type="submit" class="modal-btn primary">Сохранить</button>' +
        '</div>' +
        '</form>';
    openModal('Изменить имя', content);
}

async function handleDisplayNameSubmit(e) {
    e.preventDefault();
    const newDisplayName = document.getElementById('newDisplayName').value.trim();

    if (!newDisplayName) {
        showToast('Введите имя', 'error');
        return;
    }

    const result = await AuthService.updateDisplayName(newDisplayName);
    if (result.success) {
        currentUser.displayName = newDisplayName;
        updateUserUI();
        closeModal();
        showToast('Имя изменено', 'success');
    } else {
        showToast(result.error, 'error');
    }
}

function openPasswordModal() {
    var content = '<form id="passwordForm" onsubmit="handlePasswordSubmit(event)">' +
        '<div class="input-group">' +
        '<input type="password" id="currentPassword" required placeholder=" ">' +
        '<label>Текущий пароль</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="input-group">' +
        '<input type="password" id="newPassword" required placeholder=" " minlength="6">' +
        '<label>Новый пароль</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="input-group">' +
        '<input type="password" id="confirmNewPassword" required placeholder=" " minlength="6">' +
        '<label>Подтвердите новый пароль</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="modal-btn secondary" onclick="closeModal()">Отмена</button>' +
        '<button type="submit" class="modal-btn primary">Сохранить</button>' +
        '</div>' +
        '</form>';
    openModal('Изменить пароль', content);
}

async function handlePasswordSubmit(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        showToast('Пароли не совпадают', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('Пароль должен быть минимум 6 символов', 'error');
        return;
    }

    const result = await AuthService.updatePassword(currentPassword, newPassword);
    if (result.success) {
        closeModal();
        showToast('Пароль изменён', 'success');
    } else {
        showToast(result.error, 'error');
    }
}
