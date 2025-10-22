module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      '@babel/plugin-transform-nullish-coalescing-operator',
      // Ajoutez d'autres plugins si nécessaire
    ],
  };
};
