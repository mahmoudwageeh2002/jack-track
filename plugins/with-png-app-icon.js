const { IOSConfig, withXcodeProject } = require('expo/config-plugins');

// Expo SDK 57 sets the asset name for Icon Composer (.icon), but does not
// restore AppIcon when an existing project switches back to a PNG source.
module.exports = function withPngAppIcon(config) {
  const icon = config.ios?.icon ?? config.icon;
  if (!icon || (typeof icon === 'string' && icon.endsWith('.icon'))) return config;

  return withXcodeProject(config, (mod) => {
    const [, target] = IOSConfig.Target.findNativeTargetByName(
      mod.modResults,
      mod.modRequest.projectName,
    );
    const configurations = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
      mod.modResults,
      target.buildConfigurationList,
    );
    for (const [, configuration] of configurations) {
      configuration.buildSettings.ASSETCATALOG_COMPILER_APPICON_NAME = 'AppIcon';
    }
    return mod;
  });
};
