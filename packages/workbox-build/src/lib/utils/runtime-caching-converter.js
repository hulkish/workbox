const errors = require('../errors');

/**
 * Given a set of options that configures `sw-toolbox`'s behavior, convert it
 * into a string that would configure equivalent `workbox-sw` behavior.
 *
 * @param {Object} options See
 *        https://googlechrome.github.io/sw-toolbox/api.html#options
 * @return {String} A JSON string representing the equivalent options.
 */
function getOptionsString(options) {
  const cacheOptions = options.cache || {};
  // Start with a base of a few properties that need to be renamed, as well
  // as copying over all the other source properties as-is.
  const effectiveOptions = Object.assign({
    cacheName: cacheOptions.name,
  }, options);

  // Only create the cacheExpiration object if either maxEntries or
  // maxAgeSeconds is set.
  if (cacheOptions.maxEntries || cacheOptions.maxAgeSeconds) {
    effectiveOptions.cacheExpiration =
      Object.assign(effectiveOptions.cacheExpiration || {}, {
        maxEntries: cacheOptions.maxEntries,
        maxAgeSeconds: cacheOptions.maxAgeSeconds,
      });
  }

  // Everything should be copied to the corresponding new option names at this
  // point, so delete the old-style `cache` property if it's present.
  delete effectiveOptions.cache;

  // JSON.stringify() will automatically omit any properties that are set to
  // undefined values.
  return JSON.stringify(effectiveOptions, null, 2);
}

module.exports = (runtimeCaching) => {
  return runtimeCaching.map((entry) => {
    if (entry.method && entry.method !== 'GET') {
      throw new Error(errors['method-not-supported']);
    }

    if (!entry.urlPattern) {
      throw new Error(errors['urlPattern-is-required']);
    }

    if (!entry.handler) {
      throw new Error(errors['handler-is-required']);
    }

    const matcher = typeof entry.urlPattern === 'string' ?
      `'${entry.urlPattern}'` :
      entry.urlPattern;

    if (typeof entry.handler === 'string') {
      const handlerName = entry.handler === 'fastest' ?
        'staleWhileRevalidate' :
        entry.handler;

      const optionsString = getOptionsString(entry.options || {});

      const strategyString =
        `workboxSW.strategies.${handlerName}(${optionsString})`;

      return `workboxSW.router.registerRoute(` +
        `${matcher}, ${strategyString});`;
    } else if (typeof entry.handler === 'function') {
      return `workboxSW.router.registerRoute(` +
        `${matcher}, ${entry.handler});`;
    }
  }).filter((entry) => Boolean(entry)); // Remove undefined map() return values.
};
