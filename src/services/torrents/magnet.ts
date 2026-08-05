const TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://exodus.desync.com:6969/announce",
  "udp://tracker.openbittorrent.com:80",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://tracker.tiny-vps.com:6969/announce",
  "udp://tracker.moeking.me:6969/announce",
  "udp://tracker.dler.org:6969/announce",
  "udp://tracker.leech.ie:1337/announce",
  "udp://open.demonii.com:1337/announce",
  "udp://tracker.pirateparty.gr:6969/announce",
  "udp://9.rarbg.com:2710/announce",
  "udp://tracker.zer0day.to:1337/announce",
  "udp://tracker.birkenfeld.one:6969/announce",
  "udp://exodus.bit-torrent.com:6969/announce",
  "udp://p4p.arenabg.com:1337/announce",
  "udp://explodie.org:6969/announce",
  "udp://tracker.filemail.com:6969/announce",
  "udp://tracker.tamersunion.org:1337/announce",
  "udp://tracker.fnix.net:6969/announce",
  "udp://tracker.empire-js.us:1337/announce",
  "udp://tracker.crunchbang.sh:6969/announce",
  "udp://retracker.lanta-net.ru:2710/announce",
  "udp://tracker.swateam.org.uk:2710/announce",
  "udp://open.demonii.com:1337/announce",
  "udp://tracker.uw0.xyz:6969/announce",
  "https://tracker.gbitt.info:443/announce",
  "https://tracker.gbitt.info/announce",
  "http://tracker.gbitt.info:80/announce",
];

export const magnetFromHash = (hash: string, title: string): string => {
  const tr = TRACKERS.map((t) => `&tr=${encodeURIComponent(t)}`).join("");
  return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}${tr}`;
};
