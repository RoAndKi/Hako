var currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM загружен, инициализация...");
    initApp();
});

function initApp() {
    AuthService.getCurrentUser().then(function(user) {
        currentUser = user;
        console.log("Текущий пользователь:", currentUser);
        
        if (currentUser) {
            showApp();
            updateUserUI();
        } else {
            showAuth();
        }
        
        initAuthTabs();
        initAuthForms();
        initPasswordToggles();
        initNavigation();
        initUserMenu();
        initSettingsButtons();
        initModal();
    });
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
    var tabs = document.querySelectorAll('.tab-btn');
    var loginForm = document.getElementById('loginForm');
    var registerForm = document.getElementById('registerForm');
    var indicator = document.querySelector('.tab-indicator');

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) {
                t.classList.remove('active');
            });
            tab.classList.add('active');

            if (tab.dataset.tab === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                if (indicator) indicator.style.transform = 'translateX(0)';
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                if (indicator) indicator.style.transform = 'translateX(100%)';
            }

            hideMessages();
        });
    });
}

function initAuthForms() {
    var loginForm = document.getElementById('loginForm');
    var registerForm = document.getElementById('registerForm');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log("Login form submitted");
        
        var btn = loginForm.querySelector('.submit-btn');
        btn.classList.add('loading');
        btn.disabled = true;
        hideMessages();

        var email = document.getElementById('loginEmail').value.trim();
        var password = document.getElementById('loginPassword').value;

        AuthService.login(email, password).then(function(result) {
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
    });

    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log("Register form submitted");
        
        var btn = registerForm.querySelector('.submit-btn');
        btn.classList.add('loading');
        btn.disabled = true;
        hideMessages();

        var displayName = document.getElementById('registerDisplayName').value.trim();
        var username = document.getElementById('registerUsername').value.trim();
        var email = document.getElementById('registerEmail').value.trim();
        var password = document.getElementById('registerPassword').value;
        var passwordConfirm = document.getElementById('registerPasswordConfirm').value;

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

        AuthService.register(email, password, username, displayName).then(function(result) {
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
    });
}

function initPasswordToggles() {
    var toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(function(toggle) {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            var targetId = toggle.getAttribute('data-target');
            var input = document.getElementById(targetId);
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
            }
        });
    });
}

function initNavigation() {
    var navItems = document.querySelectorAll('.nav-item');
    var sections = document.querySelectorAll('.content-section');

    navItems.forEach(function(item) {
        item.addEventListener('click', function() {
            navItems.forEach(function(i) {
                i.classList.remove('active');
            });
            item.classList.add('active');

            sections.forEach(function(s) {
                s.classList.add('hidden');
            });
            
            var sectionId = item.dataset.section + 'Section';
            var section = document.getElementById(sectionId);
            if (section) {
                section.classList.remove('hidden');
            }
        });
    });
}

function initUserMenu() {
    var menuBtn = document.getElementById('userMenuBtn');
    var menu = document.getElementById('userMenu');
    var logoutBtn = document.getElementById('logoutBtn');
    var copyIdBtn = document.getElementById('copyIdBtn');
    var editProfileBtn = document.getElementById('editProfileBtn');

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
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            menu.classList.add('hidden');
            AuthService.logout().then(function(result) {
                if (result.success) {
                    currentUser = null;
                    showAuth();
                    showToast('Вы вышли из аккаунта', 'info');
                }
            });
        });
    }

    if (copyIdBtn) {
        copyIdBtn.addEventListener('click', function() {
            menu.classList.add('hidden');
            copyToClipboard(currentUser.id);
        });
    }

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            menu.classList.add('hidden');
            document.querySelector('[data-section="settings"]').click();
        });
    }
}

function initSettingsButtons() {
    var copyUserIdBtn = document.getElementById('copyUserIdBtn');
    var editUsernameBtn = document.getElementById('editUsernameBtn');
    var editDisplayNameBtn = document.getElementById('editDisplayNameBtn');
    var editPasswordBtn = document.getElementById('editPasswordBtn');

    if (copyUserIdBtn) {
        copyUserIdBtn.addEventListener('click', function() {
            if (currentUser) {
                copyToClipboard(currentUser.id);
            }
        });
    }

    if (editUsernameBtn) {
        editUsernameBtn.addEventListener('click', function() {
            openUsernameModal();
        });
    }

    if (editDisplayNameBtn) {
        editDisplayNameBtn.addEventListener('click', function() {
            openDisplayNameModal();
        });
    }

    if (editPasswordBtn) {
        editPasswordBtn.addEventListener('click', function() {
            openPasswordModal();
        });
    }
}

function initModal() {
    var modalOverlay = document.getElementById('modalOverlay');
    var modalCloseBtn = document.getElementById('modalCloseBtn');

    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', function() {
            closeModal();
        });
    }
}

function updateUserUI() {
    if (!currentUser) return;

    var displayNameEl = document.getElementById('userDisplayName');
    var usernameEl = document.getElementById('userUsername');
    var avatarEl = document.getElementById('userAvatarLetter');
    
    if (displayNameEl) displayNameEl.textContent = currentUser.displayName;
    if (usernameEl) usernameEl.textContent = '@' + currentUser.username;
    if (avatarEl) avatarEl.textContent = currentUser.displayName.charAt(0).toUpperCase();

    var settingsUserId = document.getElementById('settingsUserId');
    var settingsUsername = document.getElementById('settingsUsername');
    var settingsDisplayName = document.getElementById('settingsDisplayName');
    var settingsEmail = document.getElementById('settingsEmail');

    if (settingsUserId) settingsUserId.textContent = currentUser.id;
    if (settingsUsername) settingsUsername.textContent = '@' + currentUser.username;
    if (settingsDisplayName) settingsDisplayName.textContent = currentUser.displayName;
    if (settingsEmail) settingsEmail.textContent = currentUser.email;
}

function showError(message) {
    var errorEl = document.getElementById('authError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function hideMessages() {
    var errorEl = document.getElementById('authError');
    var successEl = document.getElementById('authSuccess');
    if (errorEl) errorEl.classList.add('hidden');
    if (successEl) successEl.classList.add('hidden');
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            showToast('Скопировано в буфер обмена', 'success');
        }).catch(function() {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('Скопировано в буфер обмена', 'success');
    } catch (err) {
        showToast('Не удалось скопировать', 'error');
    }
    document.body.removeChild(textarea);
}

function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
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
                toast.parentNode.removeChild(toast);
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

function openUsernameModal() {
    var content = 
        '<form id="usernameModalForm">' +
        '<div class="input-group">' +
        '<input type="text" id="newUsernameInput" required minlength="3" maxlength="20">' +
        '<label>Новый юзернейм</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="input-group">' +
        '<input type="password" id="usernamePasswordInput" required>' +
        '<label>Ваш пароль</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="modal-btn secondary" id="cancelUsernameBtn">Отмена</button>' +
        '<button type="submit" class="modal-btn primary">Сохранить</button>' +
        '</div>' +
        '</form>';
    
    openModal('Изменить юзернейм', content);

    document.getElementById('cancelUsernameBtn').addEventListener('click', closeModal);
    
    document.getElementById('usernameModalForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var newUsername = document.getElementById('newUsernameInput').value.trim();
        var password = document.getElementById('usernamePasswordInput').value;

        if (!newUsername || !password) {
            showToast('Заполните все поля', 'error');
            return;
        }

        AuthService.updateUsername(newUsername, password).then(function(result) {
            if (result.success) {
                currentUser.username = newUsername.toLowerCase();
                updateUserUI();
                closeModal();
                showToast('Юзернейм изменён', 'success');
            } else {
                showToast(result.error, 'error');
            }
        });
    });
}

function openDisplayNameModal() {
    var currentName = currentUser ? currentUser.displayName : '';
    var content = 
        '<form id="displayNameModalForm">' +
        '<div class="input-group">' +
        '<input type="text" id="newDisplayNameInput" required minlength="2" maxlength="32" value="' + currentName + '">' +
        '<label>Новое имя</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="modal-btn secondary" id="cancelDisplayNameBtn">Отмена</button>' +
        '<button type="submit" class="modal-btn primary">Сохранить</button>' +
        '</div>' +
        '</form>';
    
    openModal('Изменить имя', content);

    document.getElementById('cancelDisplayNameBtn').addEventListener('click', closeModal);
    
    document.getElementById('displayNameModalForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var newDisplayName = document.getElementById('newDisplayNameInput').value.trim();

        if (!newDisplayName) {
            showToast('Введите имя', 'error');
            return;
        }

        AuthService.updateDisplayName(newDisplayName).then(function(result) {
            if (result.success) {
                currentUser.displayName = newDisplayName;
                updateUserUI();
                closeModal();
                showToast('Имя изменено', 'success');
            } else {
                showToast(result.error, 'error');
            }
        });
    });
}

function openPasswordModal() {
    var content = 
        '<form id="passwordModalForm">' +
        '<div class="input-group">' +
        '<input type="password" id="currentPasswordInput" required>' +
        '<label>Текущий пароль</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="input-group">' +
        '<input type="password" id="newPasswordInput" required minlength="6">' +
        '<label>Новый пароль</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="input-group">' +
        '<input type="password" id="confirmPasswordInput" required minlength="6">' +
        '<label>Подтвердите пароль</label>' +
        '<div class="input-highlight"></div>' +
        '</div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="modal-btn secondary" id="cancelPasswordBtn">Отмена</button>' +
        '<button type="submit" class="modal-btn primary">Сохранить</button>' +
        '</div>' +
        '</form>';
    
    openModal('Изменить пароль', content);

    document.getElementById('cancelPasswordBtn').addEventListener('click', closeModal);
    
    document.getElementById('passwordModalForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var currentPassword = document.getElementById('currentPasswordInput').value;
        var newPassword = document.getElementById('newPasswordInput').value;
        var confirmPassword = document.getElementById('confirmPasswordInput').value;

        if (newPassword !== confirmPassword) {
            showToast('Пароли не совпадают', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showToast('Пароль должен быть минимум 6 символов', 'error');
            return;
        }

        AuthService.updatePassword(currentPassword, newPassword).then(function(result) {
            if (result.success) {
                closeModal();
                showToast('Пароль изменён', 'success');
            } else {
                showToast(result.error, 'error');
            }
        });
    });
}
