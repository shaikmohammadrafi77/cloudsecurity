const { S3Client, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const dotenv = require('dotenv');

dotenv.config();

const S3_CONNECT_TIMEOUT_MS = Number(process.env.AWS_S3_CONNECT_TIMEOUT_MS || 1500);
const S3_SOCKET_TIMEOUT_MS = Number(process.env.AWS_S3_SOCKET_TIMEOUT_MS || 6000);
const S3_MAX_ATTEMPTS = Number(process.env.AWS_S3_MAX_ATTEMPTS || (process.env.NODE_ENV === 'production' ? 3 : 1));

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    maxAttempts: S3_MAX_ATTEMPTS,
    requestHandler: new NodeHttpHandler({
        connectionTimeout: S3_CONNECT_TIMEOUT_MS,
        socketTimeout: S3_SOCKET_TIMEOUT_MS,
    }),
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

let ensureBucketPromise = null;
async function ensureBucketExists() {
    if (!BUCKET_NAME) return;

    // Only create when explicitly enabled; many dev IAM users can't create buckets.
    const autoCreate = process.env.AUTO_CREATE_S3_BUCKET === 'true';

    if (!autoCreate) return;

    if (ensureBucketPromise) return ensureBucketPromise;

    ensureBucketPromise = (async () => {
        // Fast path: if it already exists, HeadBucket succeeds.
        await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    })().catch(async (err) => {
        const status = err?.$metadata?.httpStatusCode;
        const code = err?.name || err?.Code || err?.code;
        const message = String(err?.message || '');

        const isNoSuchBucket =
            status === 404 ||
            code === 'NotFound' ||
            code === 'NoSuchBucket' ||
            /no such bucket|not found/i.test(message);

        if (!isNoSuchBucket) throw err;

        const region = process.env.AWS_REGION || 'us-east-1';
        const input = { Bucket: BUCKET_NAME };
        if (region !== 'us-east-1') {
            input.CreateBucketConfiguration = { LocationConstraint: region };
        }

        await s3Client.send(new CreateBucketCommand(input));
    });

    return ensureBucketPromise;
}

module.exports = { s3Client, BUCKET_NAME, ensureBucketExists };
