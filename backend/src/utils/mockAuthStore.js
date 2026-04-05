/**
 * In-memory user store for MOCK_MONGO mode only (local testing; no persistence).
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STORE_FILE_PATH = path.join(__dirname, '..', '..', '.mock-auth-store.json');

function ensureVaultCredentials(user) {
    if (!user) return null;
    let changed = false;
    if (!user.vaultSalt) {
        user.vaultSalt = crypto.randomBytes(16).toString('hex');
        changed = true;
    }
    if (!user.vaultSecret) {
        user.vaultSecret = crypto.randomBytes(32).toString('hex');
        changed = true;
    }
    if (changed) persistStore();
    return user;
}

const usersById = new Map();
const emailToId = new Map();

const DEFAULT_STORAGE_LIMIT = 1024 * 1024 * 100; // 100MB, matches User model default

function serializeUser(user) {
    return {
        ...user,
        _id: String(user._id),
    };
}

function deserializeUser(rawUser) {
    return {
        ...rawUser,
        _id: new mongoose.Types.ObjectId(String(rawUser._id)),
    };
}

function persistStore() {
    const payload = {
        users: Array.from(usersById.values()).map(serializeUser),
    };
    try {
        fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(payload, null, 2), 'utf8');
    } catch (error) {
        console.warn('mockAuthStore persist warning:', error.message);
    }
}

function loadStore() {
    try {
        if (!fs.existsSync(STORE_FILE_PATH)) return;
        const raw = fs.readFileSync(STORE_FILE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        const users = Array.isArray(parsed?.users) ? parsed.users : [];
        users.forEach((user) => {
            const hydrated = deserializeUser(user);
            const id = String(hydrated._id);
            usersById.set(id, hydrated);
            emailToId.set(String(hydrated.email).toLowerCase(), id);
        });
    } catch (error) {
        console.warn('mockAuthStore load warning:', error.message);
    }
}

loadStore();

async function createUser({ name, email, password }) {
    const key = email.toLowerCase();
    if (emailToId.has(key)) {
        return null;
    }
    const _id = new mongoose.Types.ObjectId();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
        _id,
        name,
        email,
        passwordHash,
        role: 'user',
        twoFactorEnabled: false,
        twoFactorSecret: undefined,
        vaultSalt: crypto.randomBytes(16).toString('hex'),
        vaultSecret: crypto.randomBytes(32).toString('hex'),
        storageUsed: 0,
        totalStorageLimit: DEFAULT_STORAGE_LIMIT,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
    };
    const idStr = String(_id);
    usersById.set(idStr, user);
    emailToId.set(key, idStr);
    persistStore();
    return user;
}

function findByEmail(email) {
    const id = emailToId.get(String(email).toLowerCase());
    if (!id) return null;
    return ensureVaultCredentials(usersById.get(id));
}

function findById(id) {
    return ensureVaultCredentials(usersById.get(String(id)));
}

async function comparePassword(user, candidatePassword) {
    return bcrypt.compare(candidatePassword, user.passwordHash);
}

async function setPassword(id, newPassword) {
    const idStr = String(id);
    const u = usersById.get(idStr);
    if (!u) return null;
    const passwordHash = await bcrypt.hash(newPassword, 12);
    u.passwordHash = passwordHash;
    persistStore();
    return u;
}

function updateUser(id, patch) {
    const idStr = String(id);
    const u = usersById.get(idStr);
    if (!u) return null;
    Object.assign(u, patch);
    persistStore();
    return u;
}

module.exports = {
    createUser,
    findByEmail,
    findById,
    comparePassword,
    setPassword,
    updateUser,
};
