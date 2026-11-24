import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Database,
  LogOut,
  Plus,
  ShieldCheck,
  Edit3,
  Search,
  Building2,
  Save,
} from 'lucide-react';
import {
  BankSubmission,
  BookingStatus,
  LOAN_STATUS_META,
  LoanStatusKey,
  THAI_BANKS,
  TimelineEntry,
} from '../data/centroUnits';
import { formatThb } from '../lib/cryptoMfa';
import {
  db,
  LoanApplicationRecord,
  logFirestoreError,
  OperationType,
  PRIMARY_ADMIN_EMAIL,
  saveLoanApplicationToCloud,
  seedCentroDatabase,
  signInWithGooglePopup,
  signInWithGoogleRedirectFlow,
  signOutFirebase,
  UnitRecord,
} from '../lib/firebase';

interface AdminConsoleProps {
  currentUser: User | null;
  units: UnitRecord[];
  isCloudSeeded: boolean;
}

type AdminSubTab = 'loans' | 'units';

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  currentUser,
  units,
  isCloudSeeded,
}) => {
  const [subTab, setSubTab] = useState<AdminSubTab>('loans');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const autoSeedTriggeredRef = useRef(false);

  const [applications, setApplications] = useState<LoanApplicationRecord[]>([]);

  // Loan creation modal state (supports selecting multiple banks)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCreateBanks, setSelectedCreateBanks] = useState<string[]>([
    THAI_BANKS[0],
    THAI_BANKS[1],
  ]);
  const [newForm, setNewForm] = useState({
    unitNo: units[0]?.unitNo || 'A01',
    customerName: '',
    nationalId: '',
    phone: '',
    contractPrice: String(units[0]?.basePrice || 14900000),
    bookingDeposit: '150000',
    loanAmount: '13000000',
    advisorName: 'คุณศิริพร รัตนวงศ์',
    advisorPhone: '02-098-7410',
    remark: 'รับเอกสารครบถ้วนและยื่นขอสินเชื่อไปยังธนาคารที่เลือกแล้ว',
  });

  const [createError, setCreateError] = useState('');

  // Selected application for real-time status & multi-bank editor
  const [selectedApp, setSelectedApp] = useState<LoanApplicationRecord | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editStatus, setEditStatus] = useState<LoanStatusKey>('doc_review');
  const [editContractPrice, setEditContractPrice] = useState('');
  const [editApprovedAmount, setEditApprovedAmount] = useState('');
  const [editInterestNote, setEditInterestNote] = useState('');
  const [editBankSubmissions, setEditBankSubmissions] = useState<BankSubmission[]>([]);
  const [editRemark, setEditRemark] = useState('');
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);

  // Unit price inline edit state
  const [unitSearch, setUnitSearch] = useState('');
  const [editingUnitNo, setEditingUnitNo] = useState<string | null>(null);
  const [unitPriceDraft, setUnitPriceDraft] = useState('');
  const [unitStatusDraft, setUnitStatusDraft] = useState<BookingStatus>('available');

  const isVerifiedAdmin = Boolean(
    currentUser &&
      currentUser.emailVerified &&
      currentUser.email === PRIMARY_ADMIN_EMAIL
  );

  // Automatically sync units, demo cases, and repair all loanLookups on verified admin sign-in
  useEffect(() => {
    if (!isVerifiedAdmin || autoSeedTriggeredRef.current) return;
    autoSeedTriggeredRef.current = true;
    setSeeding(true);
    seedCentroDatabase()
      .then((res) => {
        if (res.unitsSeeded > 0 || res.loansSeeded > 0 || res.lookupsRepaired > 0) {
          setToast({
            type: 'ok',
            text: `ซิงค์ข้อมูลขึ้น Cloud Firestore เรียบร้อย (เพิ่มยูนิต ${res.unitsSeeded} · เพิ่มเคส ${res.loansSeeded} · อัปเดตดัชนีค้นหา ${res.lookupsRepaired} รายการ)`,
          });
        }
      })
      .catch((err) => {
        setToast({
          type: 'err',
          text: err instanceof Error ? err.message : 'ซิงค์ข้อมูลอัตโนมัติไม่สำเร็จ',
        });
      })
      .finally(() => setSeeding(false));
  }, [isVerifiedAdmin]);

  // Listen to loanApplications in real time when admin is signed in
  useEffect(() => {
    if (!isVerifiedAdmin) {
      setApplications([]);
      return;
    }

    const unsubApps = onSnapshot(
      collection(db, 'loanApplications'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as LoanApplicationRecord);
        list.sort((a, b) => a.unitNo.localeCompare(b.unitNo));
        setApplications(list);
      },
      (err) => {
        logFirestoreError(err, OperationType.LIST, 'loanApplications');
        setToast({
          type: 'err',
          text: 'ไม่สามารถโหลดข้อมูลสินเชื่อจาก Cloud Firestore ได้ กรุณาตรวจสอบสิทธิ์ผู้ดูแลระบบ',
        });
      }
    );

    return () => {
      unsubApps();
    };
  }, [isVerifiedAdmin]);

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError('');
      await signInWithGooglePopup();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSeedCloud = async () => {
    try {
      setSeeding(true);
      const res = await seedCentroDatabase();
      setToast({
        type: 'ok',
        text: `ซิงค์ข้อมูลและอัปเดตดัชนีค้นหาขึ้น Cloud สำเร็จ (ยูนิตใหม่ ${res.unitsSeeded} · เคสใหม่ ${res.loansSeeded} · ซิงค์ดัชนีค้นหา ${res.lookupsRepaired} เคส)`,
      });
    } catch (err) {
      setToast({
        type: 'err',
        text: err instanceof Error ? err.message : 'ซิงค์ข้อมูลไม่สำเร็จ',
      });
    } finally {
      setSeeding(false);
    }
  };

  const openEditorForApp = (app: LoanApplicationRecord) => {
    setSelectedApp(app);
    setEditCustomerName(app.customerName || '');
    setEditPhone(app.phone || '');
    setEditNationalId(app.nationalId || '');
    setEditStatus(app.overallStatus || 'submitted');
    setEditContractPrice(String(app.contractPrice || 0));
    setEditApprovedAmount(String(app.approvedAmount || 0));
    setEditInterestNote(app.interestRateNote || '');

    const existingSubs =
      app.bankSubmissions && app.bankSubmissions.length > 0
        ? app.bankSubmissions
        : (app.bankName || 'ธนาคารไทยพาณิชย์ (SCB)')
            .split(',')
            .map((b) => b.trim())
            .filter(Boolean)
            .map((bName) => ({
              bankName: bName,
              status: app.overallStatus || 'submitted',
              requestedAmount: app.loanAmount || 0,
              approvedAmount: app.approvedAmount || 0,
              interestRateNote: app.interestRateNote || '',
              remark: app.remark || '',
              updatedAtIso: new Date().toISOString(),
            }));

    setEditBankSubmissions(existingSubs);
    setEditRemark(app.remark || '');
  };

  const toggleCreateBank = (bankName: string) => {
    setSelectedCreateBanks((prev) => {
      if (prev.includes(bankName)) {
        return prev.length > 1 ? prev.filter((b) => b !== bankName) : prev;
      }
      return [...prev, bankName];
    });
  };

  const toggleEditBank = (bankName: string) => {
    setEditBankSubmissions((prev) => {
      const exists = prev.some((s) => s.bankName === bankName);
      if (exists) {
        if (prev.length <= 1) return prev;
        return prev.filter((s) => s.bankName !== bankName);
      }
      return [
        ...prev,
        {
          bankName,
          status: 'submitted',
          requestedAmount: selectedApp?.loanAmount || 0,
          approvedAmount: 0,
          interestRateNote: 'รอผลพิจารณาเบื้องต้น',
          remark: 'ส่งเอกสารยื่นกู้เพิ่มเติม',
          updatedAtIso: new Date().toISOString(),
        },
      ];
    });
  };

  const updateBankSubField = <K extends keyof BankSubmission>(
    bankName: string,
    field: K,
    value: BankSubmission[K]
  ) => {
    setEditBankSubmissions((prev) =>
      prev.map((item) =>
        item.bankName === bankName
          ? { ...item, [field]: value, updatedAtIso: new Date().toISOString() }
          : item
      )
    );
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    const unit = units.find((u) => u.unitNo === newForm.unitNo);
    if (!unit) {
      setCreateError('กรุณาเลือกยูนิตที่ถูกต้อง');
      return;
    }

    if (!newForm.customerName.trim()) {
      setCreateError('กรุณากรอกชื่อ-นามสกุลลูกค้า');
      return;
    }

    if (selectedCreateBanks.length === 0) {
      setCreateError('กรุณาเลือกธนาคารอย่างน้อย 1 ธนาคาร');
      return;
    }

    const cleanNid = newForm.nationalId.replace(/\D/g, '');
    const cleanPhone = newForm.phone.replace(/\D/g, '');

    if (cleanNid.length !== 13 || !/^0\d{9}$/.test(cleanPhone)) {
      setCreateError(
        'กรุณาตรวจสอบเลขบัตรประชาชน (13 หลัก) และเบอร์โทรศัพท์มือถือ (10 หลัก ขึ้นต้นด้วย 0)'
      );
      return;
    }

    try {
      setIsUpdatingApp(true);

      const unitRef = doc(db, 'units', unit.unitNo);
      const unitSnap = await getDoc(unitRef);
      if (!unitSnap.exists()) {
        await setDoc(unitRef, {
          unitNo: unit.unitNo,
          houseType: unit.houseType,
          houseNumber: unit.houseNumber,
          landAreaSqWah: unit.landAreaSqWah,
          usableAreaSqM: unit.usableAreaSqM,
          basePrice: unit.basePrice,
          bookingStatus: 'loan_in_progress',
          updatedAt: serverTimestamp(),
        });
      }

      const appId = `GV-${unit.unitNo}-${Date.now().toString().slice(-4)}`;
      const reqLoanAmount = Number(newForm.loanAmount) || 0;
      const nowIso = new Date().toISOString();

      const bankSubmissions: BankSubmission[] = selectedCreateBanks.map((bName) => ({
        bankName: bName,
        status: 'submitted',
        requestedAmount: reqLoanAmount,
        approvedAmount: 0,
        interestRateNote: 'อยู่ระหว่างพิจารณาเอกสารเบื้องต้น',
        remark: 'ส่งชุดเอกสารยื่นกู้เรียบร้อยแล้ว',
        updatedAtIso: nowIso,
      }));

      const bankSummary = selectedCreateBanks.join(', ').slice(0, 240);

      const timeline: TimelineEntry[] = [
        {
          stepKey: 'submitted',
          title: LOAN_STATUS_META.submitted.labelTh,
          detail: `บันทึกการจองยูนิต ${unit.unitNo} บ้านเลขที่ ${unit.houseNumber} (${unit.houseType}) · ยื่น ${selectedCreateBanks.length} ธนาคาร`,
          status: 'active',
          updatedAtIso: nowIso,
          updatedBy: currentUser?.email || 'GAVIN Officer',
        },
      ];

      const record: LoanApplicationRecord = {
        appId,
        customerName: newForm.customerName.trim(),
        nationalId: cleanNid,
        phone: cleanPhone,
        unitId: unit.unitNo,
        unitNo: unit.unitNo,
        houseType: unit.houseType,
        houseNumber: unit.houseNumber,
        landAreaSqWah: unit.landAreaSqWah,
        usableAreaSqM: unit.usableAreaSqM,
        contractPrice: Number(newForm.contractPrice) || unit.basePrice,
        bookingDeposit: Number(newForm.bookingDeposit) || 0,
        loanAmount: reqLoanAmount,
        approvedAmount: 0,
        bankName: bankSummary,
        bankSubmissions,
        interestRateNote: 'อยู่ระหว่างพิจารณาอัตราดอกเบี้ย',
        overallStatus: 'submitted',
        advisorName: newForm.advisorName.trim(),
        advisorPhone: newForm.advisorPhone.trim(),
        remark: newForm.remark.trim(),
        timeline,
      };

      const saved = await saveLoanApplicationToCloud(record);

      await updateDoc(unitRef, {
        bookingStatus: 'loan_in_progress',
        updatedAt: serverTimestamp(),
      });

      setShowCreateModal(false);
      setNewForm((prev) => ({
        ...prev,
        customerName: '',
        nationalId: '',
        phone: '',
      }));
      setToast({
        type: 'ok',
        text: `บันทึกและอัปโหลดข้อมูล ${saved.customerName} (โทร ${saved.phone} / บัตร ${saved.nationalId}) ขึ้นระบบค้นหาเรียลไทม์แล้ว`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถสร้างใบคำขอได้';
      setCreateError(msg);
      setToast({ type: 'err', text: msg });
    } finally {
      setIsUpdatingApp(false);
    }
  };

  const handleUpdateRealtime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    const cleanPhone = editPhone.replace(/\D/g, '');
    const cleanNid = editNationalId.replace(/\D/g, '');
    if (!/^0\d{9}$/.test(cleanPhone) || cleanNid.length !== 13) {
      setToast({
        type: 'err',
        text: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก และเลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก',
      });
      return;
    }

    try {
      setIsUpdatingApp(true);
      const statusMeta = LOAN_STATUS_META[editStatus] || LOAN_STATUS_META.submitted;
      const nextContractPrice = Number(editContractPrice) || selectedApp.contractPrice;
      const maxBankApproved = editBankSubmissions.reduce(
        (max, b) => (b.approvedAmount > max ? b.approvedAmount : max),
        0
      );
      const nextApprovedAmount =
        Number(editApprovedAmount) > 0 ? Number(editApprovedAmount) : maxBankApproved;

      const bankSummary = editBankSubmissions
        .map((b) => b.bankName)
        .join(', ')
        .slice(0, 240);

      const prevTimeline = (Array.isArray(selectedApp.timeline) ? selectedApp.timeline : []).map(
        (t) => ({
          ...t,
          status: t.status === 'active' ? ('done' as const) : t.status,
        })
      );
      const newEntry: TimelineEntry = {
        stepKey: editStatus,
        title: statusMeta.labelTh,
        detail: editRemark.trim() || `อัปเดตสถานะโดยเจ้าหน้าที่ (${bankSummary})`,
        status: editStatus === 'need_docs' || editStatus === 'rejected' ? 'warning' : 'active',
        updatedAtIso: new Date().toISOString(),
        updatedBy: currentUser?.displayName || currentUser?.email || 'GAVIN Officer',
      };
      const nextTimeline = [...prevTimeline, newEntry].slice(-20);

      const updatedRecord: LoanApplicationRecord = {
        ...selectedApp,
        customerName: editCustomerName.trim() || selectedApp.customerName,
        phone: cleanPhone,
        nationalId: cleanNid,
        overallStatus: editStatus,
        contractPrice: nextContractPrice,
        approvedAmount: nextApprovedAmount,
        interestRateNote: editInterestNote.trim(),
        bankName: bankSummary || selectedApp.bankName,
        bankSubmissions: editBankSubmissions,
        remark: editRemark.trim(),
        timeline: nextTimeline,
      };

      const saved = await saveLoanApplicationToCloud(updatedRecord, selectedApp.createdAt);

      setSelectedApp({ ...saved, createdAt: selectedApp.createdAt });
      setToast({
        type: 'ok',
        text: `อัปเดตและซิงค์ข้อมูล ${saved.customerName} (ค้นหาด้วย ${saved.phone} หรือ ${saved.nationalId}) ขึ้น Cloud เรียบร้อยแล้ว`,
      });
    } catch (err) {
      setToast({
        type: 'err',
        text: err instanceof Error ? err.message : 'อัปเดตสถานะไม่สำเร็จ',
      });
    } finally {
      setIsUpdatingApp(false);
    }
  };

  const handleSaveUnitEdit = async (unitNo: string) => {
    const price = Number(unitPriceDraft);
    if (!Number.isFinite(price) || price < 0) {
      setToast({ type: 'err', text: 'กรุณาระบุราคาเป็นตัวเลขที่ถูกต้อง' });
      return;
    }
    try {
      await updateDoc(doc(db, 'units', unitNo), {
        basePrice: price,
        bookingStatus: unitStatusDraft,
        updatedAt: serverTimestamp(),
      });
      setEditingUnitNo(null);
      setToast({ type: 'ok', text: `อัปเดตราคายูนิต ${unitNo} แบบเรียลไทม์แล้ว` });
    } catch (err) {
      setToast({
        type: 'err',
        text: err instanceof Error ? err.message : 'อัปเดตราคาไม่สำเร็จ',
      });
    }
  };

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return units;
    return units.filter(
      (u) =>
        u.unitNo.toLowerCase().includes(q) ||
        u.houseNumber.toLowerCase().includes(q) ||
        u.houseType.toLowerCase().includes(q)
    );
  }, [units, unitSearch]);

  if (!currentUser) {
    return (
      <section className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white border border-[#E2DDD4] rounded-xl p-8 text-center space-y-6">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#111315] text-[#C9A875] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#9A7B4F] mb-1">
              GAVIN OFFICER WORKSPACE
            </p>
            <h1 className="text-2xl font-semibold text-[#14171A]">
              เข้าสู่ระบบเจ้าหน้าที่โครงการ
            </h1>
            <p className="text-sm text-[#57534E] mt-2 leading-relaxed">
              จัดการข้อมูลลูกค้ายื่นสินเชื่อหลายธนาคาร กำหนดราคาบ้านแต่ละแปลง
              และซิงค์สถานะขึ้นหน้าเว็บลูกค้าแบบเรียลไทม์บน Firebase Cloud
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
              {authError}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full py-3 px-5 bg-[#111315] hover:bg-[#25292E] text-white text-sm font-medium rounded-lg transition-colors"
            >
              {authLoading ? 'กำลังเชื่อมต่อ Google...' : 'เข้าสู่ระบบด้วย Google (เจ้าหน้าที่)'}
            </button>
            <button
              type="button"
              onClick={() => signInWithGoogleRedirectFlow().catch(() => {})}
              className="w-full py-2 px-4 border border-[#E2DDD4] hover:border-[#111315] text-xs font-medium text-[#57534E] hover:text-[#14171A] rounded-lg transition-colors"
            >
              เข้าสู่ระบบแบบ Redirect (กรณีป๊อปอัปถูกบล็อก)
            </button>
          </div>

          <p className="text-xs text-[#78716C]">
            สิทธิ์ผู้ดูแลหลักถูกกำหนดไว้สำหรับบัญชี{' '}
            <span className="font-mono-tabular text-[#14171A]">{PRIMARY_ADMIN_EMAIL}</span>
          </p>
        </div>
      </section>
    );
  }

  if (!isVerifiedAdmin) {
    return (
      <section className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white border border-[#E2DDD4] rounded-xl p-8 text-center space-y-5">
          <h2 className="text-xl font-semibold text-[#14171A]">
            บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ GAVIN
          </h2>
          <p className="text-sm text-[#57534E]">
            เข้าสู่ระบบด้วยอีเมล <span className="font-mono">{currentUser.email}</span>{' '}
            กรุณาใช้อีเมลผู้ดูแลหลัก ({PRIMARY_ADMIN_EMAIL})
          </p>
          <button
            type="button"
            onClick={signOutFirebase}
            className="px-5 py-2.5 bg-[#111315] text-white text-sm font-medium rounded-lg"
          >
            ออกจากระบบ
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8">
      <div className="bg-white border border-[#E2DDD4] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#9A7B4F] mb-1">
            GAVIN OFFICER CONSOLE · CLOUD FIRESTORE REAL-TIME
          </p>
          <h1 className="text-2xl font-semibold text-[#14171A]">
            ศูนย์จัดการสินเชื่อและราคาบ้าน Centro พระราม 2 – พุทธบูชา 2
          </h1>
          <p className="text-xs text-[#57534E] mt-1">
            ผู้ดูแลระบบ: {currentUser.email} · เชื่อมต่อฐานข้อมูลเรียลไทม์แล้ว
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSeedCloud}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9A7B4F] hover:bg-[#84673F] text-white text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Database className="w-4 h-4" />
            {seeding
              ? 'กำลังซิงค์ข้อมูล...'
              : !isCloudSeeded || applications.length === 0
                ? 'ซิงค์ 74 ยูนิต & เคสตัวอย่างขึ้น Cloud'
                : 'ซิงค์ข้อมูล & อัปเดตดัชนีค้นหาขึ้น Cloud'}
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError('');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#111315] hover:bg-[#25292E] text-white text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            เพิ่มรายการจอง & สินเชื่อ
          </button>

          <button
            type="button"
            onClick={signOutFirebase}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#E2DDD4] hover:border-[#111315] text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between gap-4 ${
            toast.type === 'ok'
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs underline shrink-0"
          >
            ปิด
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 p-1 bg-white border border-[#E2DDD4] rounded-lg w-fit">
        {(
          [
            { key: 'loans', label: `เคสสินเชื่อลูกค้า (${applications.length})` },
            { key: 'units', label: `ราคาบ้านทั้ง ${units.length} ยูนิต` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === tab.key
                ? 'bg-[#111315] text-white'
                : 'text-[#57534E] hover:text-[#14171A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: CUSTOMER LOAN APPLICATIONS */}
      {subTab === 'loans' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#E2DDD4]">
              <h2 className="text-base font-semibold text-[#14171A]">
                รายการลูกค้ายื่นสินเชื่อทั้งหมด
              </h2>
            </div>

            {applications.length === 0 ? (
              <div className="p-10 text-center space-y-4">
                <p className="text-sm text-[#57534E]">
                  {seeding ? 'กำลังซิงค์ข้อมูลขึ้น Cloud...' : 'ยังไม่มีข้อมูลเคสสินเชื่อใน Cloud Firestore'}
                </p>
                <button
                  type="button"
                  onClick={handleSeedCloud}
                  disabled={seeding}
                  className="px-4 py-2 bg-[#9A7B4F] text-white text-xs font-medium rounded-lg"
                >
                  ซิงค์ข้อมูล 74 ยูนิตและเคสตัวอย่างขึ้น Cloud ทันที
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E2DDD4]">
                {applications.map((app) => {
                  const meta = LOAN_STATUS_META[app.overallStatus] || LOAN_STATUS_META.submitted;
                  const isSelected = selectedApp?.appId === app.appId;
                  const bankCount = app.bankSubmissions?.length || 1;
                  return (
                    <button
                      key={app.appId}
                      type="button"
                      onClick={() => openEditorForApp(app)}
                      className={`w-full text-left p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected ? 'bg-[#FAF9F6]' : 'hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-[#78716C] font-mono-tabular">
                          <span className="font-semibold text-[#14171A]">
                            {app.unitNo} ({app.houseNumber})
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{app.houseType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{app.phone}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#14171A] truncate">
                          {app.customerName}
                        </p>
                        <p className="text-xs text-[#57534E] truncate">
                          ยื่น {bankCount} ธนาคาร · ราคาจอง{' '}
                          <span className="font-mono-tabular font-medium text-[#14171A]">
                            {formatThb(app.contractPrice)}
                          </span>
                        </p>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <p
                          className={`text-xs font-semibold ${
                            meta.tone === 'emerald'
                              ? 'text-[#15803D]'
                              : meta.tone === 'amber'
                                ? 'text-[#B45309]'
                                : meta.tone === 'crimson'
                                  ? 'text-[#991B1B]'
                                  : 'text-[#9A7B4F]'
                          }`}
                        >
                          {meta.shortTh}
                        </p>
                        <p className="text-[11px] text-[#78716C] mt-1 font-mono-tabular">
                          {app.nationalId}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Multi-Bank Status Updater */}
          <div className="lg:col-span-6 bg-white border border-[#E2DDD4] rounded-xl p-6">
            {!selectedApp ? (
              <div className="py-16 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#9A7B4F] mx-auto" />
                <p className="text-sm font-medium text-[#14171A]">
                  เลือกรายชื่อลูกค้าทางด้านซ้าย
                </p>
                <p className="text-xs text-[#78716C]">
                  เพื่ออัปเดตสถานะรายธนาคาร แก้ไขราคาบ้าน และซิงค์ขึ้นหน้าเว็บลูกค้าแบบเรียลไทม์
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpdateRealtime} className="space-y-5">
                <div className="pb-3 border-b border-[#E2DDD4]">
                  <p className="text-xs font-mono-tabular text-[#9A7B4F]">
                    {selectedApp.appId} · ยูนิต {selectedApp.unitNo} (บ้านเลขที่ {selectedApp.houseNumber})
                  </p>
                  <h3 className="text-lg font-semibold text-[#14171A] mt-0.5">
                    {selectedApp.customerName}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#14171A] mb-1">
                      ชื่อ-นามสกุลลูกค้า
                    </label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14171A] mb-1">
                      เบอร์มือถือ (10 หลัก)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14171A] mb-1">
                      เลขบัตรประชาชน (13 หลัก)
                    </label>
                    <input
                      type="text"
                      maxLength={13}
                      value={editNationalId}
                      onChange={(e) => setEditNationalId(e.target.value.replace(/\D/g, '').slice(0, 13))}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#14171A] mb-1">
                      สถานะภาพรวมของเคส
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as LoanStatusKey)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                    >
                      {(Object.keys(LOAN_STATUS_META) as LoanStatusKey[]).map((key) => (
                        <option key={key} value={key}>
                          {LOAN_STATUS_META[key].labelTh}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#14171A] mb-1">
                      ราคาบ้านที่จอง (บาท)
                    </label>
                    <input
                      type="number"
                      value={editContractPrice}
                      onChange={(e) => setEditContractPrice(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                    />
                  </div>
                </div>

                {/* Multi-Bank Selection & Per-Bank Status Editor */}
                <div className="space-y-3 pt-2 border-t border-[#E2DDD4]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#14171A] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#9A7B4F]" />
                      เลือกธนาคารที่ยื่นกู้ ({editBankSubmissions.length} ธนาคาร)
                    </span>
                    <span className="text-[11px] text-[#78716C]">เลือกได้หลายธนาคาร</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {THAI_BANKS.map((bank) => {
                      const active = editBankSubmissions.some((b) => b.bankName === bank);
                      return (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => toggleEditBank(bank)}
                          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                            active
                              ? 'bg-[#111315] text-white border-[#111315]'
                              : 'bg-[#FAF9F6] text-[#57534E] border-[#E2DDD4] hover:border-[#9A7B4F]'
                          }`}
                        >
                          {bank}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    {editBankSubmissions.map((sub) => (
                      <div
                        key={sub.bankName}
                        className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E2DDD4] space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#14171A]">
                            {sub.bankName}
                          </span>
                          <select
                            value={sub.status}
                            onChange={(e) =>
                              updateBankSubField(
                                sub.bankName,
                                'status',
                                e.target.value as LoanStatusKey
                              )
                            }
                            className="px-2 py-1 text-xs bg-white border border-[#D8D2C7] rounded"
                          >
                            {(Object.keys(LOAN_STATUS_META) as LoanStatusKey[]).map((k) => (
                              <option key={k} value={k}>
                                {LOAN_STATUS_META[k].shortTh}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] text-[#78716C] mb-0.5">
                              ยอดขอกู้ (บาท)
                            </label>
                            <input
                              type="number"
                              value={sub.requestedAmount}
                              onChange={(e) =>
                                updateBankSubField(
                                  sub.bankName,
                                  'requestedAmount',
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-[#E2DDD4] rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#78716C] mb-0.5">
                              วงเงินอนุมัติ (บาท)
                            </label>
                            <input
                              type="number"
                              value={sub.approvedAmount}
                              onChange={(e) =>
                                updateBankSubField(
                                  sub.bankName,
                                  'approvedAmount',
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-[#E2DDD4] rounded"
                            />
                          </div>
                        </div>

                        <input
                          type="text"
                          value={sub.interestRateNote}
                          onChange={(e) =>
                            updateBankSubField(sub.bankName, 'interestRateNote', e.target.value)
                          }
                          placeholder="อัตราดอกเบี้ย / เงื่อนไขของธนาคารนี้"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2DDD4] rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#14171A] mb-1">
                      วงเงินอนุมัติสูงสุด (บาท)
                    </label>
                    <input
                      type="number"
                      value={editApprovedAmount}
                      onChange={(e) => setEditApprovedAmount(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#14171A] mb-1">
                      ดอกเบี้ยสรุปภาพรวม
                    </label>
                    <input
                      type="text"
                      value={editInterestNote}
                      onChange={(e) => setEditInterestNote(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14171A] mb-1">
                    หมายเหตุถึงลูกค้า (แสดงบนหน้าเว็บทันทีแบบเรียลไทม์)
                  </label>
                  <textarea
                    rows={2}
                    value={editRemark}
                    onChange={(e) => setEditRemark(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingApp}
                  className="w-full py-3 px-4 bg-[#111315] hover:bg-[#25292E] disabled:opacity-60 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isUpdatingApp
                    ? 'กำลังบันทึกและซิงค์ข้อมูล...'
                    : 'บันทึกและซิงค์สถานะแบบเรียลไทม์'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EDIT 74 UNITS & PRICES */}
      {subTab === 'units' && (
        <div className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#E2DDD4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#14171A]">
                กำหนดราคาขายและสถานะทั้ง {units.length} ยูนิต
              </h2>
              <p className="text-xs text-[#78716C]">
                แก้ไขราคาบ้านและสถานะการจองได้รายแปลง บันทึกลง Firebase Cloud ทันที
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="ค้นหายูนิต / บ้านเลขที่..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2DDD4] bg-[#FAF9F6] text-xs font-medium text-[#57534E]">
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">แบบบ้าน</th>
                  <th className="py-3 px-4">บ้านเลขที่</th>
                  <th className="py-3 px-4 text-right">ที่ดิน (ตร.ว.)</th>
                  <th className="py-3 px-4 text-right">พื้นที่ (ตร.ม.)</th>
                  <th className="py-3 px-4 text-right">ราคาบ้าน (บาท)</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4] text-sm">
                {filteredUnits.map((u) => {
                  const isEditing = editingUnitNo === u.unitNo;
                  return (
                    <tr key={u.unitNo} className="hover:bg-[#FAF9F6]">
                      <td className="py-2.5 px-4 font-mono-tabular font-semibold">{u.unitNo}</td>
                      <td className="py-2.5 px-4">{u.houseType}</td>
                      <td className="py-2.5 px-4 font-mono-tabular">{u.houseNumber}</td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular">{u.landAreaSqWah.toFixed(1)}</td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular">{u.usableAreaSqM}</td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular">
                        {isEditing ? (
                          <input
                            type="number"
                            value={unitPriceDraft}
                            onChange={(e) => setUnitPriceDraft(e.target.value)}
                            className="w-32 px-2 py-1 text-right text-xs border border-[#9A7B4F] rounded bg-white"
                          />
                        ) : (
                          formatThb(u.basePrice)
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {isEditing ? (
                          <select
                            value={unitStatusDraft}
                            onChange={(e) => setUnitStatusDraft(e.target.value as BookingStatus)}
                            className="px-2 py-1 text-xs border border-[#9A7B4F] rounded bg-white"
                          >
                            <option value="available">พร้อมขาย</option>
                            <option value="reserved">จองแล้ว</option>
                            <option value="loan_in_progress">ยื่นกู้</option>
                            <option value="transferred">โอนแล้ว</option>
                          </select>
                        ) : (
                          <span>{u.bookingStatus}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveUnitEdit(u.unitNo)}
                              className="px-2.5 py-1 bg-[#111315] text-white text-xs rounded"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUnitNo(null)}
                              className="text-xs text-[#78716C]"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUnitNo(u.unitNo);
                              setUnitPriceDraft(String(u.basePrice));
                              setUnitStatusDraft(u.bookingStatus);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-[#9A7B4F] hover:underline"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            แก้ราคา
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE NEW LOAN APPLICATION MODAL (MULTI-BANK SELECTION) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E2DDD4] rounded-xl max-w-2xl w-full p-6 sm:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#E2DDD4] pb-4">
              <h2 className="text-lg font-semibold text-[#14171A]">
                เพิ่มข้อมูลลูกค้าจองบ้านและยื่นสินเชื่อ
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-[#78716C] hover:text-[#14171A]"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-4">
              {createError && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#14171A] mb-1">
                    เลือกยูนิต / บ้านเลขที่ (74 ยูนิต)
                  </label>
                  <select
                    value={newForm.unitNo}
                    onChange={(e) => {
                      const u = units.find((item) => item.unitNo === e.target.value);
                      setNewForm((prev) => ({
                        ...prev,
                        unitNo: e.target.value,
                        contractPrice: u ? String(u.basePrice) : prev.contractPrice,
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                  >
                    {units.map((u) => (
                      <option key={u.unitNo} value={u.unitNo}>
                        {u.unitNo} · บ้านเลขที่ {u.houseNumber} · {u.houseType} ({u.landAreaSqWah} ตร.ว.)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14171A] mb-1">
                    ชื่อ-นามสกุลลูกค้า
                  </label>
                  <input
                    required
                    type="text"
                    value={newForm.customerName}
                    onChange={(e) => setNewForm({ ...newForm, customerName: e.target.value })}
                    placeholder="คุณ..."
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14171A] mb-1">
                    เลขบัตรประชาชน 13 หลัก (ไม่ต้องมีขีด)
                  </label>
                  <input
                    required
                    type="text"
                    maxLength={13}
                    value={newForm.nationalId}
                    onChange={(e) =>
                      setNewForm({ ...newForm, nationalId: e.target.value.replace(/\D/g, '').slice(0, 13) })
                    }
                    placeholder="1100400000000"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14171A] mb-1">
                    เบอร์โทรศัพท์มือถือ 10 หลัก
                  </label>
                  <input
                    required
                    type="text"
                    maxLength={10}
                    value={newForm.phone}
                    onChange={(e) =>
                      setNewForm({ ...newForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                    }
                    placeholder="0890000000"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14171A] mb-1">
                    ราคาบ้านที่จอง / ราคาหน้าสัญญา (บาท)
                  </label>
                  <input
                    required
                    type="number"
                    value={newForm.contractPrice}
                    onChange={(e) => setNewForm({ ...newForm, contractPrice: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#14171A] mb-1">
                    ยอดยื่นกู้ธนาคาร (บาท)
                  </label>
                  <input
                    required
                    type="number"
                    value={newForm.loanAmount}
                    onChange={(e) => setNewForm({ ...newForm, loanAmount: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg"
                  />
                </div>
              </div>

              {/* Multi-Bank Checkbox Selector */}
              <div className="space-y-2 pt-2 border-t border-[#E2DDD4]">
                <label className="block text-xs font-medium text-[#14171A]">
                  เลือกธนาคารที่ยื่นกู้ (เลือกได้หลายธนาคาร · เลือกแล้ว {selectedCreateBanks.length} แห่ง)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {THAI_BANKS.map((bank) => {
                    const checked = selectedCreateBanks.includes(bank);
                    return (
                      <label
                        key={bank}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-[#111315] text-white border-[#111315]'
                            : 'bg-[#FAF9F6] text-[#14171A] border-[#E2DDD4]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCreateBank(bank)}
                          className="accent-[#C9A875]"
                        />
                        <span className="truncate">{bank}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2DDD4]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-[#57534E] hover:text-[#14171A]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingApp}
                  className="px-5 py-2.5 bg-[#111315] text-white text-sm font-medium rounded-lg"
                >
                  {isUpdatingApp ? 'กำลังบันทึก...' : 'บันทึกลง Firebase Cloud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
