module.exports = async function (context, req) {
  const { handle } = await import('./login.mjs');
  context.res = await handle(context.bindingData.action, req);
};
