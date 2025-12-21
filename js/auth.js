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
                usersId: user.uid
            });

            return { success: true, user: userData };
        } catch (error) {
            return { success: false, error: this.translateError(error) };
        }
    },

    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const userData = await db.collection('users').doc(userCredential.user.uid).get();
            
            await db.collection('users').doc(userCredential.user.uid).update({
                status: 'online',
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, user: userData.data() };
        } catch (error) {
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
            return { success: false, error: this.translateError(error) };
        }
    },

    async getCurrentUser() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    const userData = await db.collection('users').doc(user.uid).get();
                    resolve(userData.exists ? userData.data() : null);
                } else {
                    resolve(null);
                }
            });
        });
    },

    async updateUsername(newUsername, password) {
        try {
            const user = auth.currentUser;
            const credential = firebase.auth.EmailAuthCredential.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);

            const usernameCheck = await db.collection('usernames').doc(newUsername.toLowerCase()).get();
            if (usernameCheck.exists) {
                throw new Error('Этот юзернейм уже занят');
            }

            const userData = await db.collection('users').doc(user.uid).get();
            const oldUsername = userData.data().username;

            await db.collection('usernames').doc(oldUsername).delete();
            await db.collection('usernames').doc(newUsername.toLowerCase()).set({
                userId: user.uid
            });

            await db.collection('users').doc(user.uid).update({
                username: newUsername.toLowerCase(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };
        } catch (error) {
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
            return { success: false, error: this.translateError(error) };
        }
    },

    async updatePassword(currentPassword, newPassword) {
        try {
            const user = auth.currentUser;
            const credential = firebase.auth.EmailAuthCredential.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.translateError(error) };
        }
    },

    translateError(error) {
        const errorMessages = {
            'auth/email-already-in-use': 'Этот email уже зарегистрирован',
            'auth/invalid-email': 'Неверный формат email',
            'auth/operation-not-allowed': 'Операция не разрешена',
            'auth/weak-password': 'Пароль слишком слабый',
            'auth/user-disabled': 'Аккаунт заблокирован',
            'auth/user-not-found': 'Пользователь не найден',
            'auth/wrong-password': 'Неверный пароль',
            'auth/invalid-credential': 'Неверные учетные данные',
            'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже'
        };
        return errorMessages[error.code] || error.message;
    }
};
