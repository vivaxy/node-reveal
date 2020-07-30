/**
 * @since 2019-06-18 13:46
 * @author vivaxy
 */
const { handler, builder } = require('../commands/server.js');

(async () => {
  const args = {};
  Object.keys(builder).forEach((key) => {
    if (builder[key].hasOwnProperty('default')) {
      args[key] = builder[key].default;
    }
  });

  await handler({
    ...args,
    markdown: 'test/demo.md',
    theme: 'simple',
    highlightTheme: 'github',
    watch: true,
    logLevel: 0,
    script: 'custom.js',
  });
})();
