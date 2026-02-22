const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 모노레포 루트의 node_modules도 탐색하도록 설정
config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// react / react-dom / react-native는 앱의 node_modules에서만 resolve하여 단일 인스턴스 보장
const singleInstancePackages = ['react', 'react-dom', 'react-native'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const pkg of singleInstancePackages) {
    if (moduleName === pkg || moduleName.startsWith(pkg + '/')) {
      return {
        filePath: require.resolve(moduleName, { paths: [projectRoot] }),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
