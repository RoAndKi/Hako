const AuthService = {
    async register(email, password, username, displayName) {
        try {
            const usernameCheck = await db.collection('usernames').doc(username.toLowerCase()).get();
            if (usernameCheck.exists) {
                throw new Error('Этот юзернейм уже занят');
            }

            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            const userData = {
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

            await db.collection('users').doc(user.uid).set(userData);
            
            await db.collection('usernames').doc(username.toLowerCase()).set({
                userId: user.uid
            });

            return { success: true, user: userData };
        } catch (error) {
            console.error("Registration error:", error);
            return { success: false, error: this.translateError(error) };
        }
    },

    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
            
            if (userDoc.exists) {
                await db.collection('users').doc(userCredential.user.uid).update({
                    status: 'online',
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            return { success: true, user: userDoc.data() };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: this.translateError(error) };
        }
    },

    async logout() {
        try {
            const user = auth.currentUser;
            if (user) {
                await db.collection('users').doc(user.uid).update({
                    status: 'offline',
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            await auth.signOut();
            return { success: true };
        } catch (error) {
            console.error("Logout error:", error);
            return { success: false, error: this.translateError(error) };
        }
    },

    getCurrentUser() {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                unsubscribe();
                if (user) {
                    try {
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        if (userDoc.exists) {
                            resolve(userDoc.data());
                        } else {
                            resolve(null);
                        }
                    } catch (error) {
                        console.error("Get user error:", error);
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        });
    },

    async updateUsername(newUsername, password) {
        try {
            const user = auth.currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);

            const usernameCheck = await db.collection('usernames').doc(newUsername.toLowerCase()).get();
            if (usernameCheck.exists) {
                throw new Error('Этот юзернейм уже занят');
            }

            const userDoc = await db.collection('users').doc(user.uid).get();
            const oldUsername = userDoc.data().username;

            const batch = db.batch();
            
            batch.delete(db.collection('usernames').doc(oldUsername));
            batch.set(db.collection('usernames').doc(newUsername.toLowerCase()), {
                userId: user.uid
            });
            batch.update(db.collection('users').doc(user.uid), {
                username: newUsername.toLowerCase(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();

            return { success: true };
        } catch (error) {
            console.error("Update username error:", error);
            return { success: false, error: this.translateError(error) };
        }
    },

    async updateDisplayName(newDisplayName) {
        try {
            const user = auth.currentUser;
            await db.collection('users').doc(user.uid).update({
                displayName: newDisplayName,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error("Update display name error:", error);
            return { success: false, error: this.translateError(error) };
        }
    },

    async updatePassword(currentPassword, newPassword) {
        try {
            const user = auth.currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            return { success: true };
        } catch (error) {
            console.error("Update password error:", error);
            return { success: false, error: this.translateError(error) };
        }
    },

    translateError(error) {
        const errorMessages = {
            'auth/email-already-in-use': 'Этот email уже зарегистрирован',
            'auth/invalid-email': 'Неверный формат email',
            'auth/operation-not-allowed': 'Операция не разрешена',
            'auth/weak-password': 'Пароль слишком слабый (минимум 6 символов)',
            'auth/user-disabled': 'Аккаунт заблокирован',
            'auth/user-not-found': 'Пользователь не найден',
            'auth/wrong-password': 'Неверный пароль',
            'auth/invalid-credential': 'Неверный email или пароль',
            'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже',
            'auth/network-request-failed': 'Ошибка сети. Проверьте подключение'
        };
        
        if (error.code && errorMessages[error.code]) {
            return errorMessages[error.code];
        }
        
        if (error.message) {
            return error.message;
        }
        
        return 'Произошла неизвестная ошибка';
    }
};
