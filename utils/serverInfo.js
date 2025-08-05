// utils/serverInfo.js
import os from 'os';
import chalk from 'chalk';

export const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const interfaceKey in interfaces) {
    for (const interfaceInfo of interfaces[interfaceKey]) {
      if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
        return interfaceInfo.address;
      }
    }
  }
  return '127.0.0.1';
};

export const displayServerInfo = (port, host, domainName = 'example.com') => {
  const localIp = getLocalIp();
  const consoleWidth = process.stdout.columns || 80;
  const border = "██";
  const maxContentLength = 51;

  const centerText = (text, maxWidth) => {
    const padding = Math.max(0, Math.floor((consoleWidth - maxWidth) / 2));
    return ' '.repeat(padding) + text;
  };

  const padLine = (content, maxContentLength) => {
    const padding = maxContentLength - content.length;
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = padding - leftPadding;
    return ' '.repeat(leftPadding) + content + ' '.repeat(rightPadding);
  };

  const lines = [
    "███████████████████████████████████████████████████████",
    `${border}${padLine('', maxContentLength)}${border}`,
    `${border}${padLine('B&S API SERVER 2020 STARTING NOW', maxContentLength)}${border}`,
    `${border}${padLine(`SERVER IS RUNNING ON PORT: ${port}`, maxContentLength)}${border}`,
    `${border}${padLine(`LOCAL IP ADDRESS: ${localIp}`, maxContentLength)}${border}`,
    domainName
      ? `${border}${padLine(`DOMAIN NAME: ${domainName}`, maxContentLength)}${border}`
      : `${border}${padLine('DOMAIN NAME: Not Configured', maxContentLength)}${border}`,
    `${border}${padLine(`ACCESS IT VIA: http://0.0.0.0:${port}`, maxContentLength)}${border}`,
    `${border}${padLine('', maxContentLength)}${border}`,
    "███████████████████████████████████████████████████████"
  ];

  lines.forEach(line => {
    console.warn(chalk.bold(centerText(line, lines[0].length)));
  });
  console.log();
};

export default {
  getLocalIp,
  displayServerInfo
};