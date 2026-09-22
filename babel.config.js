/**
 * Jest only: `import('expo-notifications')` (services/notificationService.ts,
 * deviceService.ts) needs --experimental-vm-modules under Node's VM, so tests
 * see it as `Promise.resolve().then(() => require(...))` - the same module,
 * mockable with jest.mock. Metro and EAS builds never run with NODE_ENV=test and
 * get the config unchanged.
 */
function dynamicImportToRequire({ types: t }) {
  return {
    visitor: {
      CallExpression(path) {
        if (path.node.callee.type !== 'Import') return;
        path.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.callExpression(t.memberExpression(t.identifier('Promise'), t.identifier('resolve')), []),
              t.identifier('then'),
            ),
            [t.arrowFunctionExpression([], t.callExpression(t.identifier('require'), path.node.arguments))],
          ),
        );
      },
    },
  };
}

module.exports = function (api) {
  const isTest = api.env('test');
  return {
    presets: ['babel-preset-expo'],
    plugins: isTest ? [dynamicImportToRequire] : [],
  };
};
