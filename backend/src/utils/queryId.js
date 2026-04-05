const mongoose = require('mongoose');

/** Stable owner id for queries (JWT + User doc may expose _id as ObjectId or string). */
function ownerObjectIdOrNull(req) {
    if (!req.user || req.user._id == null) return null;
    try {
        const id = req.user._id;
        if (id instanceof mongoose.Types.ObjectId) return id;
        if (Buffer.isBuffer(id)) return new mongoose.Types.ObjectId(id);
        return new mongoose.Types.ObjectId(String(id));
    } catch {
        return null;
    }
}

/** Axios/querystring often sends the literal "null" / "undefined" for absent IDs — treat as absent. */
function parseOptionalObjectIdParam(raw) {
    if (raw === undefined || raw === null || raw === '') return null;
    const s = String(raw).trim();
    if (!s || s === 'null' || s === 'undefined') return null;
    return s;
}

function isBenignListStorageError(error, readyState) {
    const n = error?.name || '';
    if (n === 'CastError' || n === 'BSONError') return true;
    if (n === 'MongoServerError' || n === 'MongoNetworkError' || n === 'MongoServerSelectionError') {
        const msg = String(error?.message || '');
        if (/not primary|not authorized|unauthorized|authentication|topology|closed|reset|timeout|network|ECONNRESET|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
            return true;
        }
    }
    if (readyState !== 1) return true;
    const msg = String(error?.message || '');
    return /buffering timed out|not connected|must be connected|connection closed|MongoNetworkError|MongoServerSelectionError|ECONNRESET|ENOTFOUND|timed out/i.test(
        msg
    );
}

module.exports = { parseOptionalObjectIdParam, isBenignListStorageError, ownerObjectIdOrNull };
