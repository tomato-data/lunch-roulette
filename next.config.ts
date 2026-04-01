import type { NextConfig } from "next";
import { networkInterfaces } from "os";

function getLocalIPs(): string[] {
  const nets = networkInterfaces();
  const ips: string[] = [];
  for (const interfaces of Object.values(nets)) {
    for (const net of interfaces ?? []) {
      if (!net.internal && net.family === "IPv4") {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getLocalIPs(),
};

export default nextConfig;
