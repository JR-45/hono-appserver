/// <reference types="bun" />
// @ts-expect-error -- Das Paket bringt keine eigenen TypeScript-Typen mit
import scanner from 'sonarqube-scanner';

scanner(
  {
    serverUrl: 'http://localhost:9000',
    token: Bun.env.SONAR_TOKEN,
    options: {
      'sonar.projectName': 'mitglied',
      'sonar.projectKey': 'mitglied',
      'sonar.sources': 'src',
      'sonar.tests': 'test',
      'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
      'sonar.test.inclusions': '**/*.test.mts, **/*.spec.mts',
    },
  },
  () => {
    console.log('SonarQube-Scan abgeschlossen.');
  },
);