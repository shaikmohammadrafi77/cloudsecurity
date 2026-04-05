const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const AES_256_CBC = 'aes-256-cbc';
const AES_256_GCM = 'aes-256-gcm';
const SUPPORTED_ALGORITHMS = [AES_256_CBC, AES_256_GCM];
const DEFAULT_ALGORITHM = process.env.ENCRYPTION_ALGORITHM || AES_256_CBC;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    console.error('ENCRYPTION_KEY must be a 32-character string in .env');
}

/**
 * Derives a unique vault key using PBKDF2
 * @param {string} userSecret
 * @param {string} userSalt
 * @returns {Buffer} 32-byte key
 */
const generateVaultKey = (userSecret, userSalt) => {
    return crypto.pbkdf2Sync(userSecret, userSalt, 100000, 32, 'sha512');
};

const normalizeAlgorithm = (algorithm) => {
    const candidate = String(algorithm || DEFAULT_ALGORITHM).toLowerCase();
    return SUPPORTED_ALGORITHMS.includes(candidate) ? candidate : AES_256_CBC;
};

/**
 * Encrypts a buffer using a supported AES-256 mode
 * @param {Buffer} buffer
 * @param {string|Buffer} key
 * @param {{ algorithm?: string }} options
 * @returns {{ iv: string, encryptedData: Buffer, algorithm: string, authTag?: string }}
 */
const encrypt = (buffer, key = ENCRYPTION_KEY, options = {}) => {
    const algorithm = normalizeAlgorithm(options.algorithm);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    const authTag =
        algorithm === AES_256_GCM && typeof cipher.getAuthTag === 'function'
            ? cipher.getAuthTag().toString('hex')
            : undefined;

    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        algorithm,
        authTag,
    };
};

/**
 * Decrypts a buffer using a supported AES-256 mode
 * @param {Buffer} encryptedBuffer
 * @param {string} ivHex
 * @param {string|Buffer} key
 * @param {{ algorithm?: string, authTag?: string|null }} options
 * @returns {Buffer}
 */
const decrypt = (encryptedBuffer, ivHex, key = ENCRYPTION_KEY, options = {}) => {
    const algorithm = normalizeAlgorithm(options.algorithm);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);

    if (algorithm === AES_256_GCM) {
        const authTagHex = String(options.authTag || '');
        if (!authTagHex) {
            throw new Error('Missing auth tag for AES-256-GCM decryption');
        }
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    }

    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
};

module.exports = {
    AES_256_CBC,
    AES_256_GCM,
    SUPPORTED_ALGORITHMS,
    normalizeAlgorithm,
    generateVaultKey,
    encrypt,
    decrypt,
};

