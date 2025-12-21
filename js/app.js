var currentUser = null;
var pendingVerificationEmail = null;

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
    document.getElementById('verifyEmail').textContent = email;
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
            var btn = resendBtn;
            btn.classList.add('loading');
            btn.disabled = true;

            AuthService.resendVerificationEmail().then(function(result) {
                btn.classList.remove('loading');
                btn.disabled = false;

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
            var btn = checkBtn;
            btn.classList.add('loading');
            btn.disabled = true;

            AuthService.checkEmailVerification().then(function(result) {
                btn.classList.remove('loading');
                btn.disabled = false;

                if (result.success && result.verified) {
                    currentUser = result.user;
                    showApp();
                    updateUserUI();
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

            updateMobileNav(item.dataset.section);
        });
    });

    var goToFriendsBtn = document.getElementById('goToFriendsBtn');
    if (goToFriendsBtn) {
        goToFriendsBtn.addEventListener('click', function() {
            document.querySelector('[data-section="friends"]').click();
        });
    }
}

function initMobileNav() {
    var mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-section]');
    var mobileProfileBtn = document.getElementById('mobileProfileBtn');
    var sections = document.querySelectorAll('.content-section');
    var navItems = document.querySelectorAll('.nav-item');

    mobileNavItems.forEach(function(item) {
        item.addEventListener('click', function() {
            mobileNavItems.forEach(function(i) {
                i.classList.remove('active');
            });
            if (mobileProfileBtn) mobileProfileBtn.classList.remove('active');
            item.classList.add('active');

            sections.forEach(function(s) {
                s.classList.add('hidden');
            });
            
            var sectionId = item.dataset.section + 'Section';
            var section = document.getElementById(sectionId);
            if (section) {
                section.classList.remove('hidden');
            }

            navItems.forEach(function(n) {
                n.classList.remove('active');
                if (n.dataset.section === item.dataset.section) {
                    n.classList.add('active');
                }
            });
        });
    });

    if (mobileProfileBtn) {
        mobileProfileBtn.addEventListener('click', function() {
            mobileNavItems.forEach(function(i) {
                i.classList.remove('active');
            });
            mobileProfileBtn.classList.add('active');
            
            sections.forEach(function(s) {
                s.classList.add('hidden');
            });
            
            document.getElementById('profileSection').classList.remove('hidden');
            updateProfileUI();
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
    var logoutBtn = document.getElementById('logoutBtn');
    var copyIdBtn = document.getElementById('copyIdBtn');
    var editDisplayNameBtn = document.getElementById('editDisplayNameBtn');
    var editUsernameBtn = document.getElementById('editUsernameBtn');
    var editPasswordBtn = document.getElementById('editPasswordBtn');
    var showProfileBtn = document.getElementById('showProfileBtn');

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
            if (currentUser) {
                copyToClipboard(currentUser.id);
            }
        });
    }

    if (editDisplayNameBtn) {
        editDisplayNameBtn.addEventListener('click', function() {
            menu.classList.add('hidden');
            openDisplayNameModal();
        });
    }

    if (editUsernameBtn) {
        editUsernameBtn.addEventListener('click', function() {
            menu.classList.add('hidden');
            openUsernameModal();
        });
    }

    if (editPasswordBtn) {
        editPasswordBtn.addEventListener('click', function() {
            menu.classList.add('hidden');
            openPasswordModal();
        });
    }

    if (showProfileBtn) {
        showProfileBtn.addEventListener('click', function() {
            menu.classList.add('hidden');
            showProfileSection();
        });
    }
}

function initProfileSection() {
    var backBtn = document.getElementById('backFromProfileBtn');
    var profileCopyIdBtn = document.getElementById('profileCopyIdBtn');
    var profileEditDisplayNameBtn = document.getElementById('profileEditDisplayNameBtn');
    var profileEditUsernameBtn = document.getElementById('profileEditUsernameBtn');
    var profileEditPasswordBtn = document.getElementById('profileEditPasswordBtn');
    var profileLogoutBtn = document.getElementById('profileLogoutBtn');

    if (backBtn) {
        backBtn.addEventListener('click', function() {
            document.getElementById('profileSection').classList.add('hidden');
            document.getElementById('chatsSection').classList.remove('hidden');
            updateMobileNav('chats');
        });
    }

    if (profileCopyIdBtn) {
        profileCopyIdBtn.addEventListener('click', function() {
            if (currentUser) {
                copyToClipboard(currentUser.id);
            }
        });
    }

    if (profileEditDisplayNameBtn) {
        profileEditDisplayNameBtn.addEventListener('click', function() {
            openDisplayNameModal();
        });
    }

    if (profileEditUsernameBtn) {
        profileEditUsernameBtn.addEventListener('click', function() {
            openUsernameModal();
        });
    }

    if (profileEditPasswordBtn) {
        profileEditPasswordBtn.addEventListener('click', function() {
            openPasswordModal();
        });
    }

    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', function() {
            AuthService.logout().then(function(result) {
                if (result.success) {
                    currentUser = null;
                    showAuth();
                    showToast('Вы вышли из аккаунта', 'info');
                }
            });
        });
    }
}

function showProfileSection() {
    var sections = document.querySelectorAll('.content-section');
    sections.forEach(function(s) {
        s.classList.add('hidden');
    });
    document.getElementById('profileSection').classList.remove('hidden');
    updateProfileUI();
    
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(n) {
        n.classList.remove('active');
    });
}

function updateProfileUI() {
    if (!currentUser) return;

    var avatarLetter = document.getElementById('profileAvatarLetter');
    var displayName = document.getElementById('profileDisplayName');
    var username = document.getElementById('profileUsername');
    var userId = document.getElementById('profileUserId');
    var email = document.getElementById('profileEmail');
    var createdAt = document.getElementById('profileCreatedAt');

    if (avatarLetter) avatarLetter.textContent = currentUser.displayName.charAt(0).toUpperCase();
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
    var friendsContents = document.querySelectorAll('.friends-content');

    friendsTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            friendsTabs.forEach(function(t) {
                t.classList.remove('active');
            });
            tab.classList.add('active');

            var tabName = tab.dataset.tab;
            friendsContents.forEach(function(content) {
                content.classList.add('hidden');
                if (content.id === tabName + 'Content') {
                    content.classList.remove('hidden');
                }
            });

            if (tabName === 'all') {
                loadFriends();
            } else if (tabName === 'pending') {
                loadFriendRequests();
            }
        });
    });

    loadFriends();
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
                '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>' +
                '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>' +
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
                    container.innerHTML += createFriendItem(friend);
                }
            });
            initFriendItemButtons();
        });
    }).catch(function(error) {
        console.error("Load friends error:", error);
        container.innerHTML = '<p class="error-text">Ошибка загрузки</p>';
    });
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
                '<line x1="20" y1="8" x2="20" y2="14"/>' +
                '<line x1="23" y1="11" x2="17" y2="11"/>' +
                '</svg>' +
                '</div>' +
                '<h3>Нет заявок</h3>' +
                '<p>Входящие заявки в друзья появятся здесь</p>' +
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
                    container.innerHTML += createRequestItem(requester);
                }
            });
            initRequestItemButtons();
        });
    });
}

function createFriendItem(friend) {
    return '<div class="friend-item" data-id="' + friend.id + '">' +
        '<div class="friend-avatar">' +
        '<span>' + friend.displayName.charAt(0).toUpperCase() + '</span>' +
        '</div>' +
        '<div class="friend-info">' +
        '<span class="friend-name">' + friend.displayName + '</span>' +
        '<span class="friend-username">@' + friend.username + '</span>' +
        '</div>' +
        '<div class="friend-actions">' +
        '<button type="button" class="friend-action-btn chat-btn" data-id="' + friend.id + '" title="Написать">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
        '</svg>' +
        '</button>' +
        '<button type="button" class="friend-action-btn remove-btn" data-id="' + friend.id + '" title="Удалить">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<line x1="18" y1="6" x2="6" y2="18"/>' +
        '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '</svg>' +
        '</button>' +
        '</div>' +
        '</div>';
}

function createRequestItem(requester) {
    return '<div class="request-item" data-id="' + requester.id + '">' +
        '<div class="friend-avatar">' +
        '<span>' + requester.displayName.charAt(0).toUpperCase() + '</span>' +
        '</div>' +
        '<div class="friend-info">' +
        '<span class="friend-name">' + requester.displayName + '</span>' +
        '<span class="friend-username">@' + requester.username + '</span>' +
        '</div>' +
        '<div class="friend-actions">' +
        '<button type="button" class="friend-action-btn accept-btn" data-id="' + requester.id + '" title="Принять">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<polyline points="20 6 9 17 4 12"/>' +
        '</svg>' +
        '</button>' +
        '<button type="button" class="friend-action-btn decline-btn" data-id="' + requester.id + '" title="Отклонить">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<line x1="18" y1="6" x2="6" y2="18"/>' +
        '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '</svg>' +
        '</button>' +
        '</div>' +
        '</div>';
}

function initFriendItemButtons() {
    var chatBtns = document.querySelectorAll('.chat-btn');
    var removeBtns = document.querySelectorAll('.remove-btn');

    chatBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var friendId = btn.dataset.id;
            openChat(friendId);
        });
    });

    removeBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var friendId = btn.dataset.id;
            removeFriend(friendId);
        });
    });
}

function initRequestItemButtons() {
    var acceptBtns = document.querySelectorAll('.accept-btn');
    var declineBtns = document.querySelectorAll('.decline-btn');

    acceptBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var requesterId = btn.dataset.id;
            acceptFriendRequest(requesterId);
        });
    });

    declineBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var requesterId = btn.dataset.id;
            declineFriendRequest(requesterId);
        });
    });
}

function openChat(friendId) {
    showToast('Открытие чата...', 'info');
}

function removeFriend(friendId) {
    if (!confirm('Удалить из друзей?')) return;

    var batch = db.batch();
    var currentUserRef = db.collection('users').doc(currentUser.id);
    var friendRef = db.collection('users').doc(friendId);
    
    batch.update(currentUserRef, {
        friends: firebase.firestore.FieldValue.arrayRemove(friendId)
    });
    
    batch.update(friendRef, {
        friends: firebase.firestore.FieldValue.arrayRemove(currentUser.id)
    });

    batch.commit().then(function() {
        if (currentUser.friends) {
            currentUser.friends = currentUser.friends.filter(function(id) {
                return id !== friendId;
            });
        }
        
        showToast('Удалено из друзей', 'success');
        loadFriends();
    }).catch(function(error) {
        console.error("Remove friend error:", error);
        showToast('Ошибка: ' + error.message, 'error');
    });
}
function acceptFriendRequest(requesterId) {
    var batch = db.batch();
    var currentUserRef = db.collection('users').doc(currentUser.id);
    var requesterRef = db.collection('users').doc(requesterId);
    
    batch.update(currentUserRef, {
        friends: firebase.firestore.FieldValue.arrayUnion(requesterId),
        friendRequests: firebase.firestore.FieldValue.arrayRemove(requesterId)
    });
    
    batch.update(requesterRef, {
        friends: firebase.firestore.FieldValue.arrayUnion(currentUser.id)
    });

    batch.commit().then(function() {
        if (!currentUser.friends) {
            currentUser.friends = [];
        }
        currentUser.friends.push(requesterId);
        
        if (currentUser.friendRequests) {
            currentUser.friendRequests = currentUser.friendRequests.filter(function(id) {
                return id !== requesterId;
            });
        }
        
        showToast('Заявка принята!', 'success');
        loadFriendRequests();
        loadFriends();
    }).catch(function(error) {
        console.error("Accept friend request error:", error);
        showToast('Ошибка: ' + error.message, 'error');
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
        console.error("Decline friend request error:", error);
        showToast('Ошибка: ' + error.message, 'error');
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
    var avatarEl = document.getElementById('userAvatarLetter');
    
    if (displayNameEl) displayNameEl.textContent = currentUser.displayName;
    if (usernameEl) usernameEl.textContent = '@' + currentUser.username;
    if (avatarEl) avatarEl.textContent = currentUser.displayName.charAt(0).toUpperCase();

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
        '<div class="input-highlight"></div>' +
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
                
                resultDiv.innerHTML = 
                    '<div class="search-result-item">' +
                    '<div class="friend-avatar"><span>' + user.displayName.charAt(0).toUpperCase() + '</span></div>' +
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
    db.collection('users').doc(targetUserId).get().then(function(doc) {
        if (!doc.exists) {
            showToast('Пользователь не найден', 'error');
            return;
        }

        var targetUser = doc.data();
        
        if (targetUser.friends && targetUser.friends.includes(currentUser.id)) {
            showToast('Вы уже друзья', 'info');
            closeModal();
            return;
        }

        if (targetUser.friendRequests && targetUser.friendRequests.includes(currentUser.id)) {
            showToast('Заявка уже отправлена', 'info');
            closeModal();
            return;
        }

        return db.collection('users').doc(targetUserId).update({
            friendRequests: firebase.firestore.FieldValue.arrayUnion(currentUser.id)
        });
    }).then(function() {
        closeModal();
        showToast('Заявка отправлена!', 'success');
    }).catch(function(error) {
        console.error("Send friend request error:", error);
        showToast('Ошибка: ' + error.message, 'error');
    });
}
