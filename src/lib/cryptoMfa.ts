// Client-side lookup normalization, SHA-256 hashing, masking, and currency formatting

const TEXT_ENCODER = new TextEncoder();

export function normalizeLookupInput(raw: string): string {
  return raw.replace(/[\s-]/g, '').trim();
}

export function isValidPhone10(value: string): boolean {
  return /^0\d{9}$/.test(value);
}

export function isValidNationalId13(value: string): boolean {
  return /^\d{13}$/.test(value);
}

export function maskPhone(phone10: string): string {
  if (phone10.length !== 10) return 'xxx-xxx-xxxx';
  return `${phone10.slice(0, 3)}-xxx-${phone10.slice(6)}`;
}

export function maskNationalId(nid13: string): string {
  if (nid13.length !== 13) return 'x-xxxx-xxxxx-xx-x';
  return `${nid13[0]}-xxxx-xxxxx-${nid13.slice(10, 12)}-${nid13[12]}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', TEXT_ENCODER.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeLookupHash(identifier: string): Promise<{
  kind: 'PHONE' | 'NID';
  normalized: string;
  hash: string;
}> {
  const normalized = normalizeLookupInput(identifier);
  if (isValidPhone10(normalized)) {
    const hash = await sha256Hex(`PHONE:${normalized}`);
    return { kind: 'PHONE', normalized, hash };
  }
  if (isValidNationalId13(normalized)) {
    const hash = await sha256Hex(`NID:${normalized}`);
    return { kind: 'NID', normalized, hash };
  }
  throw new Error('กรุณากรอกเบอร์โทรศัพท์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก (ไม่ต้องใส่ขีด -)');
}

export function formatThb(amount: number): string {
  return new Intl.NumberFormat('th-TH').format(Math.round(amount || 0)) + ' บาท';
}
