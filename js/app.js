var currentUser = null;
var pendingVerificationEmail = null;
var currentChatId = null;
var currentChatFriendId = null;
var chatUnsubscribe = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM загружен");
    initApp();
});

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
            showError('Введите корректный email адрес');
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
                pendingVerificationEmail = email;
                showVerification(email);
                showToast('Проверьте почту для подтверждения', 'success');
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

                if (result.success) {
                    showToast('Письмо отправлено повторно', 'success');
                } else {
                    showToast(result.error, 'error');
                }
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
                    showToast('Email подтверждён!', 'success');
                } else if (result.success && !result.verified) {
                    showToast('Email ещё не подтверждён', 'error');
                } else {
                    showToast(result.error, 'error');
                }
            });
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', function() {
            AuthService.logout().then(function() {
                showAuth();
            });
        });
    }
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

    navItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var section = item.dataset.section;
            
            closeChat();

            navItems.forEach(function(i) {
                i.classList.remove('active');
            });
            item.classList.add('active');

            document.querySelectorAll('.content-section').forEach(function(s) {
                s.classList.remove('active');
            });
            
            var sectionId = section + 'Section';
            var sectionEl = document.getElementById(sectionId);
            if (sectionEl) {
                sectionEl.classList.add('active');
            }

            if (section === 'chats') {
                showChatsListView();
            } else if (section === 'friends') {
                loadFriends();
            }

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

            mobileNavItems.forEach(function(i) {
                i.classList.remove('active');
            });
            if (mobileProfileBtn) mobileProfileBtn.classList.remove('active');
            item.classList.add('active');

            document.querySelectorAll('.content-section').forEach(function(s) {
                s.classList.remove('active');
            });
            
            var sectionId = section + 'Section';
            var sectionEl = document.getElementById(sectionId);
            if (sectionEl) {
                sectionEl.classList.add('active');
            }

            document.querySelectorAll('.nav-item').forEach(function(n) {
                n.classList.remove('active');
                if (n.dataset.section === section) {
                    n.classList.add('active');
                }
            });

            if (section === 'chats') {
                showChatsListView();
            } else if (section === 'friends') {
                loadFriends();
            }
        });
    });

    if (mobileProfileBtn) {
        mobileProfileBtn.addEventListener('click', function() {
            closeChat();
            
            mobileNavItems.forEach(function(i) {
                i.classList.remove('active');
            });
            mobileProfileBtn.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(function(s) {
                s.classList.remove('active');
            });
            
            document.getElementById('profileSection').classList.add('active');
            updateProfileUI();
            
            document.querySelectorAll('.nav-item').forEach(function(n) {
                n.classList.remove('active');
            });
        });
    }
}

function updateMobileNav(section) {
    var mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    var mobileProfileBtn = document.getElementById('mobileProfileBtn');
    
    mobileNavItems.forEach(function(item) {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
    
    if (mobileProfileBtn) {
        mobileProfileBtn.classList.remove('active');
    }
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
        ? '<img src="' + currentUser.avatar + '" alt="Avatar">'
        : '<span>' + currentUser.displayName.charAt(0).toUpperCase() + '</span>';

    menu.innerHTML = 
        '<div class="compact-profile-menu">' +
            '<div class="compact-profile-header">' +
                '<div class="compact-avatar-container">' +
                    '<div class="compact-avatar">' + avatarContent + '</div>' +
                    '<label class="compact-photo-edit">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
                            '<circle cx="12" cy="13" r="4"/>' +
                        '</svg>' +
                        '<input type="file" accept="image/*" id="menuPhotoInput">' +
                    '</label>' +
                '</div>' +
                '<div class="compact-user-info">' +
                    '<div class="compact-displayname">' + currentUser.displayName + '</div>' +
                    '<div class="compact-username">@' + currentUser.username + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="compact-menu-items">' +
                '<button type="button" class="menu-item" id="showProfileBtn">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
                        '<circle cx="12" cy="7" r="4"/>' +
                    '</svg>' +
                    '<span>Мой профиль</span>' +
                '</button>' +
                '<button type="button" class="menu-item" id="copyIdBtn">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
                        '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
                    '</svg>' +
                    '<span>Скопировать ID</span>' +
                '</button>' +
                '<div class="menu-divider"></div>' +
                '<button type="button" class="menu-item" id="editDisplayNameBtn">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
                        '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' +
                    '</svg>' +
                    '<span>Изменить имя</span>' +
                '</button>' +
                '<button type="button" class="menu-item" id="editUsernameBtn">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<circle cx="12" cy="12" r="4"/>' +
                        '<path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>' +
                    '</svg>' +
                    '<span>Изменить юзернейм</span>' +
                '</button>' +
                '<button type="button" class="menu-item" id="editPasswordBtn">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>' +
                        '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>' +
                    '</svg>' +
                    '<span>Изменить пароль</span>' +
                '</button>' +
                '<div class="menu-divider"></div>' +
                '<button type="button" class="menu-item danger" id="logoutBtn">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>' +
                        '<polyline points="16 17 21 12 16 7"/>' +
                        '<line x1="21" y1="12" x2="9" y2="12"/>' +
                    '</svg>' +
                    '<span>Выйти</span>' +
                '</button>' +
            '</div>' +
        '</div>';

    document.getElementById('menuPhotoInput').addEventListener('change', function(e) {
        handlePhotoUpload(e.target.files[0]);
        menu.classList.add('hidden');
    });

    document.getElementById('showProfileBtn').addEventListener('click', function() {
        menu.classList.add('hidden');
        showProfileSection();
    });

    document.getElementById('copyIdBtn').addEventListener('click', function() {
        menu.classList.add('hidden');
        copyToClipboard(currentUser.id);
    });

    document.getElementById('editDisplayNameBtn').addEventListener('click', function() {
        menu.classList.add('hidden');
        openDisplayNameModal();
    });

    document.getElementById('editUsernameBtn').addEventListener('click', function() {
        menu.classList.add('hidden');
        openUsernameModal();
    });

    document.getElementById('editPasswordBtn').addEventListener('click', function() {
        menu.classList.add('hidden');
        openPasswordModal();
    });

    document.getElementById('logoutBtn').addEventListener('click', function() {
        menu.classList.add('hidden');
        AuthService.logout().then(function(result) {
            if (result.success) {
                currentUser = null;
                closeChat();
                showAuth();
                showToast('Вы вышли из аккаунта', 'info');
            }
        });
    });
}

function handlePhotoUpload(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Выберите изображение', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('Файл слишком большой (макс. 5MB)', 'error');
        return;
    }

    showToast('Загрузка фото...', 'info');

    var reader = new FileReader();
    reader.onload = function(e) {
        var base64 = e.target.result;

        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var maxSize = 200;
            var width = img.width;
            var height = img.height;

            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            var compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

            db.collection('users').doc(currentUser.id).update({
                avatar: compressedBase64
            }).then(function() {
                currentUser.avatar = compressedBase64;
                updateUserUI();
                showToast('Фото обновлено!', 'success');
            }).catch(function(error) {
                console.error(error);
                showToast('Ошибка загрузки', 'error');
            });
        };
        img.src = base64;
    };
    reader.readAsDataURL(file);
}

function showProfileSection() {
    closeChat();
    
    document.querySelectorAll('.content-section').forEach(function(s) {
        s.classList.remove('active');
    });
    document.getElementById('profileSection').classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(function(n) {
        n.classList.remove('active');
    });
    
    updateMobileNav('profile');
    var mobileProfileBtn = document.getElementById('mobileProfileBtn');
    if (mobileProfileBtn) {
        mobileProfileBtn.classList.add('active');
    }
    
    updateProfileUI();
}

function initProfileSection() {
    var backBtn = document.getElementById('backFromProfileBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            document.getElementById('profileSection').classList.remove('active');
            document.getElementById('chatsSection').classList.add('active');
            var chatsNav = document.querySelector('[data-section="chats"]');
            if (chatsNav) chatsNav.classList.add('active');
            updateMobileNav('chats');
            showChatsListView();
        });
    }

    var profileCopyIdBtn = document.getElementById('profileCopyIdBtn');
    if (profileCopyIdBtn) {
        profileCopyIdBtn.addEventListener('click', function() {
            if (currentUser) {
                copyToClipboard(currentUser.id);
            }
        });
    }

    var profileEditDisplayNameBtn = document.getElementById('profileEditDisplayNameBtn');
    if (profileEditDisplayNameBtn) {
        profileEditDisplayNameBtn.addEventListener('click', function() {
            openDisplayNameModal();
        });
    }

    var profileEditUsernameBtn = document.getElementById('profileEditUsernameBtn');
    if (profileEditUsernameBtn) {
        profileEditUsernameBtn.addEventListener('click', function() {
            openUsernameModal();
        });
    }

    var profileEditPasswordBtn = document.getElementById('profileEditPasswordBtn');
    if (profileEditPasswordBtn) {
        profileEditPasswordBtn.addEventListener('click', function() {
            openPasswordModal();
        });
    }

    var profileLogoutBtn = document.getElementById('profileLogoutBtn');
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', function() {
            AuthService.logout().then(function(result) {
                if (result.success) {
                    currentUser = null;
                    closeChat();
                    showAuth();
                    showToast('Вы вышли из аккаунта', 'info');
                }
            });
        });
    }
}

function updateProfileUI() {
    if (!currentUser) return;

    var profilePhotoContainer = document.querySelector('.profile-photo-container');
    if (profilePhotoContainer) {
        var avatarContent = currentUser.avatar 
            ? '<img src="' + currentUser.avatar + '" alt="Avatar">'
            : '<span id="profileAvatarLetter">' + currentUser.displayName.charAt(0).toUpperCase() + '</span>';

        profilePhotoContainer.innerHTML = 
            '<div class="profile-avatar-large">' + avatarContent + '</div>' +
            '<label class="profile-photo-edit">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
                    '<circle cx="12" cy="13" r="4"/>' +
                '</svg>' +
                '<input type="file" accept="image/*" id="profilePhotoInput">' +
            '</label>';

        document.getElementById('profilePhotoInput').addEventListener('change', function(e) {
            handlePhotoUpload(e.target.files[0]);
        });
    }

    var displayName = document.getElementById('profileDisplayName');
    var username = document.getElementById('profileUsername');
    var userId = document.getElementById('profileUserId');
    var email = document.getElementById('profileEmail');
    var createdAt = document.getElementById('profileCreatedAt');

    if (displayName) displayName.textContent = currentUser.displayName;
    if (username) username.textContent = '@' + currentUser.username;
    if (userId) userId.textContent = currentUser.id;
    if (email) email.textContent = currentUser.email;
    
    if (createdAt) {
        var created = currentUser.createdAt;
        if (created && created.toDate) {
            var date = created.toDate();
            createdAt.textContent = date.toLocaleDateString('ru-RU');
        } else {
            createdAt.textContent = 'Недавно';
        }
    }
}

function initFriendsSection() {
    var addFriendBtn = document.getElementById('addFriendBtn');
    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', function() {
            openAddFriendModal();
        });
    }

    var friendsTabs = document.querySelectorAll('.friends-tab');
    friendsTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            friendsTabs.forEach(function(t) {
                t.classList.remove('active');
            });
            tab.classList.add('active');

            var tabName = tab.dataset.tab;
            
            document.querySelectorAll('.friends-content').forEach(function(content) {
                content.classList.add('hidden');
            });
            
            var targetContent = document.getElementById(tabName + 'Content');
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }

            if (tabName === 'all') {
                loadFriends();
            } else if (tabName === 'pending') {
                loadFriendRequests();
            }
        });
    });
}

function loadFriends() {
    if (!currentUser) return;

    var container = document.getElementById('friendsList');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"></div>';

    db.collection('users').doc(currentUser.id).get().then(function(doc) {
        var userData = doc.data();
        currentUser.friends = userData.friends || [];
        currentUser.friendRequests = userData.friendRequests || [];
        
        var friendIds = currentUser.friends;

        if (friendIds.length === 0) {
            container.innerHTML = 
                '<div class="empty-state">' +
                    '<div class="empty-icon">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                            '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
                            '<circle cx="9" cy="7" r="4"/>' +
                        '</svg>' +
                    '</div>' +
                    '<h3>Нет друзей</h3>' +
                    '<p>Добавьте друзей по юзернейму или ID</p>' +
                '</div>';
            return;
        }

        var promises = friendIds.map(function(friendId) {
            return db.collection('users').doc(friendId).get();
        });

        Promise.all(promises).then(function(docs) {
            container.innerHTML = '';
            docs.forEach(function(friendDoc) {
                if (friendDoc.exists) {
                    var friend = friendDoc.data();
                    var friendElement = createFriendElement(friend);
                    container.appendChild(friendElement);
                }
            });
        });
    }).catch(function(error) {
        console.error("Load friends error:", error);
        container.innerHTML = '<p class="search-error">Ошибка загрузки</p>';
    });
}

function createFriendElement(friend) {
    var avatarContent = friend.avatar 
        ? '<img src="' + friend.avatar + '" alt="Avatar">'
        : '<span>' + friend.displayName.charAt(0).toUpperCase() + '</span>';

    var div = document.createElement('div');
    div.className = 'friend-item';
    div.innerHTML = 
        '<div class="friend-avatar">' + avatarContent + '</div>' +
        '<div class="friend-info">' +
            '<span class="friend-name">' + friend.displayName + '</span>' +
            '<span class="friend-username">@' + friend.username + '</span>' +
        '</div>' +
        '<div class="friend-actions">' +
            '<button type="button" class="friend-action-btn chat-btn" title="Написать">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
                '</svg>' +
            '</button>' +
            '<button type="button" class="friend-action-btn remove-btn" title="Удалить">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<line x1="18" y1="6" x2="6" y2="18"/>' +
                    '<line x1="6" y1="6" x2="18" y2="18"/>' +
                '</svg>' +
            '</button>' +
        '</div>';

    var chatBtn = div.querySelector('.chat-btn');
    chatBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openChat(friend.id);
    });

    var removeBtn = div.querySelector('.remove-btn');
    removeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        removeFriend(friend.id);
    });

    return div;
}

function loadFriendRequests() {
    if (!currentUser) return;

    var container = document.getElementById('pendingList');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"></div>';

    db.collection('users').doc(currentUser.id).get().then(function(doc) {
        var userData = doc.data();
        var requestIds = userData.friendRequests || [];

        if (requestIds.length === 0) {
            container.innerHTML = 
                '<div class="empty-state">' +
                    '<div class="empty-icon">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                            '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
                            '<circle cx="8.5" cy="7" r="4"/>' +
                        '</svg>' +
                    '</div>' +
                    '<h3>Нет заявок</h3>' +
                    '<p>Входящие заявки появятся здесь</p>' +
                '</div>';
            return;
        }

        var promises = requestIds.map(function(requestId) {
            return db.collection('users').doc(requestId).get();
        });

        Promise.all(promises).then(function(docs) {
            container.innerHTML = '';
            docs.forEach(function(requestDoc) {
                if (requestDoc.exists) {
                    var requester = requestDoc.data();
                    var requestElement = createRequestElement(requester);
                    container.appendChild(requestElement);
                }
            });
        });
    }).catch(function(error) {
        console.error("Load requests error:", error);
        container.innerHTML = '<p class="search-error">Ошибка загрузки</p>';
    });
}

function createRequestElement(requester) {
    var avatarContent = requester.avatar 
        ? '<img src="' + requester.avatar + '" alt="Avatar">'
        : '<span>' + requester.displayName.charAt(0).toUpperCase() + '</span>';

    var div = document.createElement('div');
    div.className = 'request-item';
    div.innerHTML = 
        '<div class="friend-avatar">' + avatarContent + '</div>' +
        '<div class="friend-info">' +
            '<span class="friend-name">' + requester.displayName + '</span>' +
            '<span class="friend-username">@' + requester.username + '</span>' +
        '</div>' +
        '<div class="friend-actions">' +
            '<button type="button" class="friend-action-btn accept-btn" title="Принять">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<polyline points="20 6 9 17 4 12"/>' +
                '</svg>' +
            '</button>' +
            '<button type="button" class="friend-action-btn decline-btn" title="Отклонить">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<line x1="18" y1="6" x2="6" y2="18"/>' +
                    '<line x1="6" y1="6" x2="18" y2="18"/>' +
                '</svg>' +
            '</button>' +
        '</div>';

    var acceptBtn = div.querySelector('.accept-btn');
    acceptBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        acceptFriendRequest(requester.id);
    });

    var declineBtn = div.querySelector('.decline-btn');
    declineBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        declineFriendRequest(requester.id);
    });

    return div;
}

function getChatId(oderId) {
    var ids = [currentUser.id, oderId].sort();
    return ids[0] + '_' + ids[1];
}

function closeChat() {
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
    currentChatId = null;
    currentChatFriendId = null;
}

function openChat(friendId) {
    closeChat();
    
    currentChatFriendId = friendId;
    currentChatId = getChatId(friendId);

    db.collection('users').doc(friendId).get().then(function(doc) {
        if (!doc.exists) {
            showToast('Пользователь не найден', 'error');
            return;
        }

        var friend = doc.data();

        var avatarContent = friend.avatar 
            ? '<img src="' + friend.avatar + '" alt="Avatar">'
            : '<span>' + friend.displayName.charAt(0).toUpperCase() + '</span>';
        
        var chatSection = document.getElementById('chatsSection');
        
        document.querySelectorAll('.content-section').forEach(function(s) {
            s.classList.remove('active');
        });
        chatSection.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(function(n) {
            n.classList.remove('active');
        });
        var chatsNav = document.querySelector('[data-section="chats"]');
        if (chatsNav) chatsNav.classList.add('active');
        updateMobileNav('chats');

        chatSection.innerHTML = 
            '<div class="chat-container">' +
                '<div class="chat-header glass-panel">' +
                    '<button type="button" class="header-btn" id="backToChatsBtn">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<line x1="19" y1="12" x2="5" y2="12"/>' +
                            '<polyline points="12 19 5 12 12 5"/>' +
                        '</svg>' +
                    '</button>' +
                    '<div class="friend-avatar">' + avatarContent + '</div>' +
                    '<div class="chat-header-info">' +
                        '<div class="chat-header-name">' + friend.displayName + '</div>' +
                        '<div class="chat-header-status">@' + friend.username + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="chat-messages" id="chatMessages">' +
                    '<div class="loading-spinner"></div>' +
                '</div>' +
                '<div class="chat-input-container">' +
                    '<div class="chat-input-wrapper">' +
                        '<input type="text" class="chat-input" id="chatInput" placeholder="Написать сообщение...">' +
                        '<button type="button" class="chat-send-btn" id="sendMessageBtn">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                '<line x1="22" y1="2" x2="11" y2="13"/>' +
                                '<polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
                            '</svg>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.getElementById('backToChatsBtn').addEventListener('click', function() {
            closeChat();
            showChatsListView();
        });

        document.getElementById('sendMessageBtn').addEventListener('click', function() {
            sendMessage(friendId);
        });

        document.getElementById('chatInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage(friendId);
            }
        });

        document.getElementById('chatInput').focus();

        db.collection('chats').doc(currentChatId).set({
            participants: [currentUser.id, friendId],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        loadMessages(friendId);

    }).catch(function(error) {
        console.error(error);
        showToast('Ошибка открытия чата', 'error');
    });
}

function loadMessages(friendId) {
    var chatId = getChatId(friendId);
    var messagesContainer = document.getElementById('chatMessages');
    
    if (!messagesContainer) return;

    chatUnsubscribe = db.collection('chats').doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(function(snapshot) {
            var container = document.getElementById('chatMessages');
            if (!container) return;

            if (snapshot.empty) {
                container.innerHTML = 
                    '<div class="empty-state" style="padding: 40px 20px;">' +
                        '<p style="margin: 0; color: var(--text-tertiary);">Начните общение!</p>' +
                    '</div>';
                return;
            }

            container.innerHTML = '';
            snapshot.forEach(function(doc) {
                var message = doc.data();
                var isSent = message.senderId === currentUser.id;
                var time = '';
                
                if (message.createdAt) {
                    var date = message.createdAt.toDate();
                    time = date.getHours().toString().padStart(2, '0') + ':' + 
                           date.getMinutes().toString().padStart(2, '0');
                }

                var msgDiv = document.createElement('div');
                msgDiv.className = 'message ' + (isSent ? 'sent' : 'received');
                msgDiv.innerHTML = 
                    '<div>' + escapeHtml(message.text) + '</div>' +
                    '<div class="message-time">' + time + '</div>';
                container.appendChild(msgDiv);
            });

            container.scrollTop = container.scrollHeight;
        }, function(error) {
            console.error("Messages error:", error);
            var container = document.getElementById('chatMessages');
            if (container) {
                container.innerHTML = '<p class="search-error">Ошибка загрузки сообщений</p>';
            }
        });
}

function showChatsListView() {
    closeChat();

    var chatSection = document.getElementById('chatsSection');
    chatSection.innerHTML = 
        '<div class="section-header glass-panel">' +
            '<h1>Чаты</h1>' +
        '</div>' +
        '<div class="section-content">' +
            '<div id="chatsList"><div class="loading-spinner"></div></div>' +
        '</div>';

    loadChatsList();
}

function loadChatsList() {
    var container = document.getElementById('chatsList');
    if (!container || !currentUser) return;

    db.collection('users').doc(currentUser.id).get().then(function(doc) {
        if (doc.exists) {
            var userData = doc.data();
            currentUser.friends = userData.friends || [];
        }

        if (!currentUser.friends || currentUser.friends.length === 0) {
            container.innerHTML = 
                '<div class="empty-state">' +
                    '<div class="empty-icon">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                            '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
                        '</svg>' +
                    '</div>' +
                    '<h3>Нет чатов</h3>' +
                    '<p>Добавьте друзей, чтобы начать общение</p>' +
                    '<button type="button" class="btn-primary" id="goToFriendsBtn">Найти друзей</button>' +
                '</div>';
            
            document.getElementById('goToFriendsBtn').addEventListener('click', function() {
                var friendsNav = document.querySelector('[data-section="friends"]');
                if (friendsNav) friendsNav.click();
            });
            return;
        }

        var promises = currentUser.friends.map(function(friendId) {
            return db.collection('users').doc(friendId).get();
        });

        Promise.all(promises).then(function(docs) {
            container.innerHTML = '';
            
            docs.forEach(function(friendDoc) {
                if (friendDoc.exists) {
                    var friend = friendDoc.data();
                    var chatElement = createChatListElement(friend);
                    container.appendChild(chatElement);
                }
            });
        });
    }).catch(function(error) {
        console.error("Load chats error:", error);
        container.innerHTML = '<p class="search-error">Ошибка загрузки</p>';
    });
}

function createChatListElement(friend) {
    var avatarContent = friend.avatar 
        ? '<img src="' + friend.avatar + '" alt="Avatar">'
        : '<span>' + friend.displayName.charAt(0).toUpperCase() + '</span>';

    var div = document.createElement('div');
    div.className = 'friend-item chat-list-item';
    div.innerHTML = 
        '<div class="friend-avatar">' + avatarContent + '</div>' +
        '<div class="friend-info">' +
            '<span class="friend-name">' + friend.displayName + '</span>' +
            '<span class="friend-username">@' + friend.username + '</span>' +
        '</div>';

    div.addEventListener('click', function() {
        openChat(friend.id);
    });

    return div;
}

function sendMessage(friendId) {
    var input = document.getElementById('chatInput');
    if (!input) return;
    
    var message = input.value.trim();
    if (!message) return;

    var chatId = getChatId(friendId);

    input.value = '';

    db.collection('chats').doc(chatId).collection('messages').add({
        text: message,
        senderId: currentUser.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        db.collection('chats').doc(chatId).update({
            lastMessage: message,
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).catch(function(error) {
        console.error("Send message error:", error);
        showToast('Ошибка отправки', 'error');
    });
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function removeFriend(friendId) {
    openConfirmModal(
        'Удалить из друзей?',
        'Вы уверены, что хотите удалить этого пользователя из друзей?',
        function() {
            var batch = db.batch();
            batch.update(db.collection('users').doc(currentUser.id), {
                friends: firebase.firestore.FieldValue.arrayRemove(friendId)
            });
            batch.update(db.collection('users').doc(friendId), {
                friends: firebase.firestore.FieldValue.arrayRemove(currentUser.id)
            });

            batch.commit().then(function() {
                if (currentUser.friends) {
                    currentUser.friends = currentUser.friends.filter(function(id) {
                        return id !== friendId;
                    });
                }
                closeModal();
                showToast('Удалено из друзей', 'success');
                loadFriends();
            }).catch(function(error) {
                console.error(error);
                showToast('Ошибка удаления', 'error');
            });
        }
    );
}

function acceptFriendRequest(requesterId) {
    var batch = db.batch();
    
    batch.update(db.collection('users').doc(currentUser.id), {
        friends: firebase.firestore.FieldValue.arrayUnion(requesterId),
        friendRequests: firebase.firestore.FieldValue.arrayRemove(requesterId)
    });
    
    batch.update(db.collection('users').doc(requesterId), {
        friends: firebase.firestore.FieldValue.arrayUnion(currentUser.id)
    });

    batch.commit().then(function() {
        if (!currentUser.friends) currentUser.friends = [];
        currentUser.friends.push(requesterId);
        
        if (currentUser.friendRequests) {
            currentUser.friendRequests = currentUser.friendRequests.filter(function(id) {
                return id !== requesterId;
            });
        }
        
        showToast('Заявка принята!', 'success');
        loadFriendRequests();
    }).catch(function(error) {
        console.error(error);
        showToast('Ошибка', 'error');
    });
}

function declineFriendRequest(requesterId) {
    db.collection('users').doc(currentUser.id).update({
        friendRequests: firebase.firestore.FieldValue.arrayRemove(requesterId)
    }).then(function() {
        if (currentUser.friendRequests) {
            currentUser.friendRequests = currentUser.friendRequests.filter(function(id) {
                return id !== requesterId;
            });
        }
        showToast('Заявка отклонена', 'info');
        loadFriendRequests();
    }).catch(function(error) {
        console.error(error);
        showToast('Ошибка', 'error');
    });
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
    var avatarEl = document.getElementById('userAvatar');
    
    if (displayNameEl) displayNameEl.textContent = currentUser.displayName;
    if (usernameEl) usernameEl.textContent = '@' + currentUser.username;
    
    if (avatarEl) {
        if (currentUser.avatar) {
            avatarEl.innerHTML = '<img src="' + currentUser.avatar + '" alt="Avatar">';
        } else {
            avatarEl.innerHTML = '<span id="userAvatarLetter">' + currentUser.displayName.charAt(0).toUpperCase() + '</span>';
        }
    }

    updateProfileUI();
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
            showToast('ID скопирован', 'success');
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
        showToast('ID скопирован', 'success');
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
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
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
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.body.style.overflow = '';
}

function openConfirmModal(title, message, onConfirm) {
    var content = 
        '<div class="confirm-modal-content">' +
            '<p>' + message + '</p>' +
            '<div class="modal-actions">' +
                '<button type="button" class="modal-btn secondary" id="cancelConfirmBtn">Отмена</button>' +
                '<button type="button" class="modal-btn danger" id="confirmBtn">Удалить</button>' +
            '</div>' +
        '</div>';
    
    openModal(title, content);

    document.getElementById('cancelConfirmBtn').addEventListener('click', closeModal);
    document.getElementById('confirmBtn').addEventListener('click', onConfirm);
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

        if (!newUsername || !password) {
            showToast('Заполните все поля', 'error');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            showToast('Только буквы, цифры и _', 'error');
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
        var currentPassword = document.getElementById('currentPasswordInput').value;
        var newPassword = document.getElementById('newPasswordInput').value;
        var confirmPassword = document.getElementById('confirmPasswordInput').value;

        if (newPassword !== confirmPassword) {
            showToast('Пароли не совпадают', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showToast('Пароль минимум 6 символов', 'error');
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

function openAddFriendModal() {
    var content = 
        '<form id="addFriendForm">' +
            '<p class="modal-desc">Введите юзернейм или ID пользователя</p>' +
            '<div class="input-group">' +
                '<input type="text" id="friendSearchInput" required placeholder=" ">' +
                '<label>Юзернейм или ID</label>' +
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
        var searchQuery = document.getElementById('friendSearchInput').value.trim().toLowerCase();
        
        if (!searchQuery) {
            showToast('Введите юзернейм или ID', 'error');
            return;
        }

        searchQuery = searchQuery.replace('@', '');

        var resultDiv = document.getElementById('searchResult');
        resultDiv.innerHTML = '<div class="loading-spinner small"></div>';

        db.collection('usernames').doc(searchQuery).get().then(function(doc) {
            if (doc.exists) {
                return db.collection('users').doc(doc.data().userId).get();
            } else {
                return db.collection('users').doc(searchQuery).get();
            }
        }).then(function(userDoc) {
            if (userDoc && userDoc.exists) {
                var user = userDoc.data();
                
                if (user.id === currentUser.id) {
                    resultDiv.innerHTML = '<p class="search-error">Нельзя добавить себя</p>';
                    return;
                }

                var isFriend = currentUser.friends && currentUser.friends.includes(user.id);
                var avatarContent = user.avatar 
                    ? '<img src="' + user.avatar + '" alt="Avatar">'
                    : '<span>' + user.displayName.charAt(0).toUpperCase() + '</span>';
                
                resultDiv.innerHTML = 
                    '<div class="search-result-item">' +
                        '<div class="friend-avatar">' + avatarContent + '</div>' +
                        '<div class="friend-info">' +
                            '<span class="friend-name">' + user.displayName + '</span>' +
                            '<span class="friend-username">@' + user.username + '</span>' +
                        '</div>' +
                        (isFriend ? '<span class="already-friend">Уже в друзьях</span>' : 
                        '<button type="button" class="modal-btn primary small" id="sendRequestBtn">Добавить</button>') +
                    '</div>';

                if (!isFriend) {
                    document.getElementById('sendRequestBtn').addEventListener('click', function() {
                        sendFriendRequest(user.id);
                    });
                }
            } else {
                resultDiv.innerHTML = '<p class="search-error">Пользователь не найден</p>';
            }
        }).catch(function(error) {
            console.error(error);
            resultDiv.innerHTML = '<p class="search-error">Ошибка поиска</p>';
        });
    });
}

function sendFriendRequest(targetUserId) {
    var resultDiv = document.getElementById('searchResult');
    if (resultDiv) {
        resultDiv.innerHTML = '<div class="loading-spinner small"></div>';
    }

    db.collection('users').doc(targetUserId).get().then(function(doc) {
        if (!doc.exists) {
            if (resultDiv) resultDiv.innerHTML = '<p class="search-error">Пользователь не найден</p>';
            return Promise.reject('not_found');
        }

        var targetUser = doc.data();
        
        if (targetUser.friends && targetUser.friends.includes(currentUser.id)) {
            closeModal();
            showToast('Вы уже друзья', 'info');
            return Promise.reject('already_friends');
        }

        if (targetUser.friendRequests && targetUser.friendRequests.includes(currentUser.id)) {
            closeModal();
            showToast('Заявка уже отправлена ранее', 'info');
            return Promise.reject('already_sent');
        }

        return db.collection('users').doc(targetUserId).update({
            friendRequests: firebase.firestore.FieldValue.arrayUnion(currentUser.id)
        });
    }).then(function() {
        closeModal();
        showToast('Заявка отправлена!', 'success');
    }).catch(function(error) {
        if (error === 'not_found' || error === 'already_friends' || error === 'already_sent') {
            return;
        }
        console.error(error);
        if (resultDiv) resultDiv.innerHTML = '<p class="search-error">Ошибка отправки</p>';
    });
}
