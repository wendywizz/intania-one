const fs = require('fs');
const path = require('path');

const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');

const NETWORK_SECURITY_RESOURCE = '@xml/scooba_network_security_config';

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config>
    <domain includeSubdomains="true">apis.eng.psu.ac.th</domain>
    <trust-anchors>
      <certificates src="system" />
      <certificates src="@raw/sectigo_public_server_authentication_root_e46" />
    </trust-anchors>
  </domain-config>
</network-security-config>
`;

const SECTIGO_PUBLIC_SERVER_AUTHENTICATION_ROOT_E46 = `-----BEGIN CERTIFICATE-----
MIICOjCCAcGgAwIBAgIQQvLM2htpN0RfFf51KBC49DAKBggqhkjOPQQDAzBfMQswCQYDVQQGEwJH
QjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQDEy1TZWN0aWdvIFB1YmxpYyBTZXJ2
ZXIgQXV0aGVudGljYXRpb24gUm9vdCBFNDYwHhcNMjEwMzIyMDAwMDAwWhcNNDYwMzIxMjM1OTU5
WjBfMQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQDEy1TZWN0
aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBFNDYwdjAQBgcqhkjOPQIBBgUr
gQQAIgNiAAR2+pmpbiDt+dd34wc7qNs9Xzjoq1WmVk/WSOrsfy2qw7LFeeyZYX8QeccCWvkEN/U0
NSt3zn8gj1KjAIns1aeibVvjS5KToID1AZTc8GgHHs3u/iVStSBDHBv+6xnOQ6OjQjBAMB0GA1Ud
DgQWBBTRItpMWfFLXyY4qp3W7usNw/upYTAOBgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB
/zAKBggqhkjOPQQDAwNnADBkAjAn7qRaqCG76UeXlImldCBteU/IvZNeWBj7LRoAasm4PdCkT0RH
lAFWovgzJQxC36oCMB3q4S6ILuH5px0CMk7yn2xVdOOurvulGu7t0vzCAxHrRVxgED1cf5kDW21U
SAGKcw==
-----END CERTIFICATE-----
`;

const withScoobaAndroidNetworkSecurity = (config) => {
  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    mainApplication.$['android:networkSecurityConfig'] = NETWORK_SECURITY_RESOURCE;
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resRoot = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      const xmlRoot = path.join(resRoot, 'xml');
      const rawRoot = path.join(resRoot, 'raw');

      await fs.promises.mkdir(xmlRoot, { recursive: true });
      await fs.promises.mkdir(rawRoot, { recursive: true });
      await fs.promises.writeFile(
        path.join(xmlRoot, 'scooba_network_security_config.xml'),
        NETWORK_SECURITY_XML,
      );
      await fs.promises.writeFile(
        path.join(rawRoot, 'sectigo_public_server_authentication_root_e46.pem'),
        SECTIGO_PUBLIC_SERVER_AUTHENTICATION_ROOT_E46,
      );

      return config;
    },
  ]);

  return config;
};

module.exports = createRunOncePlugin(
  withScoobaAndroidNetworkSecurity,
  'with-android-scooba-network-security',
  '1.0.0',
);
