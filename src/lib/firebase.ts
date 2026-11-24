import { initializeApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  BankSubmission,
  BookingStatus,
  HouseType,
  INITIAL_CENTRO_UNITS,
  INITIAL_DEMO_LOANS,
  LoanStatusKey,
  TimelineEntry,
} from '../data/centroUnits';
import { maskNationalId, maskPhone, sha256Hex } from './cryptoMfa';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const PRIMARY_ADMIN_EMAIL = 'kritin.prom@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

export function logFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = logFirestoreError(error, operationType, path);
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export function mapAuthErrorThai(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err);
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return 'เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณากดปุ่มเข้าสู่ระบบแบบ Redirect ด้านล่าง';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'ปิดหน้าต่างเข้าสู่ระบบก่อนดำเนินการเสร็จสิ้น';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Authentication (Authorized Domains)';
  }
  return msg || 'เข้าสู่ระบบไม่สำเร็จ';
}

export async function signInWithGooglePopup(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, googleProvider);
      throw new Error('กำลังเปลี่ยนหน้าไปยัง Google Sign-In...');
    }
    throw new Error(mapAuthErrorThai(err));
  }
}

export async function signInWithGoogleRedirectFlow(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

export async function completeGoogleRedirectSignIn(): Promise<User | null> {
  try {
    const res = await getRedirectResult(auth);
    return res?.user || null;
  } catch {
    return null;
  }
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export interface UnitRecord {
  unitNo: string;
  houseType: HouseType;
  houseNumber: string;
  landAreaSqWah: number;
  usableAreaSqM: number;
  basePrice: number;
  bookingStatus: BookingStatus;
  updatedAt?: Timestamp;
}

export interface LoanApplicationRecord {
  appId: string;
  customerName: string;
  nationalId: string;
  phone: string;
  unitId: string;
  unitNo: string;
  houseType: string;
  houseNumber: string;
  landAreaSqWah: number;
  usableAreaSqM: number;
  contractPrice: number;
  bookingDeposit: number;
  loanAmount: number;
  approvedAmount: number;
  bankName: string;
  bankSubmissions?: BankSubmission[];
  interestRateNote: string;
  overallStatus: LoanStatusKey;
  advisorName: string;
  advisorPhone: string;
  remark: string;
  timeline: TimelineEntry[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LoanDossier {
  appId: string;
  customerName: string;
  maskedPhone: string;
  maskedNationalId: string;
  unitNo: string;
  houseType: HouseType;
  houseNumber: string;
  landAreaSqWah: number;
  usableAreaSqM: number;
  contractPrice: number;
  bookingDeposit: number;
  loanAmount: number;
  approvedAmount: number;
  bankName: string;
  bankSubmissions?: BankSubmission[];
  interestRateNote: string;
  overallStatus: LoanStatusKey;
  advisorName: string;
  advisorPhone: string;
  remark: string;
  timeline: TimelineEntry[];
  updatedAt?: Timestamp;
}

export function sanitizeLoanRecord(loan: LoanApplicationRecord): LoanApplicationRecord {
  const safeBankSubmissions = (loan.bankSubmissions || []).slice(0, 10).map((b) => ({
    bankName: String(b.bankName || '').slice(0, 100),
    status: b.status || 'submitted',
    requestedAmount: Math.max(0, Math.min(500000000, Number(b.requestedAmount) || 0)),
    approvedAmount: Math.max(0, Math.min(500000000, Number(b.approvedAmount) || 0)),
    interestRateNote: String(b.interestRateNote || '').slice(0, 160),
    remark: String(b.remark || '').slice(0, 500),
    updatedAtIso: String(b.updatedAtIso || new Date().toISOString()),
  }));

  const safeTimeline = (Array.isArray(loan.timeline) ? loan.timeline : [])
    .slice(-20)
    .map((t) => ({
      stepKey: String(t.stepKey || 'submitted').slice(0, 40),
      title: String(t.title || '').slice(0, 120),
      detail: String(t.detail || '').slice(0, 400),
      status: (t.status === 'done' || t.status === 'active' || t.status === 'warning'
        ? t.status
        : 'active') as 'done' | 'active' | 'warning',
      updatedAtIso: String(t.updatedAtIso || new Date().toISOString()),
      updatedBy: String(t.updatedBy || 'GAVIN Officer').slice(0, 100),
    }));

  return {
    appId: String(loan.appId).slice(0, 64),
    customerName: String(loan.customerName || 'ลูกค้าโครงการ Centro').trim().slice(0, 120) || 'ลูกค้าโครงการ Centro',
    nationalId: String(loan.nationalId || '').replace(/\D/g, '').slice(0, 13),
    phone: String(loan.phone || '').replace(/\D/g, '').slice(0, 10),
    unitId: String(loan.unitId || loan.unitNo).slice(0, 32),
    unitNo: String(loan.unitNo).slice(0, 16),
    houseType: String(loan.houseType).slice(0, 32),
    houseNumber: String(loan.houseNumber).slice(0, 20),
    landAreaSqWah: Math.max(1, Math.min(500, Number(loan.landAreaSqWah) || 50)),
    usableAreaSqM: Math.max(1, Math.min(1000, Number(loan.usableAreaSqM) || 150)),
    contractPrice: Math.max(0, Math.min(500000000, Number(loan.contractPrice) || 0)),
    bookingDeposit: Math.max(0, Math.min(500000000, Number(loan.bookingDeposit) || 0)),
    loanAmount: Math.max(0, Math.min(500000000, Number(loan.loanAmount) || 0)),
    approvedAmount: Math.max(0, Math.min(500000000, Number(loan.approvedAmount) || 0)),
    bankName: String(loan.bankName || 'ธนาคารไทยพาณิชย์ (SCB)').trim().slice(0, 240) || 'ธนาคารไทยพาณิชย์ (SCB)',
    bankSubmissions: safeBankSubmissions,
    interestRateNote: String(loan.interestRateNote || '').slice(0, 160),
    overallStatus: loan.overallStatus || 'submitted',
    advisorName: String(loan.advisorName || '').slice(0, 100),
    advisorPhone: String(loan.advisorPhone || '').slice(0, 20),
    remark: String(loan.remark || '').slice(0, 500),
    timeline: safeTimeline,
  };
}

export async function upsertLookupDocsForApplication(loan: LoanApplicationRecord) {
  const clean = sanitizeLoanRecord(loan);
  const phoneHash = await sha256Hex(`PHONE:${clean.phone}`);
  const nidHash = await sha256Hex(`NID:${clean.nationalId}`);

  const lookupPayload = {
    appId: clean.appId,
    customerName: clean.customerName,
    maskedPhone: maskPhone(clean.phone),
    maskedNationalId: maskNationalId(clean.nationalId),
    unitNo: clean.unitNo,
    houseType: clean.houseType as HouseType,
    houseNumber: clean.houseNumber,
    landAreaSqWah: clean.landAreaSqWah,
    usableAreaSqM: clean.usableAreaSqM,
    contractPrice: clean.contractPrice,
    bookingDeposit: clean.bookingDeposit,
    loanAmount: clean.loanAmount,
    approvedAmount: clean.approvedAmount,
    bankName: clean.bankName,
    bankSubmissions: clean.bankSubmissions || [],
    interestRateNote: clean.interestRateNote,
    overallStatus: clean.overallStatus,
    advisorName: clean.advisorName,
    advisorPhone: clean.advisorPhone,
    remark: clean.remark,
    timeline: clean.timeline,
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'loanLookups', phoneHash), lookupPayload);
  batch.set(doc(db, 'loanLookups', nidHash), lookupPayload);

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'loanLookups');
  }
}

export async function saveLoanApplicationToCloud(
  loan: LoanApplicationRecord,
  existingCreatedAt?: Timestamp
): Promise<LoanApplicationRecord> {
  const clean = sanitizeLoanRecord(loan);
  await setDoc(doc(db, 'loanApplications', clean.appId), {
    ...clean,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await upsertLookupDocsForApplication(clean);
  return clean;
}

function isCleanLookupDoc(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<LoanDossier>;
  return Boolean(
    d.appId &&
      d.customerName &&
      d.maskedPhone &&
      d.overallStatus &&
      Array.isArray(d.timeline)
  );
}

export async function seedCentroDatabase(): Promise<{
  unitsSeeded: number;
  loansSeeded: number;
  lookupsRepaired: number;
}> {
  let existingUnitIds = new Set<string>();
  try {
    const snap = await getDocs(collection(db, 'units'));
    existingUnitIds = new Set(snap.docs.map((d) => d.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'units');
  }

  const missingUnits = INITIAL_CENTRO_UNITS.filter((u) => !existingUnitIds.has(u.unitNo));
  let unitsSeeded = 0;
  if (missingUnits.length > 0) {
    const unitBatch = writeBatch(db);
    for (const u of missingUnits) {
      unitBatch.set(doc(db, 'units', u.unitNo), {
        unitNo: u.unitNo,
        houseType: u.houseType,
        houseNumber: u.houseNumber,
        landAreaSqWah: u.landAreaSqWah,
        usableAreaSqM: u.usableAreaSqM,
        basePrice: u.basePrice,
        bookingStatus: u.bookingStatus,
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await unitBatch.commit();
      unitsSeeded = missingUnits.length;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'units');
    }
  }

  let existingLoanDocs: Array<{ id: string; data: Record<string, unknown> }> = [];
  try {
    const loanSnap = await getDocs(collection(db, 'loanApplications'));
    existingLoanDocs = loanSnap.docs.map((d) => ({
      id: d.id,
      data: d.data() as Record<string, unknown>,
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'loanApplications');
  }

  const existingLoanIds = new Set(existingLoanDocs.map((d) => d.id));
  let lookupsRepaired = 0;

  // Repair/rebuild loanLookups for ALL existing loanApplications (including custom admin entries & legacy schema docs)
  for (const existingDoc of existingLoanDocs) {
    const raw = existingDoc.data as unknown as LoanApplicationRecord & {
      birthDate?: unknown;
      mfaPinHash?: unknown;
      lineLinked?: unknown;
      lineUserId?: unknown;
      lineLinkCode?: unknown;
    };
    const cleanPhone = String(raw.phone || '').replace(/\D/g, '');
    const cleanNid = String(raw.nationalId || '').replace(/\D/g, '');
    if (!/^0\d{9}$/.test(cleanPhone) || cleanNid.length !== 13) continue;

    const cleanRecord = sanitizeLoanRecord({
      ...raw,
      appId: raw.appId || existingDoc.id,
      phone: cleanPhone,
      nationalId: cleanNid,
    });

    const hasLegacyFields =
      'birthDate' in raw ||
      'mfaPinHash' in raw ||
      'lineLinked' in raw ||
      'lineUserId' in raw ||
      'lineLinkCode' in raw;

    try {
      const phoneHash = await sha256Hex(`PHONE:${cleanRecord.phone}`);
      const nidHash = await sha256Hex(`NID:${cleanRecord.nationalId}`);
      const [phoneLookupSnap, nidLookupSnap] = await Promise.all([
        getDoc(doc(db, 'loanLookups', phoneHash)),
        getDoc(doc(db, 'loanLookups', nidHash)),
      ]);

      const needsLookupWrite =
        !phoneLookupSnap.exists() ||
        !nidLookupSnap.exists() ||
        !isCleanLookupDoc(phoneLookupSnap.data()) ||
        !isCleanLookupDoc(nidLookupSnap.data());

      if (hasLegacyFields) {
        await saveLoanApplicationToCloud(cleanRecord, raw.createdAt);
        lookupsRepaired += 1;
      } else if (needsLookupWrite) {
        await upsertLookupDocsForApplication(cleanRecord);
        lookupsRepaired += 1;
      }
    } catch (err) {
      console.warn(`Repair skipped for ${existingDoc.id}:`, err);
    }
  }

  // Seed missing demo applications & their lookup docs
  let loansSeeded = 0;
  for (const demo of INITIAL_DEMO_LOANS) {
    if (existingLoanIds.has(demo.appId)) continue;
    const unitInfo = INITIAL_CENTRO_UNITS.find((u) => u.unitNo === demo.unitNo);
    if (!unitInfo) continue;

    const record: LoanApplicationRecord = {
      appId: demo.appId,
      customerName: demo.customerName,
      nationalId: demo.nationalId,
      phone: demo.phone,
      unitId: unitInfo.unitNo,
      unitNo: unitInfo.unitNo,
      houseType: unitInfo.houseType,
      houseNumber: unitInfo.houseNumber,
      landAreaSqWah: unitInfo.landAreaSqWah,
      usableAreaSqM: unitInfo.usableAreaSqM,
      contractPrice: demo.contractPrice,
      bookingDeposit: demo.bookingDeposit,
      loanAmount: demo.loanAmount,
      approvedAmount: demo.approvedAmount,
      bankName: demo.bankName,
      bankSubmissions: demo.bankSubmissions,
      interestRateNote: demo.interestRateNote,
      overallStatus: demo.overallStatus,
      advisorName: demo.advisorName,
      advisorPhone: demo.advisorPhone,
      remark: demo.remark,
      timeline: demo.timeline,
    };

    try {
      await saveLoanApplicationToCloud(record);
      loansSeeded += 1;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `loanApplications/${demo.appId}`);
    }
  }

  return { unitsSeeded, loansSeeded, lookupsRepaired };
}
