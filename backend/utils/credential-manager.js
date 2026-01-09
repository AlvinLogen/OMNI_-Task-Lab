// Handles encryption/decryption of sensitive credentials stored in DB
const crypto = require('crypto');
const logger = require('./logger');

class CredentialManager {
    constructor() {
        const environment = process.env.NODE_ENV || 'development';

        let encryptionKey;
        if(environment === 'production') {
            encryptionKey = process.env.PRD_ENCRYPTION_KEY;
        } else {
            encryptionKey = process.env.STG_ENCRYPTION_KEY
        }

        if (!encryptionKey) {
            logger.error(`No ecnryption key found for environment: ${environment}`);
            throw new Error(`ENCRYPTION_KEY not set for ${environment}`);
        }

        this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
        this.algorithm = 'aes-256-gcm';
        this.environment = environment;

        logger.info(`CredentialManager initialized for ${environment}`);
    }

    encrypt(plaintext){
        try {
            if(!plaintext){
                throw new Error('Plaintext is required for encryption');
            }

            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

            let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}}`


        } catch (error) {
            logger.error('Encryption failed:', error);
            throw new Error('Failed to ecnrypt data');
        }
    }

    decrypt(encrypted){
        try {
            if(!encrypted){
                throw new Error('Encrypted data is required for decryption');
            }

            const parts = encrypted.split(':');
            if(parts.length !== 3){
                throw new Error('Invalid encrypted data format');
            }

            const [ivHex, authTagHex, encryptedData] = parts;
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');

            const decipher = crypto.createDecipheriv(this.algorithm,this.key, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
            decrypted += decipher.final('utf-8');

            return decrypted;

        } catch (error) {
            logger.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    hashPassword(password){
        try {
            if(!password){
                throw new Error('Password is required');
            }

            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

            return `${salt}:${hash}`;

        } catch (error) {
            logger.error('Password hashing failed:', error);
            throw new Error('Failed to hash password');
        }
    }

    verifyPassword(password, storedHash){
        try {
            if(!password || !storedHash){
                return false;
            }

            const [salt, originalHash] = storedHash.split(':');

            if(!salt || !originalHash){
                return false;
            }

            const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
            return crypto.timingSafeEqual(Buffer.from(originalHash), Buffer.from(hash));

        } catch (error) {
            logger.error('Password verification failed', error);
            return false;
        }
    }

    generateApiKey(length = 32){
        return crypto.randomBytes(length).toString('hex');
    }
}

module.exports = new CredentialManager();