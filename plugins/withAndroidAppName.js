// Sets the Android launcher label (strings.xml app_name) independently of expo.name.
// expo.name stays ASCII ("Scout des Apotres") because EAS Build derives the iOS Xcode
// target name from it and drops accented letters differently from prebuild, which
// breaks iOS builds. The accented name users see is set here (Android) and in
// ios.infoPlist.CFBundleDisplayName (iOS).
const { AndroidConfig, withStringsXml } = require('expo/config-plugins');

module.exports = function withAndroidAppName(config, appName) {
  return withStringsXml(config, (modConfig) => {
    modConfig.modResults = AndroidConfig.Strings.setStringItem(
      [AndroidConfig.Resources.buildResourceItem({ name: 'app_name', value: appName })],
      modConfig.modResults,
    );
    return modConfig;
  });
};
