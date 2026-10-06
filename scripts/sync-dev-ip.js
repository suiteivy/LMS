const os = require('os');
const fs = require('fs');
const path = require('path');

function getPrimaryLanIp() {
  const allIpv4 = Object.entries(os.networkInterfaces())
    .flatMap(([name, ifaces]) => (ifaces || []).map(iface => ({ ...iface, name })))
    .filter(n => n.family === 'IPv4' && !n.internal && !n.address.startsWith('169.254.'));

  // Prioritize active Wi-Fi, standard LAN subnets (192.168.x.x, 10.x.x.x), and physical adapters
  // Filter out virtual adapters (Hyper-V, WSL, vEthernet, VirtualBox, VMware)
  const physicalIpv4 = allIpv4.filter(n => !/virtual|vethernet|wsl|vbox|vmware|switch/i.test(n.name));

  const bestIface =
    physicalIpv4.find(n => /wi-?fi|wlan/i.test(n.name)) ||
    physicalIpv4.find(n => n.address.startsWith('192.168.')) ||
    physicalIpv4.find(n => n.address.startsWith('10.')) ||
    physicalIpv4[0] ||
    allIpv4.find(n => n.address.startsWith('192.168.')) ||
    allIpv4[0];

  return bestIface ? { ip: bestIface.address, name: bestIface.name } : null;
}

function syncEnvFile() {
  const detected = getPrimaryLanIp();
  if (!detected) {
    console.warn('[LMS IP Sync] Could not detect an active LAN IP address.');
    return;
  }

  const { ip, name } = detected;
  const envPath = path.resolve(__dirname, '..', 'frontend', '.env');

  if (!fs.existsSync(envPath)) {
    console.warn(`[LMS IP Sync] ${envPath} not found. Skipping sync.`);
    return;
  }

  let content = fs.readFileSync(envPath, 'utf8');
  const ipRegex = /^EXPO_PUBLIC_DEV_LAN_IP=.*$/m;

  if (ipRegex.test(content)) {
    const currentMatch = content.match(ipRegex);
    const currentVal = currentMatch ? currentMatch[0].split('=')[1]?.trim() : '';

    if (currentVal === ip) {
      console.log(`[LMS IP Sync] EXPO_PUBLIC_DEV_LAN_IP is already up to date: ${ip} (${name})`);
      return;
    }

    content = content.replace(ipRegex, `EXPO_PUBLIC_DEV_LAN_IP=${ip}`);
  } else {
    content += `\nEXPO_PUBLIC_DEV_LAN_IP=${ip}\n`;
  }

  fs.writeFileSync(envPath, content, 'utf8');
  console.log(`[LMS IP Sync] Updated EXPO_PUBLIC_DEV_LAN_IP in frontend/.env to ${ip} (Interface: ${name})`);
}

syncEnvFile();
