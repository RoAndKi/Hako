var AuthService = {
    register: function(email, password, username, displayName) {
        return new Promise(function(resolve) {
            db.collection('usernames').doc(username.toLowerCase()).get()
                .then(function(usernameDoc) {
                    if (usernameDoc.exists) {
                        resolve({ success: false, error: 'Этот юзернейм уже занят' });
                        return;
                    }

                    auth.createUserWithEmailAndPassword(email, password)
                        .then(function(userCredential) {
                            var user = userCredential.user;

                            var userData = {
                                id: user.uid,
                                email: email,
                                username: username.toLowerCase(),
                                displayName: displayName,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                avatar: null,
                                status: 'online',
                                friends: [],
                                friendRequests: []
                            };

                            var batch = db.batch();
                            batch.set(db.collection('users').doc(user.uid), userData);
                            batch.set(db.collection('usernames').doc(username.toLowerCase()), { userId: user.uid });

                            batch.commit()
                                .then(function() {
                                    resolve({ success: true, user: userData });
                                })
                                .catch(function(error) {
                                    console.error("Batch error:", error);
                                    resolve({ success: false, error: 'Ошибка сохранения данных' });
                                });
                        })
                        .catch(function(error) {
                            console.error("Auth error:", error);
                            resolve({ success: false, error: AuthService.translateError(error) });
                        });
                })
                .catch(function(error) {
                    console.error("Username check error:", error);
                    resolve({ success: false, error: 'Ошибка проверки юзернейма' });
                });
        });
    },

    login: function(email, password) {
        return new Promise(function(resolve) {
            auth.signInWithEmailAndPassword(email, password)
                .then(function(userCredential) {
                    db.collection('users').doc(userCredential.user.uid).get()
                        .then(function(userDoc) {
                            if (userDoc.exists) {
                                db.collection('users').doc(userCredential.user.uid).update({
                                    status: 'online',
                                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                                });
                                resolve({ success: true, user: userDoc.data() });
                            } else {
                                resolve({ success: false, error: 'Профиль не найден' });
                            }
                        })
                        .catch(function(error) {
                            console.error("Get user error:", error);
                            resolve({ success: false, error: 'Ошибка загрузки профиля' });
                        });
                })
                .catch(function(error) {
                    console.error("Login error:", error);
                    resolve({ success: false, error: AuthService.translateError(error) });
                });
        });
    },

    logout: function() {
        return new Promise(function(resolve) {
            var user = auth.currentUser;
            if (user) {
                db.collection('users').doc(user.uid).update({
                    status: 'offline',
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                }).then(function() {
                    auth.signOut().then(function() {
                        resolve({ success: true });
                    });
                }).catch(function() {
                    auth.signOut().then(function() {
                        resolve({ success: true });
                    });
                });
            } else {
                auth.signOut().then(function() {
                    resolve({ success: true });
                });
            }
        });
    },

    getCurrentUser: function() {
        return new Promise(function(resolve) {
            var unsubscribe = auth.onAuthStateChanged(function(user) {
                unsubscribe();
                if (user) {
                    db.collection('users').doc(user.uid).get()
                        .then(function(userDoc) {
                            if (userDoc.exists) {
                                resolve(userDoc.data());
                            } else {
                                resolve(null);
                            }
                        })
                        .catch(function(error) {
                            console.error("Get current user error:", error);
                            resolve(null);
                        });
                } else {
                    resolve(null);
                }
            });
        });
    },

    updateUsername: function(newUsername, password) {
        return new Promise(function(resolve) {
            var user = auth.currentUser;
            var credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            
            user.reauthenticateWithCredential(credential)
                .then(function() {
                    return db.collection('usernames').doc(newUsername.toLowerCase()).get();
                })
                .then(function(usernameDoc) {
                    if (usernameDoc.exists) {
                        resolve({ success: false, error: 'Этот юзернейм уже занят' });
                        return Promise.reject('username_taken');
                    }
                    return db.collection('users').doc(user.uid).get();
                })
                .then(function(userDoc) {
                    var oldUsername = userDoc.data().username;
                    var batch = db.batch();
                    
                    batch.delete(db.collection('usernames').doc(oldUsername));
                    batch.set(db.collection('usernames').doc(newUsername.toLowerCase()), { userId: user.uid });
                    batch.update(db.collection('users').doc(user.uid), {
                        username: newUsername.toLowerCase(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    return batch.commit();
                })
                .then(function() {
                    resolve({ success: true });
                })
                .catch(function(error) {
                    if (error === 'username_taken') return;
                    console.error("Update username error:", error);
                    resolve({ success: false, error: AuthService.translateError(error) });
                });
        });
    },

    updateDisplayName: function(newDisplayName) {
        return new Promise(function(resolve) {
            var user = auth.currentUser;
            db.collection('users').doc(user.uid).update({
                displayName: newDisplayName,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(function() {
                resolve({ success: true });
            })
            .catch(function(error) {
                console.error("Update display name error:", error);
                resolve({ success: false, error: 'Ошибка обновления имени' });
            });
        });
    },

    updatePassword: function(currentPassword, newPassword) {
        return new Promise(function(resolve) {
            var user = auth.currentUser;
            var credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            
            user.reauthenticateWithCredential(credential)
                .then(function() {
                    return user.updatePassword(newPassword);
                })
                .then(function() {
                    resolve({ success: true });
                })
                .catch(function(error) {
                    console.error("Update password error:", error);
                    resolve({ success: false, error: AuthService.translateError(error) });
                });
        });
    },

    translateError: function(error) {
        var errorMessages = {
            'auth/email-already-in-use': 'Этот email уже зарегистрирован',
            'auth/invalid-email': 'Неверный формат email',
            'auth/operation-not-allowed': 'Операция не разрешена',
            'auth/weak-password': 'Пароль слишком слабый (минимум 6 символов)',
            'auth/user-disabled': 'Аккаунт заблокирован',
            'auth/user-not-found': 'Пользователь не найден',
            'auth/wrong-password': 'Неверный пароль',
            'auth/invalid-credential': 'Неверный email или пароль',
            'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже',
            'auth/network-request-failed': 'Ошибка сети'
        };
        
        if (error && error.code && errorMessages[error.code]) {
            return errorMessages[error.code];
        }
        
        if (error && error.message) {
            return error.message;
        }
        
        return 'Произошла ошибка';
    }
};
