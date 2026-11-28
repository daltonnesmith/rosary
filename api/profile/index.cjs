const { BlobServiceClient } = require('@azure/storage-blob');
const { makeHandler } = require('./profile.cjs');

let container;
const getBlob = name => {
  container ??= BlobServiceClient.fromConnectionString(process.env.STILLWATER_STORAGE_CONNECTION)
    .getContainerClient('profiles');
  return container.getBlockBlobClient(name);
};

module.exports = async function (context, req) {
  try {
    const { validateState } = await import('../shared/core.js');
    context.res = await makeHandler(getBlob, validateState)(req);
  } catch {
    context.res = { status: 500, headers: { 'Cache-Control': 'no-store' } };
  }
};
