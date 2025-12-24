var currentUser = null;
var pendingVerificationEmail = null;
var currentChatId = null;
var currentChatFriendId = null;
var currentChatFriend = null;
var chatUnsubscribe = null;
var replyingTo = null;
var pendingAttachment = null;
var contextMenu = null;

document.addEventListener('DOMContentLoaded', function() {
    initApp();
    initContextMenuClose();
    disableRightClick();
});

function disableRightClick() {
    document.addEventListener('contextmenu', function(e) {
        if (!e.target.closest('.message')) {
            e.preventDefault();
        }
    });
}

function initContextMenuClose() {
    document.addEventListener('click', function() {
        closeContextMenu();
    });
}

function closeContextMenu() {
    if (contextMenu && contextMenu.parentNode) {
        contextMenu.parentNode.removeChild(contextMenu);
        contextMenu = null;
    }
}

function initApp() {
    AuthService.getCurrentUser().then(function(result) {
        if (result && result.needsVerification) {
            pendingVerificationEmail = result.email;
            showVerification(result.email);
        } else if (result && result.id) {
            currentUser = result;
            showApp();
            updateUserUI();
            loadChatsList();
            startPresence();
        } else {
            showAuth();
        }
        
        initAuthTabs();
        initAuthForms();
        initPasswordToggles();
        initNavigation();
        initUserMenu();
        initModal();
        initVerification();
        initMobileNav();
        initProfileSection();
        initFriendsSection();
    });
}

function startPresence() {
    if (!currentUser) return;
    
    db.collection('users').doc(currentUser.id).update({
        status: 'online',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });

    window.addEventListener('beforeunload', function() {
        if (currentUser) {
            navigator.sendBeacon && db.collection('users').doc(currentUser.id).update({
                status: 'offline',
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });

    setInterval(function() {
        if (currentUser) {
            db.collection('users').doc(currentUser.id).update({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }, 60000);
}

function showAuth() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('verifyContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

function showVerification(email) {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('verifyContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    var verifyEmailEl = document.getElementById('verifyEmail');
    if (verifyEmailEl) verifyEmailEl.textContent = email;
}

function showApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('verifyContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

function initAuthTabs() {
    var tabs = document.querySelectorAll('.tab-btn');
    var loginForm = document.getElementById('loginForm');
    var registerForm = document.getElementById('registerForm');
    var indicator = document.querySelector('.tab-indicator');

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
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
                loadChatsList();
                startPresence();
                showToast('Добро пожаловать!', 'success');
                loginForm.reset();
            } else if (result.needsVerification) {
                pendingVerificationEmail = result.email;
                showVerification(result.email);
            } else {
                showError(result.error);
            }
        });
    });

    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
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

        if (!AuthService.validateEmail(email)) {
            btn.classList.remove('loading');
            btn.disabled = false;
            showError('Введите корректный email');
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
            showError('Пароль минимум 6 символов');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username) || username.length < 3) {
            btn.classList.remove('loading');
            btn.disabled = false;
            showError('Юзернейм: минимум 3 символа (a-z, 0-9, _)');
            return;
        }

        AuthService.register(email, password, username, displayName).then(function(result) {
            btn.classList.remove('loading');
            btn.disabled = false;

            if (result.success) {
                pendingVerificationEmail = email;
                showVerification(email);
                showToast('Проверьте почту', 'success');
                registerForm.reset();
            } else {
                showError(result.error);
            }
        });
    });
}

function initVerification() {
    var resendBtn = document.getElementById('resendEmailBtn');
    var checkBtn = document.getElementById('checkVerificationBtn');
    var backBtn = document.getElementById('backToLoginBtn');

    if (resendBtn) {
        resendBtn.addEventListener('click', function() {
            resendBtn.classList.add('loading');
            resendBtn.disabled = true;
            AuthService.resendVerificationEmail().then(function(result) {
                resendBtn.classList.remove('loading');
                resendBtn.disabled = false;
                showToast(result.success ? 'Письмо отправлено' : result.error, result.success ? 'success' : 'error');
            });
        });
    }

    if (checkBtn) {
        checkBtn.addEventListener('click', function() {
            checkBtn.classList.add('loading');
            checkBtn.disabled = true;
            AuthService.checkEmailVerification().then(function(result) {
                checkBtn.classList.remove('loading');
                checkBtn.disabled = false;
                if (result.success && result.verified) {
                    currentUser = result.user;
                    showApp();
                    updateUserUI();
                    loadChatsList();
                    startPresence();
                    showToast('Email подтверждён!', 'success');
                } else {
                    showToast(result.verified === false ? 'Email не подтверждён' : result.error, 'error');
                }
            });
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', function() {
            AuthService.logout().then(function() { showAuth(); });
        });
    }
}

function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            var input = document.getElementById(toggle.getAttribute('data-target'));
            if (input) input.type = input.type === 'password' ? 'text' : 'password';
        });
    });
}

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(function(item) {
        item.addEventListener('click', function() {
            var section = item.dataset.section;
            closeChat();
            
            document.querySelectorAll('.nav-item').forEach(function(i) { i.classList.remove('active'); });
            item.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(function(s) { s.classList.remove('active'); });
            var sectionEl = document.getElementById(section + 'Section');
            if (sectionEl) sectionEl.classList.add('active');

            if (section === 'chats') showChatsListView();
            else if (section === 'friends') loadFriends();
            
            updateMobileNav(section);
        });
    });
}

function initMobileNav() {
    var mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-section]');
    var mobileProfileBtn = document.getElementById('mobileProfileBtn');

    mobileNavItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var section = item.dataset.section;
            closeChat();
            
            mobileNavItems.forEach(function(i) { i.classList.remove('active'); });
            if (mobileProfileBtn) mobileProfileBtn.classList.remove('active');
            item.classList.add('active');

            document.querySelectorAll('.content-section').forEach(function(s) { s.classList.remove('active'); });
            var sectionEl = document.getElementById(section + 'Section');
            if (sectionEl) sectionEl.classList.add('active');

            document.querySelectorAll('.nav-item').forEach(function(n) {
                n.classList.remove('active');
                if (n.dataset.section === section) n.classList.add('active');
            });

            if (section === 'chats') showChatsListView();
            else if (section === 'friends') loadFriends();
        });
    });

    if (mobileProfileBtn) {
        mobileProfileBtn.addEventListener('click', function() {
            closeChat();
            mobileNavItems.forEach(function(i) { i.classList.remove('active'); });
            mobileProfileBtn.classList.add('active');
            document.querySelectorAll('.content-section').forEach(function(s) { s.classList.remove('active'); });
            document.getElementById('profileSection').classList.add('active');
            updateProfileUI();
            document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
        });
    }
}

function updateMobileNav(section) {
    document.querySelectorAll('.mobile-nav-item').forEach(function(item) {
        item.classList.remove('active');
        if (item.dataset.section === section) item.classList.add('active');
    });
    var mobileProfileBtn = document.getElementById('mobileProfileBtn');
    if (mobileProfileBtn) mobileProfileBtn.classList.remove('active');
}

function initUserMenu() {
    var menuBtn = document.getElementById('userMenuBtn');
    var menu = document.getElementById('userMenu');

    if (menuBtn && menu) {
        menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            updateCompactProfileMenu();
            menu.classList.toggle('hidden');
        });

        document.addEventListener('click', function(e) {
            if (!menu.contains(e.target) && e.target !== menuBtn) {
                menu.classList.add('hidden');
            }
        });
    }
}

function updateCompactProfileMenu() {
    var menu = document.getElementById('userMenu');
    if (!menu || !currentUser) return;

    var avatarContent = currentUser.avatar 
        ? '<img src="' + currentUser.avatar + '" alt="">'
        : '<span>' + currentUser.displayName.charAt(0).toUpperCase() + '</span>';

    menu.innerHTML = 
        '<div class="compact-profile-menu">' +
            '<div class="compact-profile-header">' +
                '<div class="compact-avatar-container">' +
                    '<div class="compact-avatar">' + avatarContent + '</div>' +
                    '<label class="compact-photo-edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><input type="file" accept="image/*" id="menuPhotoInput"></label>' +
                '</div>' +
                '<div class="compact-user-info">' +
                    '<div class="compact-displayname">' + currentUser.displayName + '</div>' +
                    '<div class="compact-username">@' + currentUser.username + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="compact-menu-items">' +
                '<button type="button" class="menu-item" id="showProfileBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Мой профиль</span></button>' +
                '<button type="button" class="menu-item" id="copyIdBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Скопировать ID</span></button>' +
                '<div class="menu-divider"></div>' +
                '<button type="button" class="menu-item" id="editDisplayNameBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><span>Изменить имя</span></button>' +
                '<button type="button" class="menu-item" id="editUsernameBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg><span>Изменить юзернейм</span></button>' +
                '<button type="button" class="menu-item" id="editPasswordBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Изменить пароль</span></button>' +
                '<div class="menu-divider"></div>' +
                '<button type="button" class="menu-item danger" id="logoutBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span>Выйти</span></button>' +
            '</div>' +
        '</div>';

    document.getElementById('menuPhotoInput').addEventListener('change', function(e) {
        handlePhotoUpload(e.target.files[0]);
        menu.classList.add('hidden');
    });
    document.getElementById('showProfileBtn').addEventListener('click', function() { menu.classList.add('hidden'); showProfileSection(); });
    document.getElementById('copyIdBtn').addEventListener('click', function() { menu.classList.add('hidden'); copyToClipboard(currentUser.id); });
    document.getElementById('editDisplayNameBtn').addEventListener('click', function() { menu.classList.add('hidden'); openDisplayNameModal(); });
    document.getElementById('editUsernameBtn').addEventListener('click', function() { menu.classList.add('hidden'); openUsernameModal(); });
    document.getElementById('editPasswordBtn').addEventListener('click', function() { menu.classList.add('hidden'); openPasswordModal(); });
    document.getElementById('logoutBtn').addEventListener('click', function() {
        menu.classList.add('hidden');
        db.collection('users').doc(currentUser.id).update({ status: 'offline', lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
        AuthService.logout().then(function() { currentUser = null; closeChat(); showAuth(); showToast('Вы вышли', 'info'); });
    });
}

function handlePhotoUpload(file) {
    if (!file || !file.type.startsWith('image/')) { showToast('Выберите изображение', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Макс. 5MB', 'error'); return; }

    showToast('Загрузка...', 'info');
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var max = 200, w = img.width, h = img.height;
            if (w > h) { if (w > max) { h *= max / w; w = max; } }
            else { if (h > max) { w *= max / h; h = max; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            var base64 = canvas.toDataURL('image/jpeg', 0.8);
            db.collection('users').doc(currentUser.id).update({ avatar: base64 }).then(function() {
                currentUser.avatar = base64;
                updateUserUI();
                showToast('Фото обновлено!', 'success');
            }).catch(function() { showToast('Ошибка', 'error'); });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function showProfileSection() {
    closeChat();
    document.querySelectorAll('.content-section').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('profileSection').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    updateMobileNav('profile');
    var btn = document.getElementById('mobileProfileBtn');
    if (btn) btn.classList.add('active');
    updateProfileUI();
}

function initProfileSection() {
    var backBtn = document.getElementById('backFromProfileBtn');
    if (backBtn) backBtn.addEventListener('click', function() {
        document.getElementById('profileSection').classList.remove('active');
        document.getElementById('chatsSection').classList.add('active');
        var nav = document.querySelector('[data-section="chats"]');
        if (nav) nav.classList.add('active');
        updateMobileNav('chats');
        showChatsListView();
    });

    var copyBtn = document.getElementById('profileCopyIdBtn');
    if (copyBtn) copyBtn.addEventListener('click', function() { if (currentUser) copyToClipboard(currentUser.id); });

    var editName = document.getElementById('profileEditDisplayNameBtn');
    if (editName) editName.addEventListener('click', openDisplayNameModal);

    var editUser = document.getElementById('profileEditUsernameBtn');
    if (editUser) editUser.addEventListener('click', openUsernameModal);

    var editPass = document.getElementById('profileEditPasswordBtn');
    if (editPass) editPass.addEventListener('click', openPasswordModal);

    var logout = document.getElementById('profileLogoutBtn');
    if (logout) logout.addEventListener('click', function() {
        db.collection('users').doc(currentUser.id).update({ status: 'offline', lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
        AuthService.logout().then(function() { currentUser = null; closeChat(); showAuth(); showToast('Вы вышли', 'info'); });
    });
}

function updateProfileUI() {
    if (!currentUser) return;

    var container = document.querySelector('.profile-photo-container');
    if (container) {
        var avatarContent = currentUser.avatar 
            ? '<img src="' + currentUser.avatar + '" alt="">'
            : '<span>' + currentUser.displayName.charAt(0).toUpperCase() + '</span>';
        container.innerHTML = '<div class="profile-avatar-large">' + avatarContent + '</div><label class="profile-photo-edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><input type="file" accept="image/*" id="profilePhotoInput"></label>';
        document.getElementById('profilePhotoInput').addEventListener('change', function(e) { handlePhotoUpload(e.target.files[0]); });
    }

    var el = document.getElementById;
    if (document.getElementById('profileDisplayName')) document.getElementById('profileDisplayName').textContent = currentUser.displayName;
    if (document.getElementById('profileUsername')) document.getElementById('profileUsername').textContent = '@' + currentUser.username;
    if (document.getElementById('profileUserId')) document.getElementById('profileUserId').textContent = currentUser.id;
    if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = currentUser.email;
    
    var createdAt = document.getElementById('profileCreatedAt');
    if (createdAt && currentUser.createdAt && currentUser.createdAt.toDate) {
        createdAt.textContent = currentUser.createdAt.toDate().toLocaleDateString('ru-RU');
    }
}

function initFriendsSection() {
    var addBtn = document.getElementById('addFriendBtn');
    if (addBtn) addBtn.addEventListener('click', openAddFriendModal);

    document.querySelectorAll('.friends-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.friends-tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            var name = tab.dataset.tab;
            document.querySelectorAll('.friends-content').forEach(function(c) { c.classList.add('hidden'); });
            var target = document.getElementById(name + 'Content');
            if (target) target.classList.remove('hidden');
            if (name === 'all') loadFriends();
            else if (name === 'pending') loadFriendRequests();
        });
    });
}

function loadFriends() {
    if (!currentUser) return;
    var container = document.getElementById('friendsList');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"></div>';

    db.collection('users').doc(currentUser.id).get().then(function(doc) {
        var data = doc.data();
        currentUser.friends = data.friends || [];
        currentUser.friendRequests = data.friendRequests || [];

        if (currentUser.friends.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><h3>Нет друзей</h3><p>Добавьте друзей</p></div>';
            return;
        }

        Promise.all(currentUser.friends.map(function(id) { return db.collection('users').doc(id).get(); })).then(function(docs) {
            container.innerHTML = '';
            docs.forEach(function(d) { if (d.exists) container.appendChild(createFriendElement(d.data())); });
        });
    }).catch(function() { container.innerHTML = '<p class="search-error">Ошибка</p>'; });
}

function createFriendElement(friend) {
    var avatar = friend.avatar ? '<img src="' + friend.avatar + '" alt="">' : '<span>' + friend.displayName.charAt(0).toUpperCase() + '</span>';
    var div = document.createElement('div');
    div.className = 'friend-item';
    div.innerHTML = '<div class="friend-avatar">' + avatar + '</div><div class="friend-info"><span class="friend-name">' + friend.displayName + '</span><span class="friend-username">@' + friend.username + '</span></div><div class="friend-actions"><button type="button" class="friend-action-btn chat-btn" title="Написать"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button><button type="button" class="friend-action-btn remove-btn" title="Удалить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';

    div.querySelector('.chat-btn').addEventListener('click', function(e) { e.stopPropagation(); openChat(friend.id); });
    div.querySelector('.remove-btn').addEventListener('click', function(e) { e.stopPropagation(); removeFriend(friend.id); });
    return div;
}

function loadFriendRequests() {
    if (!currentUser) return;
    var container = document.getElementById('pendingList');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"></div>';

    db.collection('users').doc(currentUser.id).get().then(function(doc) {
        var requests = doc.data().friendRequests || [];
        if (requests.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg></div><h3>Нет заявок</h3></div>';
            return;
        }
        Promise.all(requests.map(function(id) { return db.collection('users').doc(id).get(); })).then(function(docs) {
            container.innerHTML = '';
            docs.forEach(function(d) { if (d.exists) container.appendChild(createRequestElement(d.data())); });
        });
    }).catch(function() { container.innerHTML = '<p class="search-error">Ошибка</p>'; });
}

function createRequestElement(user) {
    var avatar = user.avatar ? '<img src="' + user.avatar + '" alt="">' : '<span>' + user.displayName.charAt(0).toUpperCase() + '</span>';
    var div = document.createElement('div');
    div.className = 'request-item';
    div.innerHTML = '<div class="friend-avatar">' + avatar + '</div><div class="friend-info"><span class="friend-name">' + user.displayName + '</span><span class="friend-username">@' + user.username + '</span></div><div class="friend-actions"><button type="button" class="friend-action-btn accept-btn" title="Принять"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></button><button type="button" class="friend-action-btn decline-btn" title="Отклонить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';

    div.querySelector('.accept-btn').addEventListener('click', function(e) { e.stopPropagation(); acceptFriendRequest(user.id); });
    div.querySelector('.decline-btn').addEventListener('click', function(e) { e.stopPropagation(); declineFriendRequest(user.id); });
    return div;
}

function getChatId(oderId) {
    return [currentUser.id, oderId].sort().join('_');
}

function closeChat() {
    if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
    currentChatId = null;
    currentChatFriendId = null;
    currentChatFriend = null;
    replyingTo = null;
    pendingAttachment = null;
}

function openChat(friendId) {
    closeChat();
    currentChatFriendId = friendId;
    currentChatId = getChatId(friendId);

    db.collection('users').doc(friendId).get().then(function(doc) {
        if (!doc.exists) { showToast('Не найден', 'error'); return; }
        
        var friend = doc.data();
        currentChatFriend = friend;
        
        var avatar = friend.avatar ? '<img src="' + friend.avatar + '" alt="">' : '<span>' + friend.displayName.charAt(0).toUpperCase() + '</span>';
        var statusText = friend.status === 'online' ? '<span class="status-dot online"></span>в сети' : '<span class="status-dot offline"></span>' + formatLastSeen(friend.lastSeen);

        document.querySelectorAll('.content-section').forEach(function(s) { s.classList.remove('active'); });
        var chatSection = document.getElementById('chatsSection');
        chatSection.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
        var nav = document.querySelector('[data-section="chats"]');
        if (nav) nav.classList.add('active');
        updateMobileNav('chats');

        chatSection.innerHTML = 
            '<div class="chat-container">' +
                '<div class="chat-header glass-panel">' +
                    '<button type="button" class="header-btn" id="backToChatsBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>' +
                    '<div class="chat-header-clickable" id="openFriendProfile">' +
                        '<div class="friend-avatar">' + avatar + '</div>' +
                        '<div class="chat-header-info"><div class="chat-header-name">' + friend.displayName + '</div><div class="chat-header-status">' + statusText + '</div></div>' +
                    '</div>' +
                '</div>' +
                '<div class="chat-messages" id="chatMessages"><div class="loading-spinner"></div></div>' +
                '<div id="replyPreviewContainer"></div>' +
                '<div id="attachmentPreviewContainer"></div>' +
                '<div class="chat-input-container" style="padding: 16px 24px; border-top: 1px solid var(--glass-border);">' +
                    '<div class="chat-input-wrapper">' +
                        '<label class="attach-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg><input type="file" id="attachmentInput" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"></label>' +
                        '<input type="text" class="chat-input" id="chatInput" placeholder="Сообщение...">' +
                        '<button type="button" class="chat-send-btn" id="sendMessageBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.getElementById('backToChatsBtn').addEventListener('click', function() { closeChat(); showChatsListView(); });
        document.getElementById('openFriendProfile').addEventListener('click', function() { openUserProfileModal(friend); });
        document.getElementById('sendMessageBtn').addEventListener('click', function() { sendMessage(); });
        document.getElementById('chatInput').addEventListener('keypress', function(e) { if (e.key === 'Enter') sendMessage(); });
        document.getElementById('attachmentInput').addEventListener('change', function(e) { handleAttachment(e.target.files[0]); });
        document.getElementById('chatInput').focus();

        db.collection('chats').doc(currentChatId).set({ participants: [currentUser.id, friendId], updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

        loadMessages();
        markMessagesAsRead();

    }).catch(function(e) { console.error(e); showToast('Ошибка', 'error'); });
}

function formatLastSeen(timestamp) {
    if (!timestamp || !timestamp.toDate) return 'был(а) давно';
    var date = timestamp.toDate();
    var now = new Date();
    var diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'был(а) только что';
    if (diff < 3600) return 'был(а) ' + Math.floor(diff / 60) + ' мин назад';
    if (diff < 86400) return 'был(а) ' + Math.floor(diff / 3600) + ' ч назад';
    return 'был(а) ' + date.toLocaleDateString('ru-RU');
}

function openUserProfileModal(user) {
    var avatar = user.avatar ? '<img src="' + user.avatar + '" alt="">' : '<span>' + user.displayName.charAt(0).toUpperCase() + '</span>';
    var statusText = user.status === 'online' ? '<span class="status-dot online"></span> В сети' : '<span class="status-dot offline"></span> ' + formatLastSeen(user.lastSeen);

    var content = 
        '<div class="user-profile-modal">' +
            '<div class="profile-avatar-large">' + avatar + '</div>' +
            '<div class="profile-displayname">' + user.displayName + '</div>' +
            '<div class="profile-username-display">@' + user.username + '</div>' +
            '<div class="user-profile-status">' + statusText + '</div>' +
            '<div class="user-profile-actions">' +
                '<button type="button" class="modal-btn primary" id="sendMsgBtn">Написать</button>' +
                '<button type="button" class="modal-btn secondary" id="copyUserIdBtn">Скопировать ID</button>' +
            '</div>' +
        '</div>';

    openModal(user.displayName, content);
    document.getElementById('sendMsgBtn').addEventListener('click', function() { closeModal(); openChat(user.id); });
    document.getElementById('copyUserIdBtn').addEventListener('click', function() { copyToClipboard(user.id); });
}

function loadMessages(friendId) {
    var chatId = getChatId(friendId);
    var messagesContainer = document.getElementById('chatMessages');
    
    if (!messagesContainer) return;

    if (chatUnsubscribe) chatUnsubscribe();

    chatUnsubscribe = db.collection('chats').doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(function(snapshot) {
            var container = document.getElementById('chatMessages');
            if (!container) return;

            if (snapshot.empty) {
                container.innerHTML = '<div style="text-align:center; padding: 20px; opacity: 0.5;">Нет сообщений</div>';
                return;
            }

            container.innerHTML = '';
            snapshot.forEach(function(doc) {
                var message = doc.data();

                if (message.deletedFor && message.deletedFor.includes(currentUser.id)) return;
                
                container.appendChild(createMessageElement(doc.id, message));
            });

            container.scrollTop = container.scrollHeight;
        });
}

function createMessageElement(msgId, msg) {
    var isSent = msg.senderId === currentUser.id;
    var time = msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
    
    var statusIcon = '';
    if (isSent) {
        if (msg.status === 'read') {
            statusIcon = '<span class="message-status read"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/><polyline points="20 12 9 23 4 18"/></svg></span>';
        } else {
            statusIcon = '<span class="message-status"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>';
        }
    }

    var replyHtml = '';
    if (msg.replyTo) {
        replyHtml = '<div class="message-reply"><div class="message-reply-author">' + (msg.replyTo.senderId === currentUser.id ? 'Вы' : currentChatFriend.displayName) + '</div><div class="message-reply-text">' + escapeHtml(msg.replyTo.text || 'Вложение') + '</div></div>';
    }

    var attachmentHtml = '';
    if (msg.attachment) {
        if (msg.attachment.type.startsWith('image/')) {
            attachmentHtml = '<div class="message-attachment"><img src="' + msg.attachment.url + '" alt="" onclick="openImageViewer(\'' + msg.attachment.url + '\')"></div>';
        } else if (msg.attachment.type.startsWith('video/')) {
            attachmentHtml = '<div class="message-attachment"><video src="' + msg.attachment.url + '" controls></video></div>';
        } else {
            attachmentHtml = '<div class="message-attachment"><div class="message-file" onclick="window.open(\'' + msg.attachment.url + '\')"><div class="message-file-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="message-file-info"><div class="message-file-name">' + msg.attachment.name + '</div><div class="message-file-size">' + formatFileSize(msg.attachment.size) + '</div></div></div></div>';
        }
    }

    var div = document.createElement('div');
    div.className = 'message ' + (isSent ? 'sent' : 'received');
    div.dataset.msgId = msgId;
    div.innerHTML = replyHtml + (msg.text ? '<div>' + escapeHtml(msg.text) + '</div>' : '') + attachmentHtml + '<div class="message-meta"><span class="message-time">' + time + '</span>' + statusIcon + '</div>';

    div.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showMessageContextMenu(e, msgId, msg, isSent);
    });

    return div;
}

function showMessageContextMenu(e, msgId, msg, isSent) {
    closeContextMenu();

    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';

    var items = '<button type="button" class="context-menu-item" data-action="reply"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>Ответить</button>';
    
    if (isSent) {
        items += '<button type="button" class="context-menu-item danger" data-action="deleteForAll"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Удалить у всех</button>';
    }
    items += '<button type="button" class="context-menu-item danger" data-action="deleteForMe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Удалить у себя</button>';

    contextMenu.innerHTML = items;
    document.body.appendChild(contextMenu);

    var rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) contextMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
    if (rect.bottom > window.innerHeight) contextMenu.style.top = (window.innerHeight - rect.height - 10) + 'px';

    contextMenu.querySelectorAll('.context-menu-item').forEach(function(item) {
        item.addEventListener('click', function() {
            var action = item.dataset.action;
            if (action === 'reply') setReplyTo(msgId, msg);
            else if (action === 'deleteForAll') deleteMessage(msgId, true);
            else if (action === 'deleteForMe') deleteMessage(msgId, false);
            closeContextMenu();
        });
    });
}

function setReplyTo(msgId, msg) {
    replyingTo = { id: msgId, senderId: msg.senderId, text: msg.text };
    var container = document.getElementById('replyPreviewContainer');
    if (!container) return;

    container.innerHTML = '<div class="reply-preview"><div class="reply-preview-content"><div class="reply-preview-author">' + (msg.senderId === currentUser.id ? 'Вы' : currentChatFriend.displayName) + '</div><div class="reply-preview-text">' + escapeHtml(msg.text || 'Вложение') + '</div></div><button type="button" class="reply-preview-close" id="cancelReply"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
    document.getElementById('cancelReply').addEventListener('click', cancelReply);
    document.getElementById('chatInput').focus();
}

function cancelReply() {
    replyingTo = null;
    var container = document.getElementById('replyPreviewContainer');
    if (container) container.innerHTML = '';
}

function deleteMessage(msgId, forAll) {
    var ref = db.collection('chats').doc(currentChatId).collection('messages').doc(msgId);
    if (forAll) {
        ref.delete().then(function() { showToast('Удалено', 'success'); });
    } else {
        ref.update({ deletedFor: firebase.firestore.FieldValue.arrayUnion(currentUser.id) }).then(function() { showToast('Удалено у вас', 'success'); });
    }
}

function handleAttachment(file) {
    if (!file) return;
    if (file.size > 64 * 1024 * 1024) { showToast('Макс. 64MB', 'error'); return; }

    pendingAttachment = file;
    var container = document.getElementById('attachmentPreviewContainer');
    if (!container) return;

    var thumbHtml = '';
    if (file.type.startsWith('image/')) {
        var url = URL.createObjectURL(file);
        thumbHtml = '<img src="' + url + '" alt="">';
    } else if (file.type.startsWith('video/')) {
        var url = URL.createObjectURL(file);
        thumbHtml = '<video src="' + url + '"></video>';
    } else {
        thumbHtml = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    }

    container.innerHTML = '<div class="attachment-preview"><div class="attachment-preview-thumb">' + thumbHtml + '</div><div class="attachment-preview-info"><div class="attachment-preview-name">' + file.name + '</div><div class="attachment-preview-size">' + formatFileSize(file.size) + '</div></div><button type="button" class="attachment-preview-remove" id="removeAttachment"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
    document.getElementById('removeAttachment').addEventListener('click', cancelAttachment);
}

function cancelAttachment() {
    pendingAttachment = null;
    var container = document.getElementById('attachmentPreviewContainer');
    if (container) container.innerHTML = '';
    document.getElementById('attachmentInput').value = '';
}

function sendMessage() {
    var input = document.getElementById('chatInput');
    var text = input ? input.value.trim() : '';
    
    if (!text && !pendingAttachment) return;

    if (pendingAttachment) {
        uploadAndSend(text);
    } else {
        sendTextMessage(text, null);
    }
}

function uploadAndSend(text) {
    var file = pendingAttachment;
    showToast('Загрузка файла...', 'info');

    var reader = new FileReader();
    reader.onload = function(e) {
        var base64 = e.target.result;
        
        var attachment = {
            name: file.name,
            type: file.type,
            size: file.size,
            url: base64
        };

        sendTextMessage(text, attachment);
        cancelAttachment();
    };
    reader.readAsDataURL(file);
}

function sendTextMessage(text, attachment) {
    var input = document.getElementById('chatInput');
    if (input) input.value = '';

    if (!text && !attachment) return;

    var msgData = {
        senderId: currentUser.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
    };

    if (text) msgData.text = text;
    if (attachment) msgData.attachment = attachment;
    
    if (replyingTo) {
        msgData.replyTo = { 
            id: replyingTo.id, 
            senderId: replyingTo.senderId, 
            text: replyingTo.text || 'Вложение'
        };
        cancelReply();
    }

    db.collection('chats').doc(currentChatId).collection('messages').add(msgData).then(function() {
        db.collection('chats').doc(currentChatId).update({
            lastMessage: text || (attachment ? 'Вложение' : ''),
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).catch(function(e) { 
        console.error(e); 
        showToast('Ошибка: ' + e.message, 'error'); 
    });
}

function markMessagesAsRead() {
    if (!currentChatId) return;
    db.collection('chats').doc(currentChatId).collection('messages').where('senderId', '!=', currentUser.id).where('status', '==', 'sent').get().then(function(snapshot) {
        snapshot.forEach(function(doc) {
            doc.ref.update({ status: 'read' });
        });
    });
}

function showChatsListView() {
    closeChat();
    var section = document.getElementById('chatsSection');
    section.innerHTML = '<div class="section-header glass-panel"><h1>Чаты</h1></div><div class="section-content"><div id="chatsList"><div class="loading-spinner"></div></div></div>';
    loadChatsList();
}

function loadChatsList() {
    var container = document.getElementById('chatsList');
    if (!container || !currentUser) return;

    db.collection('users').doc(currentUser.id).get().then(function(doc) {
        if (doc.exists) currentUser.friends = doc.data().friends || [];

        if (!currentUser.friends || currentUser.friends.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><h3>Нет чатов</h3><p>Добавьте друзей</p><button type="button" class="btn-primary" id="goToFriendsBtn">Найти друзей</button></div>';
            document.getElementById('goToFriendsBtn').addEventListener('click', function() { document.querySelector('[data-section="friends"]').click(); });
            return;
        }

        Promise.all(currentUser.friends.map(function(id) { return db.collection('users').doc(id).get(); })).then(function(docs) {
            container.innerHTML = '';
            docs.forEach(function(d) { if (d.exists) container.appendChild(createChatListElement(d.data())); });
        });
    }).catch(function() { container.innerHTML = '<p class="search-error">Ошибка</p>'; });
}

function createChatListElement(friend) {
    var avatar = friend.avatar ? '<img src="' + friend.avatar + '" alt="">' : '<span>' + friend.displayName.charAt(0).toUpperCase() + '</span>';
    var div = document.createElement('div');
    div.className = 'friend-item chat-list-item';
    div.innerHTML = '<div class="friend-avatar">' + avatar + '</div><div class="friend-info"><span class="friend-name">' + friend.displayName + '</span><span class="friend-username">@' + friend.username + '</span></div>';
    div.addEventListener('click', function() { openChat(friend.id); });
    return div;
}

function openImageViewer(url) {
    var viewer = document.createElement('div');
    viewer.className = 'image-viewer';
    viewer.innerHTML = '<img src="' + url + '" alt=""><button class="image-viewer-close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    viewer.addEventListener('click', function() { viewer.remove(); });
    document.body.appendChild(viewer);
}
window.openImageViewer = openImageViewer;

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function removeFriend(id) {
    openConfirmModal('Удалить из друзей?', 'Вы уверены?', function() {
        var batch = db.batch();
        batch.update(db.collection('users').doc(currentUser.id), { friends: firebase.firestore.FieldValue.arrayRemove(id) });
        batch.update(db.collection('users').doc(id), { friends: firebase.firestore.FieldValue.arrayRemove(currentUser.id) });
        batch.commit().then(function() {
            currentUser.friends = currentUser.friends.filter(function(f) { return f !== id; });
            closeModal();
            showToast('Удалено', 'success');
            loadFriends();
        }).catch(function() { showToast('Ошибка', 'error'); });
    });
}

function acceptFriendRequest(id) {
    var batch = db.batch();
    batch.update(db.collection('users').doc(currentUser.id), { friends: firebase.firestore.FieldValue.arrayUnion(id), friendRequests: firebase.firestore.FieldValue.arrayRemove(id) });
    batch.update(db.collection('users').doc(id), { friends: firebase.firestore.FieldValue.arrayUnion(currentUser.id) });
    batch.commit().then(function() {
        if (!currentUser.friends) currentUser.friends = [];
        currentUser.friends.push(id);
        showToast('Принято!', 'success');
        loadFriendRequests();
    }).catch(function() { showToast('Ошибка', 'error'); });
}

function declineFriendRequest(id) {
    db.collection('users').doc(currentUser.id).update({ friendRequests: firebase.firestore.FieldValue.arrayRemove(id) }).then(function() {
        showToast('Отклонено', 'info');
        loadFriendRequests();
    }).catch(function() { showToast('Ошибка', 'error'); });
}

function initModal() {
    var overlay = document.getElementById('modalOverlay');
    var closeBtn = document.getElementById('modalCloseBtn');
    if (overlay) overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
}

function updateUserUI() {
    if (!currentUser) return;
    var name = document.getElementById('userDisplayName');
    var user = document.getElementById('userUsername');
    var avatar = document.getElementById('userAvatar');
    if (name) name.textContent = currentUser.displayName;
    if (user) user.textContent = '@' + currentUser.username;
    if (avatar) avatar.innerHTML = currentUser.avatar ? '<img src="' + currentUser.avatar + '" alt="">' : '<span>' + currentUser.displayName.charAt(0).toUpperCase() + '</span>';
    updateProfileUI();
}

function showError(msg) {
    var el = document.getElementById('authError');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function hideMessages() {
    var err = document.getElementById('authError');
    var suc = document.getElementById('authSuccess');
    if (err) err.classList.add('hidden');
    if (suc) suc.classList.add('hidden');
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() { showToast('Скопировано', 'success'); }).catch(function() { fallbackCopy(text); });
    } else { fallbackCopy(text); }
}

function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast('Скопировано', 'success'); } catch (e) { showToast('Ошибка', 'error'); }
    document.body.removeChild(ta);
}

function showToast(msg, type) {
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    
    var icon = '';
    if (type === 'success') {
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + msg + '</span>';
    container.appendChild(toast);

    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function openModal(title, content) {
    var titleEl = document.getElementById('modalTitle');
    var contentEl = document.getElementById('modalContent');
    var overlay = document.getElementById('modalOverlay');
    
    if (titleEl) titleEl.textContent = title;
    if (contentEl) contentEl.innerHTML = content;
    if (overlay) {
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    var overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function initModal() {
    var overlay = document.getElementById('modalOverlay');
    var closeBtn = document.getElementById('modalCloseBtn');
    
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
}

function openDisplayNameModal() {
    var currentName = currentUser ? currentUser.displayName : '';
    var content = 
        '<form id="displayNameModalForm">' +
            '<div class="input-group">' +
                '<input type="text" id="newDisplayNameInput" required minlength="2" maxlength="32" value="' + currentName + '" placeholder=" ">' +
                '<label>Новое имя</label>' +
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
        if (!newDisplayName) { showToast('Введите имя', 'error'); return; }

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

function openUsernameModal() {
    var content = 
        '<form id="usernameModalForm">' +
            '<div class="input-group">' +
                '<input type="text" id="newUsernameInput" required minlength="3" maxlength="20" placeholder=" ">' +
                '<label>Новый юзернейм</label>' +
            '</div>' +
            '<div class="input-group">' +
                '<input type="password" id="usernamePasswordInput" required placeholder=" ">' +
                '<label>Ваш пароль</label>' +
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

        if (!newUsername || !password) { showToast('Заполните все поля', 'error'); return; }

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

function openPasswordModal() {
    var content = 
        '<form id="passwordModalForm">' +
            '<div class="input-group">' +
                '<input type="password" id="currentPasswordInput" required placeholder=" ">' +
                '<label>Текущий пароль</label>' +
            '</div>' +
            '<div class="input-group">' +
                '<input type="password" id="newPasswordInput" required minlength="6" placeholder=" ">' +
                '<label>Новый пароль</label>' +
            '</div>' +
            '<div class="input-group">' +
                '<input type="password" id="confirmPasswordInput" required minlength="6" placeholder=" ">' +
                '<label>Подтвердите пароль</label>' +
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
        var current = document.getElementById('currentPasswordInput').value;
        var newPass = document.getElementById('newPasswordInput').value;
        var confirmPass = document.getElementById('confirmPasswordInput').value;

        if (newPass !== confirmPass) { showToast('Пароли не совпадают', 'error'); return; }
        if (newPass.length < 6) { showToast('Пароль мин. 6 символов', 'error'); return; }

        AuthService.updatePassword(current, newPass).then(function(result) {
            if (result.success) {
                closeModal();
                showToast('Пароль изменён', 'success');
            } else {
                showToast(result.error, 'error');
            }
        });
    });
}

function openAddFriendModal() {
    var content = 
        '<form id="addFriendForm">' +
            '<p class="modal-desc">Введите юзернейм пользователя (без @)</p>' +
            '<div class="input-group">' +
                '<input type="text" id="friendSearchInput" required placeholder=" ">' +
                '<label>Юзернейм</label>' +
            '</div>' +
            '<div id="searchResult"></div>' +
            '<div class="modal-actions">' +
                '<button type="button" class="modal-btn secondary" id="cancelAddFriendBtn">Отмена</button>' +
                '<button type="submit" class="modal-btn primary">Найти</button>' +
            '</div>' +
        '</form>';
    
    openModal('Добавить друга', content);

    document.getElementById('cancelAddFriendBtn').addEventListener('click', closeModal);
    
    document.getElementById('addFriendForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var query = document.getElementById('friendSearchInput').value.trim().toLowerCase().replace('@', '');
        if (!query) return;

        var resultDiv = document.getElementById('searchResult');
        resultDiv.innerHTML = '<div class="loading-spinner small"></div>';

        db.collection('usernames').doc(query).get().then(function(doc) {
            if (!doc.exists) {
                resultDiv.innerHTML = '<p class="search-error">Пользователь не найден</p>';
                return;
            }

            return db.collection('users').doc(doc.data().userId).get();
        }).then(function(userDoc) {
            if (!userDoc || !userDoc.exists) return;
            var user = userDoc.data();

            if (user.id === currentUser.id) {
                resultDiv.innerHTML = '<p class="search-error">Это вы!</p>';
                return;
            }

            var isFriend = currentUser.friends && currentUser.friends.includes(user.id);
            var isRequested = currentUser.friendRequests && currentUser.friendRequests.includes(user.id);

            var btnHtml = isFriend ? '<span class="already-friend">Уже в друзьях</span>' : 
                          '<button type="button" class="modal-btn primary small" id="sendRequestBtn">Добавить</button>';

            var avatar = user.avatar 
                ? '<img src="' + user.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' 
                : '<span>' + user.displayName.charAt(0).toUpperCase() + '</span>';

            resultDiv.innerHTML = 
                '<div class="search-result-item">' +
                    '<div class="friend-avatar" style="width:40px;height:40px;">' + avatar + '</div>' +
                    '<div class="friend-info" style="margin-left:10px;">' +
                        '<div class="friend-name">' + user.displayName + '</div>' +
                        '<div class="friend-username">@' + user.username + '</div>' +
                    '</div>' +
                    btnHtml +
                '</div>';

            if (!isFriend) {
                var btn = document.getElementById('sendRequestBtn');
                if (btn) {
                    btn.addEventListener('click', function() {
                        sendFriendRequest(user.id);
                    });
                }
            }
        }).catch(function(err) {
            console.error(err);
            resultDiv.innerHTML = '<p class="search-error">Ошибка поиска</p>';
        });
    });
}

function openConfirmModal(title, message, onConfirm) {
    var content = 
        '<div class="confirm-modal-content">' +
            '<p>' + message + '</p>' +
            '<div class="modal-actions">' +
                '<button type="button" class="modal-btn secondary" id="cancelConfirmBtn">Отмена</button>' +
                '<button type="button" class="modal-btn danger" id="confirmBtn">Подтвердить</button>' +
            '</div>' +
        '</div>';
    
    openModal(title, content);
    document.getElementById('cancelConfirmBtn').addEventListener('click', closeModal);
    document.getElementById('confirmBtn').addEventListener('click', onConfirm);
}
