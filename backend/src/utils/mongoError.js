/** Detect connection / topology failures so we return 503 instead of opaque 500s. */
function isMongoUnavailable(err) {
    if (!err) return false;
    const n = err.name;
    if (
        n === 'MongoServerSelectionError' ||
        n === 'MongoNetworkError' ||
        n === 'MongoTopologyClosedError' ||
        n === 'MongoNotConnectedError'
    ) {
        return true;
    }
    const msg = String(err.message || '');
    return /ECONNREFUSED|ENOTFOUND|timed out|topology was destroyed|connection.*closed/i.test(msg);
}

function dbUnavailableMessage() {
    return 'Database unavailable; try again shortly.';
}

module.exports = { isMongoUnavailable, dbUnavailableMessage };
