export type HouseType =
  | 'ZOTICUS'
  | 'LUKE'
  | 'INIZIO'
  | 'ABLE'
  | 'PHOENIX'
  | 'ETHAN'
  | 'ZERA';

export type BookingStatus =
  | 'available'
  | 'reserved'
  | 'loan_in_progress'
  | 'transferred';

export type LoanStatusKey =
  | 'submitted'
  | 'doc_review'
  | 'pre_approved'
  | 'appraisal'
  | 'bank_approved'
  | 'transfer_scheduled'
  | 'need_docs'
  | 'rejected';

export interface CentroUnitSeed {
  unitNo: string;
  houseType: HouseType;
  houseNumber: string;
  landAreaSqWah: number;
  usableAreaSqM: number;
  basePrice: number;
  bookingStatus: BookingStatus;
}

export interface HouseTypeSpec {
  type: HouseType;
  usableSqM: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  baseStartingPrice: number;
  highlightTh: string;
}

export const HOUSE_TYPE_SPECS: Record<HouseType, HouseTypeSpec> = {
  ZOTICUS: {
    type: 'ZOTICUS',
    usableSqM: 289,
    bedrooms: 4,
    bathrooms: 5,
    parking: 3,
    baseStartingPrice: 14900000,
    highlightTh: 'คฤหาสน์หรูรุ่นใหญ่ Double Volume Living พร้อมห้องนอนชั้นล่างและห้องแม่บ้าน',
  },
  LUKE: {
    type: 'LUKE',
    usableSqM: 260,
    bedrooms: 4,
    bathrooms: 5,
    parking: 3,
    baseStartingPrice: 12890000,
    highlightTh: 'บ้านเดี่ยวฟังก์ชัน 4 ห้องนอน 3 ที่จอดรถ พร้อม Master Suite ขนาดใหญ่และ Walk-in Closet',
  },
  INIZIO: {
    type: 'INIZIO',
    usableSqM: 209,
    bedrooms: 4,
    bathrooms: 4,
    parking: 2,
    baseStartingPrice: 10490000,
    highlightTh: 'บ้านเดี่ยวสไตล์โมเดิร์นลงตัวทุกเจเนอเรชัน ห้องรับแขกเชื่อมสวนส่วนตัว',
  },
  ABLE: {
    type: 'ABLE',
    usableSqM: 190,
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    baseStartingPrice: 9490000,
    highlightTh: 'พื้นที่ใช้สอยกว้าง 190 ตร.ม. รองรับครอบครัวขยายพร้อมห้องอเนกประสงค์ชั้นล่าง',
  },
  PHOENIX: {
    type: 'PHOENIX',
    usableSqM: 181,
    bedrooms: 3,
    bathrooms: 3,
    parking: 2,
    baseStartingPrice: 8890000,
    highlightTh: 'แบบบ้านโปร่งสบาย เน้นแสงธรรมชาติและพื้นที่เชื่อมมุมทานอาหารกับครัวไทย',
  },
  ETHAN: {
    type: 'ETHAN',
    usableSqM: 175,
    bedrooms: 3,
    bathrooms: 3,
    parking: 2,
    baseStartingPrice: 8290000,
    highlightTh: 'บ้านเดี่ยวเริ่มต้นสำหรับครอบครัวรุ่นใหม่ ฟังก์ชันครบครันเป็นสัดส่วน',
  },
  ZERA: {
    type: 'ZERA',
    usableSqM: 164,
    bedrooms: 3,
    bathrooms: 3,
    parking: 2,
    baseStartingPrice: 7590000,
    highlightTh: 'กะทัดรัดหรูหรา ดูแลรักษาง่าย บนทำเลเชื่อมต่อพระราม 2 – พุทธบูชา',
  },
};

export const LOAN_STATUS_META: Record<
  LoanStatusKey,
  { labelTh: string; shortTh: string; stepIndex: number; tone: 'neutral' | 'amber' | 'emerald' | 'crimson' }
> = {
  submitted: {
    labelTh: 'รับเอกสารยื่นกู้ครบถ้วน',
    shortTh: 'ยื่นเอกสารแล้ว',
    stepIndex: 1,
    tone: 'neutral',
  },
  doc_review: {
    labelTh: 'ตรวจสอบเครดิตบูโรและวิเคราะห์รายได้',
    shortTh: 'ตรวจบูโร & รายได้',
    stepIndex: 2,
    tone: 'neutral',
  },
  pre_approved: {
    labelTh: 'ผ่านการพิจารณาเบื้องต้น (Pre-Approve)',
    shortTh: 'Pre-Approve ผ่าน',
    stepIndex: 3,
    tone: 'neutral',
  },
  appraisal: {
    labelTh: 'เจ้าหน้าที่ธนาคารเข้าประเมินราคาหลักทรัพย์',
    shortTh: 'ประเมินหลักทรัพย์',
    stepIndex: 4,
    tone: 'neutral',
  },
  bank_approved: {
    labelTh: 'ธนาคารอนุมัติวงเงินสินเชื่อสมบูรณ์',
    shortTh: 'อนุมัติวงเงินแล้ว',
    stepIndex: 5,
    tone: 'emerald',
  },
  transfer_scheduled: {
    labelTh: 'นัดหมายเซ็นสัญญาและวันโอนกรรมสิทธิ์',
    shortTh: 'นัดโอนกรรมสิทธิ์',
    stepIndex: 6,
    tone: 'emerald',
  },
  need_docs: {
    labelTh: 'ขอเอกสารทางการเงินเพิ่มเติมจากลูกค้า',
    shortTh: 'ขอเอกสารเพิ่มเติม',
    stepIndex: 2,
    tone: 'amber',
  },
  rejected: {
    labelTh: 'ไม่ผ่านเกณฑ์พิจารณา / รอยื่นธนาคารสำรอง',
    shortTh: 'ไม่ผ่านเกณฑ์',
    stepIndex: 2,
    tone: 'crimson',
  },
};

export const THAI_BANKS = [
  'ธนาคารไทยพาณิชย์ (SCB)',
  'ธนาคารกสิกรไทย (KBank)',
  'ธนาคารกรุงเทพ (BBL)',
  'ธนาคารกรุงไทย (KTB)',
  'ธนาคารกรุงศรีอยุธยา (Krungsri)',
  'ธนาคารทหารไทยธนชาต (ttb)',
  'ธนาคารอาคารสงเคราะห์ (GHB)',
];

// Raw rows verbatim from /public/assets/aistudio/Untitled_spreadsheet_76af65fc
const RAW_CENTRO_ROWS: Array<[string, HouseType, string, number, number]> = [
  ['A01', 'ZOTICUS', '9/1', 86.1, 289],
  ['A02', 'LUKE', '9/2', 75.9, 260],
  ['A03', 'ZOTICUS', '9/3', 84.7, 289],
  ['A04', 'LUKE', '9/4', 74.1, 260],
  ['B02', 'LUKE', '9/11', 63.7, 260],
  ['B06', 'LUKE', '9/32', 67.9, 260],
  ['C10', 'INIZIO', '9/42', 78, 209],
  ['D01', 'INIZIO', '9/43', 85.6, 209],
  ['I12', 'LUKE', '9/101', 62.3, 260],
  ['I13', 'LUKE', '9/102', 76, 260],
  ['I14', 'PHOENIX', '9/103', 71.6, 181],
  ['I15', 'ETHAN', '9/104', 61.5, 175],
  ['I16', 'PHOENIX', '9/105', 57.2, 181],
  ['I17', 'ETHAN', '9/106', 54.7, 175],
  ['J01', 'ZOTICUS', '9/89', 74.1, 289],
  ['J02', 'INIZIO', '9/88', 53.2, 209],
  ['J03', 'ZERA', '9/87', 53.2, 164],
  ['J04', 'INIZIO', '9/86', 53.2, 209],
  ['J05', 'LUKE', '9/85', 57, 260],
  ['J06', 'LUKE', '9/84', 57, 260],
  ['J09', 'INIZIO', '9/81', 53.2, 209],
  ['J10', 'ZERA', '9/80', 53.2, 164],
  ['J11', 'LUKE', '9/79', 64.6, 260],
  ['J12', 'LUKE', '9/78', 66.8, 260],
  ['J13', 'PHOENIX', '9/111', 57.8, 181],
  ['J14', 'ETHAN', '9/110', 51.6, 175],
  ['J15', 'ETHAN', '9/109', 51.6, 175],
  ['J16', 'PHOENIX', '9/108', 51.6, 181],
  ['J17', 'ETHAN', '9/107', 61.4, 175],
  ['K02', 'ABLE', '9/66', 60.5, 190],
  ['K03', 'INIZIO', '9/67', 60, 209],
  ['K04', 'ABLE', '9/68', 60.1, 190],
  ['K05', 'ETHAN', '9/69', 53.2, 175],
  ['K06', 'ETHAN', '9/70', 53.4, 175],
  ['K07', 'PHOENIX', '9/71', 53.5, 181],
  ['K08', 'ETHAN', '9/72', 53.7, 175],
  ['K09', 'PHOENIX', '9/73', 53.8, 181],
  ['K10', 'INIZIO', '9/74', 61.2, 209],
  ['K11', 'ZERA', '9/75', 61.4, 164],
  ['K12', 'LUKE', '9/76', 66, 260],
  ['K13', 'ZOTICUS', '9/77', 80.9, 289],
  ['K14', 'PHOENIX', '9/112', 54.9, 181],
  ['K15', 'ETHAN', '9/113', 51.6, 175],
  ['K16', 'LUKE', '9/114', 68.9, 260],
  ['K17', 'ZOTICUS', '9/115', 88.8, 289],
  ['L01', 'ZOTICUS', '9/116', 85.7, 289],
  ['L02', 'LUKE', '9/117', 64.7, 260],
  ['L03', 'ETHAN', '9/118', 51.6, 175],
  ['L04', 'PHOENIX', '9/119', 61.2, 181],
  ['L05', 'ZOTICUS', '9/120', 79.3, 289],
  ['L06', 'LUKE', '9/121', 64, 260],
  ['L07', 'ZOTICUS', '9/122', 79.8, 289],
  ['M01', 'ZOTICUS', '9/123', 70.3, 289],
  ['M02', 'LUKE', '9/124', 68, 260],
  ['M03', 'ZOTICUS', '9/125', 77, 289],
  ['M04', 'PHOENIX', '9/126', 65.7, 181],
  ['M05', 'ETHAN', '9/127', 56, 175],
  ['M06', 'PHOENIX', '9/128', 56, 181],
  ['M07', 'LUKE', '9/129', 88.1, 260],
  ['N01', 'INIZIO', '9/130', 60.8, 209],
  ['N02', 'ZERA', '9/131', 56.7, 164],
  ['N03', 'LUKE', '9/132', 68.9, 260],
  ['N04', 'INIZIO', '9/133', 60.8, 209],
  ['N05', 'INIZIO', '9/134', 56.7, 209],
  ['N06', 'INIZIO', '9/135', 56.7, 209],
  ['N07', 'INIZIO', '9/136', 56.7, 209],
  ['N08', 'ZOTICUS', '9/137', 70.9, 289],
  ['N09', 'ZOTICUS', '9/138', 73, 289],
  ['N10', 'ZOTICUS', '9/139', 81.5, 289],
  ['N11', 'ETHAN', '9/140', 70, 175],
  ['N12', 'INIZIO', '9/141', 64.1, 209],
  ['N13', 'ZERA', '9/142', 64.8, 164],
  ['N14', 'INIZIO', '9/143', 65.5, 209],
  ['N15', 'INIZIO', '9/144', 75.3, 209],
];

const DEMO_BOOKED_STATUS: Record<string, BookingStatus> = {
  A01: 'loan_in_progress',
  B02: 'loan_in_progress',
  C10: 'loan_in_progress',
  K02: 'reserved',
};

function computeUnitPrice(houseType: HouseType, landAreaSqWah: number): number {
  const spec = HOUSE_TYPE_SPECS[houseType];
  const standardLand = houseType === 'ZOTICUS' ? 74 : houseType === 'LUKE' ? 63 : 53;
  const extraWah = Math.max(0, landAreaSqWah - standardLand);
  return Math.round((spec.baseStartingPrice + extraWah * 95000) / 10000) * 10000;
}

export const INITIAL_CENTRO_UNITS: CentroUnitSeed[] = RAW_CENTRO_ROWS.map(
  ([unitNo, houseType, houseNumber, landAreaSqWah, usableAreaSqM]) => ({
    unitNo,
    houseType,
    houseNumber,
    landAreaSqWah,
    usableAreaSqM,
    basePrice: computeUnitPrice(houseType, landAreaSqWah),
    bookingStatus: DEMO_BOOKED_STATUS[unitNo] || 'available',
  })
);

export interface TimelineEntry {
  stepKey: string;
  title: string;
  detail: string;
  status: 'done' | 'active' | 'warning';
  updatedAtIso: string;
  updatedBy: string;
}

export interface BankSubmission {
  bankName: string;
  status: LoanStatusKey;
  requestedAmount: number;
  approvedAmount: number;
  interestRateNote: string;
  remark: string;
  updatedAtIso: string;
}

export interface DemoLoanSeed {
  appId: string;
  customerName: string;
  nationalId: string;
  phone: string;
  unitNo: string;
  contractPrice: number;
  bookingDeposit: number;
  loanAmount: number;
  approvedAmount: number;
  bankName: string;
  bankSubmissions: BankSubmission[];
  interestRateNote: string;
  overallStatus: LoanStatusKey;
  advisorName: string;
  advisorPhone: string;
  remark: string;
  timeline: TimelineEntry[];
}

export const INITIAL_DEMO_LOANS: DemoLoanSeed[] = [
  {
    appId: 'GV-A01-2026',
    customerName: 'คุณธนกร วรโชติเจริญ',
    nationalId: '1100400891234',
    phone: '0891234567',
    unitNo: 'A01',
    contractPrice: 15950000,
    bookingDeposit: 200000,
    loanAmount: 14500000,
    approvedAmount: 14500000,
    bankName: 'ธนาคารไทยพาณิชย์ (SCB), ธนาคารกสิกรไทย (KBank), ธนาคารกรุงศรีอยุธยา (Krungsri)',
    bankSubmissions: [
      {
        bankName: 'ธนาคารไทยพาณิชย์ (SCB)',
        status: 'bank_approved',
        requestedAmount: 14500000,
        approvedAmount: 14500000,
        interestRateNote: 'MRR-4.15% เฉลี่ย 3 ปีแรก 2.95% · ฟรีค่าจดจำนอง',
        remark: 'อนุมัติวงเงินเต็ม 100% พร้อมนัดเซ็นสัญญา',
        updatedAtIso: '2026-11-22T09:45:00+07:00',
      },
      {
        bankName: 'ธนาคารกสิกรไทย (KBank)',
        status: 'appraisal',
        requestedAmount: 14500000,
        approvedAmount: 0,
        interestRateNote: 'เฉลี่ย 3 ปีแรก 3.10%',
        remark: 'อยู่ระหว่างสรุปราคาประเมินหลักทรัพย์',
        updatedAtIso: '2026-11-21T14:20:00+07:00',
      },
      {
        bankName: 'ธนาคารกรุงศรีอยุธยา (Krungsri)',
        status: 'pre_approved',
        requestedAmount: 14000000,
        approvedAmount: 0,
        interestRateNote: 'เฉลี่ย 3 ปีแรก 3.15%',
        remark: 'ผ่าน Pre-Approve รอนัดเข้าประเมิน',
        updatedAtIso: '2026-11-20T11:00:00+07:00',
      },
    ],
    interestRateNote: 'MRR-4.15% เฉลี่ย 3 ปีแรก 2.95% · ฟรีค่าจดจำนอง',
    overallStatus: 'bank_approved',
    advisorName: 'คุณศิริพร รัตนวงศ์ (GAVIN Senior Mortgage)',
    advisorPhone: '02-098-7410',
    remark: 'ธนาคารอนุมัติวงเงินเต็ม 100% ตามยอดขอกู้แล้ว อยู่ระหว่างประสานวันนัดเซ็นสัญญากับฝ่ายโอนโครงการ Centro',
    timeline: [
      {
        stepKey: 'submitted',
        title: 'รับเอกสารยื่นขอสินเชื่อครบถ้วน',
        detail: 'ยื่นสำเนาบัตรประชาชน สลิปเงินเดือน 6 เดือน และหน้าสัญญาจองแปลง A01 (บ้านเลขที่ 9/1)',
        status: 'done',
        updatedAtIso: '2026-11-04T10:15:00+07:00',
        updatedBy: 'GAVIN Mortgage Desk',
      },
      {
        stepKey: 'doc_review',
        title: 'ตรวจสอบข้อมูลเครดิตบูโรและรายได้สุทธิ',
        detail: 'ผล NCB ปกติ ภาระหนี้ต่อรายได้อยู่ในเกณฑ์ดีเยี่ยม',
        status: 'done',
        updatedAtIso: '2026-11-08T14:30:00+07:00',
        updatedBy: 'SCB Credit Analyst',
      },
      {
        stepKey: 'pre_approved',
        title: 'ผ่านการพิจารณาเบื้องต้น (Pre-Approve)',
        detail: 'วงเงินเบื้องต้นผ่านเกณฑ์ 14,500,000 บาท',
        status: 'done',
        updatedAtIso: '2026-11-12T11:20:00+07:00',
        updatedBy: 'SCB Mortgage Center',
      },
      {
        stepKey: 'appraisal',
        title: 'เข้าประเมินราคาหลักทรัพย์โครงการ Centro',
        detail: 'บริษัทประเมินเข้าสำรวจบ้านเลขที่ 9/1 แบบ ZOTICUS (86.1 ตร.ว. / 289 ตร.ม.) เรียบร้อย',
        status: 'done',
        updatedAtIso: '2026-11-16T16:00:00+07:00',
        updatedBy: 'Appraisal Team',
      },
      {
        stepKey: 'bank_approved',
        title: 'ธนาคารอนุมัติสินเชื่อสมบูรณ์ (Final Approved)',
        detail: 'อนุมัติวงเงิน 14,500,000 บาท อัตราดอกเบี้ยพิเศษ 3 ปีแรก 2.95%',
        status: 'active',
        updatedAtIso: '2026-11-22T09:45:00+07:00',
        updatedBy: 'คุณศิริพร รัตนวงศ์',
      },
    ],
  },
  {
    appId: 'GV-B02-2026',
    customerName: 'คุณณัฐวดี สิริวัฒนากุล',
    nationalId: '1101500442211',
    phone: '0819876543',
    unitNo: 'B02',
    contractPrice: 12960000,
    bookingDeposit: 150000,
    loanAmount: 11800000,
    approvedAmount: 0,
    bankName: 'ธนาคารกสิกรไทย (KBank), ธนาคารกรุงเทพ (BBL)',
    bankSubmissions: [
      {
        bankName: 'ธนาคารกสิกรไทย (KBank)',
        status: 'appraisal',
        requestedAmount: 11800000,
        approvedAmount: 0,
        interestRateNote: 'อยู่ระหว่างประเมินหลักทรัพย์ · คาดรู้ผลวงเงินภายใน 3 วันทำการ',
        remark: 'เจ้าหน้าที่ประเมินเข้าตรวจบ้านเรียบร้อย รอสรุปเล่มประเมิน',
        updatedAtIso: '2026-11-23T11:40:00+07:00',
      },
      {
        bankName: 'ธนาคารกรุงเทพ (BBL)',
        status: 'pre_approved',
        requestedAmount: 11800000,
        approvedAmount: 0,
        interestRateNote: 'ดอกเบี้ยคงที่ปีแรก 2.85%',
        remark: 'ผ่าน Pre-Approve เบื้องต้นแล้ว',
        updatedAtIso: '2026-11-21T16:00:00+07:00',
      },
    ],
    interestRateNote: 'อยู่ระหว่างประเมินหลักทรัพย์ · คาดรู้ผลวงเงินภายใน 3 วันทำการ',
    overallStatus: 'appraisal',
    advisorName: 'คุณปภาวรินทร์ จันทร์เพ็ญ (GAVIN Financial)',
    advisorPhone: '02-098-7412',
    remark: 'เจ้าหน้าที่ประเมินราคาเข้าตรวจบ้านเลขที่ 9/11 แล้ว รอสรุปรายงานราคาประเมินส่งกลับธนาคารกสิกรไทย',
    timeline: [
      {
        stepKey: 'submitted',
        title: 'รับเอกสารยื่นขอสินเชื่อครบถ้วน',
        detail: 'ยื่นเอกสารประกอบธุรกิจส่วนตัวและรายการเดินบัญชี 12 เดือน',
        status: 'done',
        updatedAtIso: '2026-11-10T09:30:00+07:00',
        updatedBy: 'GAVIN Mortgage Desk',
      },
      {
        stepKey: 'doc_review',
        title: 'ตรวจสอบข้อมูลเครดิตบูโรและวิเคราะห์งบการเงิน',
        detail: 'ผ่านเกณฑ์การตรวจสอบเบื้องต้น',
        status: 'done',
        updatedAtIso: '2026-11-15T15:10:00+07:00',
        updatedBy: 'KBank Underwriting',
      },
      {
        stepKey: 'pre_approved',
        title: 'ผ่าน Pre-Approve ยื่นกู้ 11,800,000 บาท',
        detail: 'ส่งเรื่องเข้าสู่ขั้นตอนประเมินราคาหลักทรัพย์',
        status: 'done',
        updatedAtIso: '2026-11-19T13:00:00+07:00',
        updatedBy: 'KBank Home Loan',
      },
      {
        stepKey: 'appraisal',
        title: 'อยู่ระหว่างจัดทำรายงานประเมินราคาบ้าน',
        detail: 'ยูนิต B02 บ้านเลขที่ 9/11 แบบ LUKE (63.7 ตร.ว. / 260 ตร.ม.)',
        status: 'active',
        updatedAtIso: '2026-11-23T11:40:00+07:00',
        updatedBy: 'คุณปภาวรินทร์ จันทร์เพ็ญ',
      },
    ],
  },
  {
    appId: 'GV-C10-2026',
    customerName: 'คุณกิตติภพ เตชะไพบูลย์',
    nationalId: '3100900778899',
    phone: '0865554321',
    unitNo: 'C10',
    contractPrice: 12860000,
    bookingDeposit: 100000,
    loanAmount: 11500000,
    approvedAmount: 0,
    bankName: 'ธนาคารกรุงเทพ (BBL), ธนาคารทหารไทยธนชาต (ttb)',
    bankSubmissions: [
      {
        bankName: 'ธนาคารกรุงเทพ (BBL)',
        status: 'need_docs',
        requestedAmount: 11500000,
        approvedAmount: 0,
        interestRateNote: 'ขอเอกสาร Statement เพิ่มเติมเดือนล่าสุด',
        remark: 'กรุณาส่ง Statement เดือนล่าสุดเพิ่มเติม 1 เดือน',
        updatedAtIso: '2026-11-22T17:15:00+07:00',
      },
      {
        bankName: 'ธนาคารทหารไทยธนชาต (ttb)',
        status: 'doc_review',
        requestedAmount: 11500000,
        approvedAmount: 0,
        interestRateNote: 'อยู่ระหว่างวิเคราะห์รายได้และเครดิตบูโร',
        remark: 'อยู่ระหว่างพิจารณาเอกสารเบื้องต้น',
        updatedAtIso: '2026-11-22T10:30:00+07:00',
      },
    ],
    interestRateNote: 'ขอเอกสาร Statement เพิ่มเติมเดือนล่าสุด',
    overallStatus: 'need_docs',
    advisorName: 'คุณศิริพร รัตนวงศ์ (GAVIN Senior Mortgage)',
    advisorPhone: '02-098-7410',
    remark: 'กรุณาส่ง Statement บัญชีเงินฝากเพิ่มเติมอีก 1 เดือน และหนังสือรับรองโบนัสปีล่าสุดให้เจ้าหน้าที่ GAVIN เพื่อเร่งพิจารณา',
    timeline: [
      {
        stepKey: 'submitted',
        title: 'รับเอกสารยื่นขอสินเชื่อเบื้องต้น',
        detail: 'บันทึกข้อมูลยูนิต C10 บ้านเลขที่ 9/42 แบบ INIZIO (78 ตร.ว.)',
        status: 'done',
        updatedAtIso: '2026-11-18T10:00:00+07:00',
        updatedBy: 'GAVIN Mortgage Desk',
      },
      {
        stepKey: 'need_docs',
        title: 'ธนาคารขอเอกสารทางการเงินเพิ่มเติม',
        detail: 'ขอ Statement เดือนล่าสุดและหนังสือรับรองรายได้พิเศษ',
        status: 'warning',
        updatedAtIso: '2026-11-22T17:15:00+07:00',
        updatedBy: 'คุณศิริพร รัตนวงศ์',
      },
    ],
  },
];
