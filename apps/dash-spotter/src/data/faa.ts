// the FAA airport status feed is xml. it lists ground stops, delay programs, closures and delays by airport code
export interface FaaStatus {
  code: string;
  // "Ground Stop", "Ground Delay Program", ...
  kind: string;
  reason: string | null;
  // text such as "47 minutes"
  avg: string | null;
}

export const FAA_URL = 'https://nasstatus.faa.gov/api/airport-status-information';

const tag = (block: string, name: string): string | null => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(block);
  const v = m?.[1]?.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  return v ? v : null;
};

const NICE: Record<string, string> = {
  'ground stops': 'Ground stop',
  'ground delay programs': 'Ground delay program',
  'airport closures': 'Airport closed',
  'arrival/departure delays': 'Delays',
  'delays by destination': 'Delays',
};

export function parseFaa(xml: string): FaaStatus[] {
  const out: FaaStatus[] = [];
  const types = xml.match(/<Delay_type>[\s\S]*?<\/Delay_type>/gi) ?? [];
  for (const block of types) {
    const rawName = tag(block, 'Name') ?? '';
    const kind = NICE[rawName.toLowerCase()] ?? (rawName || 'Delay');
    // each airport entry starts at its own ARPT tag and runs to the next one
    const parts = block.split(/(?=<ARPT>)/i).slice(1);
    for (const part of parts) {
      const code = tag(part, 'ARPT');
      if (!code) continue;
      out.push({ code: code.toUpperCase(), kind, reason: tag(part, 'Reason'), avg: tag(part, 'Avg') });
    }
  }
  return out;
}

// the entry for an airport. the feed uses the three letter code in the US
export function statusFor(list: FaaStatus[], iata: string): FaaStatus | null {
  return list.find(s => s.code === iata.toUpperCase()) ?? null;
}

export function faaLine(s: FaaStatus): string {
  const bits = [s.reason ? s.reason.toLowerCase() : null, s.avg ? `average ${s.avg}` : null].filter(Boolean);
  return bits.length ? `${s.kind}, ${bits.join(', ')}` : s.kind;
}
