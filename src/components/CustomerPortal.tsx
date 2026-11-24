import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Lock,
  Search,
  Home,
  LogOut,
  ChevronRight,
  Sparkles,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  HOUSE_TYPE_SPECS,
  INITIAL_CENTRO_UNITS,
  INITIAL_DEMO_LOANS,
  LOAN_STATUS_META,
} from '../data/centroUnits';
import {
  computeLookupHash,
  formatThb,
  maskNationalId,
  maskPhone,
  normalizeLookupInput,
} from '../lib/cryptoMfa';
import {
  db,
  LoanDossier,
  logFirestoreError,
  OperationType,
} from '../lib/firebase';

interface CustomerPortalProps {
  focusTrigger: number;
  isCloudSeeded: boolean;
}

const PROGRESS_STEPS = [
  { key: 'submitted', label: 'ยื่นเอกสาร' },
  { key: 'doc_review', label: 'ตรวจบูโร & รายได้' },
  { key: 'pre_approved', label: 'Pre-Approve' },
  { key: 'appraisal', label: 'ประเมินหลักทรัพย์' },
  { key: 'bank_approved', label: 'อนุมัติวงเงิน' },
  { key: 'transfer_scheduled', label: 'นัดโอนกรรมสิทธิ์' },
] as const;

function isValidLiveDossier(data: unknown): data is LoanDossier {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<LoanDossier>;
  return Boolean(
    d.appId &&
      d.customerName &&
      d.unitNo &&
      d.overallStatus &&
      LOAN_STATUS_META[d.overallStatus] &&
      Array.isArray(d.timeline)
  );
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  focusTrigger,
  isCloudSeeded: _isCloudSeeded,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [identifierInput, setIdentifierInput] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showDemoList, setShowDemoList] = useState(true);

  const [activeLookupHash, setActiveLookupHash] = useState<string | null>(null);
  const [dossierSource, setDossierSource] = useState<'firestore' | 'preview'>('firestore');
  const [dossier, setDossier] = useState<LoanDossier | null>(null);

  useEffect(() => {
    if (focusTrigger > 0 && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusTrigger]);

  // Real-time Cloud Firestore subscription while customer is viewing their status
  useEffect(() => {
    if (!activeLookupHash) return;

    const pathStr = `loanLookups/${activeLookupHash}`;
    const unsub = onSnapshot(
      doc(db, 'loanLookups', activeLookupHash),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (isValidLiveDossier(data)) {
            setDossier(data);
            setDossierSource('firestore');
          }
        }
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, pathStr);
      }
    );

    return () => unsub();
  }, [activeLookupHash]);

  const buildPreviewDossierIfAvailable = (
    kind: 'PHONE' | 'NID',
    normalized: string
  ): LoanDossier | null => {
    const matched = INITIAL_DEMO_LOANS.find((d) =>
      kind === 'PHONE' ? d.phone === normalized : d.nationalId === normalized
    );
    if (!matched) return null;
    const unitInfo = INITIAL_CENTRO_UNITS.find((u) => u.unitNo === matched.unitNo);
    if (!unitInfo) return null;

    return {
      appId: matched.appId,
      customerName: matched.customerName,
      maskedPhone: maskPhone(matched.phone),
      maskedNationalId: maskNationalId(matched.nationalId),
      unitNo: unitInfo.unitNo,
      houseType: unitInfo.houseType,
      houseNumber: unitInfo.houseNumber,
      landAreaSqWah: unitInfo.landAreaSqWah,
      usableAreaSqM: unitInfo.usableAreaSqM,
      contractPrice: matched.contractPrice,
      bookingDeposit: matched.bookingDeposit,
      loanAmount: matched.loanAmount,
      approvedAmount: matched.approvedAmount,
      bankName: matched.bankName,
      bankSubmissions: matched.bankSubmissions,
      interestRateNote: matched.interestRateNote,
      overallStatus: matched.overallStatus,
      advisorName: matched.advisorName,
      advisorPhone: matched.advisorPhone,
      remark: matched.remark,
      timeline: matched.timeline,
    };
  };

  const executeLookup = async (rawIdentifier: string) => {
    setLookupError('');

    try {
      setIsSearching(true);
      const { kind, normalized, hash } = await computeLookupHash(rawIdentifier);

      let foundDossier: LoanDossier | null = null;
      let source: 'firestore' | 'preview' = 'firestore';

      try {
        const snap = await Promise.race([
          getDoc(doc(db, 'loanLookups', hash)),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5000)),
        ]);
        if (snap && snap.exists()) {
          const data = snap.data();
          if (isValidLiveDossier(data)) {
            foundDossier = data;
            source = 'firestore';
          }
        }
      } catch (err) {
        console.warn('Firestore lookup check fallback:', err);
      }

      if (!foundDossier) {
        const preview = buildPreviewDossierIfAvailable(kind, normalized);
        if (preview) {
          foundDossier = preview;
          source = 'preview';
        }
      }

      if (!foundDossier) {
        setLookupError(
          'ไม่พบข้อมูลสินเชื่อสำหรับหมายเลขนี้ในระบบ — กรุณาตรวจสอบเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลักอีกครั้ง (หากเจ้าหน้าที่เพิ่งกรอกข้อมูลใหม่ กรุณาตรวจสอบว่าได้กดบันทึกและซิงค์ขึ้น Cloud ในเมนู "สำหรับเจ้าหน้าที่" แล้ว)'
        );
        return;
      }

      setDossier(foundDossier);
      setDossierSource(source);
      setActiveLookupHash(hash);
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : 'ไม่สามารถค้นหาข้อมูลได้ในขณะนี้'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLookup(identifierInput);
  };

  const handleResetSession = () => {
    setActiveLookupHash(null);
    setDossier(null);
    setLookupError('');
  };

  const fillDemoCustomer = async (phone: string) => {
    setIdentifierInput(phone);
    setLookupError('');
    await executeLookup(phone);
  };

  // ---------------------------------------------------------------------------
  // CUSTOMER REAL-TIME DOSSIER VIEW (SHOWN AFTER PHONE / NATIONAL ID LOOKUP)
  // ---------------------------------------------------------------------------
  if (dossier && activeLookupHash) {
    const statusMeta = LOAN_STATUS_META[dossier.overallStatus] || LOAN_STATUS_META.submitted;
    const houseSpec = HOUSE_TYPE_SPECS[dossier.houseType];
    const safeTimeline = Array.isArray(dossier.timeline) ? dossier.timeline : [];
    const downPaymentBalance = Math.max(
      0,
      (dossier.contractPrice || 0) - (dossier.bookingDeposit || 0) - (dossier.loanAmount || 0)
    );
    const banksList =
      dossier.bankSubmissions && dossier.bankSubmissions.length > 0
        ? dossier.bankSubmissions
        : [
            {
              bankName: dossier.bankName,
              status: dossier.overallStatus,
              requestedAmount: dossier.loanAmount,
              approvedAmount: dossier.approvedAmount,
              interestRateNote: dossier.interestRateNote,
              remark: dossier.remark,
              updatedAtIso: new Date().toISOString(),
            },
          ];

    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8"
      >
        <div className="bg-[#111315] text-white rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-[#26292E]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#C9A875] mb-2">
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {dossierSource === 'firestore'
                  ? 'ซิงค์ข้อมูลแบบเรียลไทม์ (Cloud Firestore Live)'
                  : 'โหมดแสดงตัวอย่าง (กำลังรอเจ้าหน้าที่ซิงค์ขึ้น Cloud)'}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              {dossier.customerName}
            </h1>
            <p className="text-xs sm:text-sm text-[#D6D3D1] mt-1.5 font-mono-tabular">
              รหัสใบคำขอ {dossier.appId} · โทร {dossier.maskedPhone} · บัตรประชาชน{' '}
              {dossier.maskedNationalId}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResetSession}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-4 h-4" />
              ค้นหารายอื่น / ปิดหน้านี้
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-[#E2DDD4] rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-[#78716C] mb-1">
                    สถานะสินเชื่อธนาคารภาพรวม
                  </p>
                  <h2
                    className={`text-2xl font-semibold ${
                      statusMeta.tone === 'emerald'
                        ? 'text-[#15803D]'
                        : statusMeta.tone === 'amber'
                          ? 'text-[#B45309]'
                          : statusMeta.tone === 'crimson'
                            ? 'text-[#991B1B]'
                            : 'text-[#14171A]'
                    }`}
                  >
                    {statusMeta.labelTh}
                  </h2>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <p className="text-xs text-[#78716C]">จำนวนธนาคารที่ยื่นกู้</p>
                  <p className="text-sm font-semibold text-[#14171A] mt-0.5 tabular-nums">
                    {banksList.length} ธนาคาร
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  {PROGRESS_STEPS.map((step, idx) => {
                    const stepNum = idx + 1;
                    const isCompleted =
                      statusMeta.stepIndex > stepNum ||
                      (dossier.overallStatus === 'transfer_scheduled' && stepNum === 6);
                    const isCurrent =
                      statusMeta.stepIndex === stepNum &&
                      dossier.overallStatus !== 'rejected' &&
                      dossier.overallStatus !== 'need_docs';
                    return (
                      <div
                        key={step.key}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          isCurrent
                            ? 'bg-[#111315] text-white border-[#111315]'
                            : isCompleted
                              ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                              : 'bg-[#FAF9F6] text-[#78716C] border-[#E2DDD4]'
                        }`}
                      >
                        <p className="text-[11px] font-mono-tabular mb-1">0{stepNum}</p>
                        <p className="text-xs font-medium leading-snug">{step.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {dossier.remark && (
                <div className="bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg p-4 flex items-start gap-3">
                  {statusMeta.tone === 'amber' ? (
                    <AlertTriangle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
                  ) : statusMeta.tone === 'crimson' ? (
                    <XCircle className="w-5 h-5 text-[#991B1B] shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-[#9A7B4F] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-[#14171A] mb-0.5">
                      บันทึกจากเจ้าหน้าที่สินเชื่อ GAVIN
                    </p>
                    <p className="text-sm text-[#57534E] leading-relaxed">
                      {dossier.remark}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#E2DDD4]">
                <div>
                  <p className="text-xs text-[#78716C]">ราคาบ้านที่จอง</p>
                  <p className="text-base font-semibold font-mono-tabular text-[#14171A] mt-1">
                    {formatThb(dossier.contractPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#78716C]">เงินจอง + ทำสัญญา</p>
                  <p className="text-base font-semibold font-mono-tabular text-[#14171A] mt-1">
                    {formatThb(dossier.bookingDeposit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#78716C]">ยอดยื่นขอสินเชื่อ</p>
                  <p className="text-base font-semibold font-mono-tabular text-[#14171A] mt-1">
                    {formatThb(dossier.loanAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#78716C]">วงเงินอนุมัติสูงสุด</p>
                  <p
                    className={`text-base font-semibold font-mono-tabular mt-1 ${
                      dossier.approvedAmount > 0 ? 'text-[#15803D]' : 'text-[#78716C]'
                    }`}
                  >
                    {dossier.approvedAmount > 0
                      ? formatThb(dossier.approvedAmount)
                      : 'รอผลอนุมัติ'}
                  </p>
                </div>
              </div>

              {dossier.interestRateNote && (
                <p className="text-xs text-[#57534E] pt-2 border-t border-[#E2DDD4]">
                  เงื่อนไขอัตราดอกเบี้ยสรุป:{' '}
                  <span className="font-medium text-[#14171A]">
                    {dossier.interestRateNote}
                  </span>
                  {downPaymentBalance > 0 && (
                    <>
                      {' '}
                      · ส่วนต่างวันโอน (หักจองและกู้):{' '}
                      <span className="font-mono-tabular font-medium text-[#14171A]">
                        {formatThb(downPaymentBalance)}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Multi-Bank Breakdown Section */}
            <div className="bg-white border border-[#E2DDD4] rounded-xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[#14171A] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#9A7B4F]" />
                  สถานะการยื่นกู้แยกตามธนาคาร ({banksList.length} แห่ง)
                </h3>
              </div>

              <div className="divide-y divide-[#E2DDD4]">
                {banksList.map((bank) => {
                  const bMeta = LOAN_STATUS_META[bank.status] || LOAN_STATUS_META.submitted;
                  return (
                    <div key={bank.bankName} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#14171A]">
                          {bank.bankName}
                        </p>
                        <span
                          className={`text-xs font-semibold ${
                            bMeta.tone === 'emerald'
                              ? 'text-[#15803D]'
                              : bMeta.tone === 'amber'
                                ? 'text-[#B45309]'
                                : bMeta.tone === 'crimson'
                                  ? 'text-[#991B1B]'
                                  : 'text-[#9A7B4F]'
                          }`}
                        >
                          {bMeta.labelTh}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[#78716C]">ยอดขอกู้: </span>
                          <span className="font-mono-tabular font-medium text-[#14171A]">
                            {formatThb(bank.requestedAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#78716C]">อนุมัติ: </span>
                          <span
                            className={`font-mono-tabular font-semibold ${
                              bank.approvedAmount > 0 ? 'text-[#15803D]' : 'text-[#78716C]'
                            }`}
                          >
                            {bank.approvedAmount > 0
                              ? formatThb(bank.approvedAmount)
                              : 'รอผลพิจารณา'}
                          </span>
                        </div>
                        {bank.interestRateNote && (
                          <div className="col-span-2 sm:col-span-1 text-[#57534E]">
                            {bank.interestRateNote}
                          </div>
                        )}
                      </div>

                      {bank.remark && (
                        <p className="text-xs text-[#57534E]">
                          รายละเอียด: {bank.remark}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-[#E2DDD4] rounded-xl p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-[#14171A] mb-5">
                ประวัติความคืบหน้าการพิจารณา
              </h3>
              <div className="space-y-5">
                {[...safeTimeline].reverse().map((item, idx) => (
                  <div
                    key={`${item.stepKey}-${idx}`}
                    className="flex gap-4 pb-5 border-b border-[#E2DDD4] last:border-b-0 last:pb-0"
                  >
                    <div className="mt-1 shrink-0">
                      {item.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-[#B45309]" />
                      ) : item.status === 'active' ? (
                        <Clock className="w-4 h-4 text-[#9A7B4F]" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-[#14171A]">
                          {item.title}
                        </p>
                        <span className="text-xs font-mono-tabular text-[#78716C]">
                          {new Date(item.updatedAtIso).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-[#57534E] mt-1 leading-relaxed">
                        {item.detail}
                      </p>
                      <p className="text-xs text-[#78716C] mt-1">
                        ผู้บันทึก: {item.updatedBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
              <div className="relative h-56">
                <img
                  src="/assets/aistudio/image_fb8b8a7e.png"
                  alt={`แบบบ้าน ${dossier.houseType} ยูนิต ${dossier.unitNo}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111315]/90 via-[#111315]/30 to-transparent flex items-end p-5">
                  <div className="text-white">
                    <p className="text-xs text-[#E2CFAF]">
                      Centro พระราม 2 – พุทธบูชา 2
                    </p>
                    <p className="font-display text-2xl font-semibold tracking-wide">
                      แบบบ้าน {dossier.houseType} · ยูนิต {dossier.unitNo}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-[#78716C]">บ้านเลขที่</p>
                    <p className="font-mono-tabular font-semibold text-[#14171A] text-base mt-0.5">
                      {dossier.houseNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#78716C]">ราคาหน้าสัญญา</p>
                    <p className="font-mono-tabular font-semibold text-[#9A7B4F] text-base mt-0.5">
                      {formatThb(dossier.contractPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#78716C]">ขนาดที่ดิน</p>
                    <p className="font-mono-tabular font-medium text-[#14171A] mt-0.5">
                      {dossier.landAreaSqWah.toFixed(1)} ตารางวา
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#78716C]">พื้นที่ใช้สอย</p>
                    <p className="font-mono-tabular font-medium text-[#14171A] mt-0.5">
                      {dossier.usableAreaSqM} ตารางเมตร
                    </p>
                  </div>
                </div>

                {houseSpec && (
                  <div className="pt-4 border-t border-[#E2DDD4] space-y-2">
                    <div className="flex items-center gap-3 text-xs text-[#57534E] tabular-nums">
                      <Home className="w-4 h-4 text-[#9A7B4F] shrink-0" />
                      <span>{houseSpec.bedrooms} ห้องนอน</span>
                      <span aria-hidden="true">·</span>
                      <span>{houseSpec.bathrooms} ห้องน้ำ</span>
                      <span aria-hidden="true">·</span>
                      <span>{houseSpec.parking} ที่จอดรถ</span>
                    </div>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {houseSpec.highlightTh}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-[#E2DDD4] text-xs text-[#57534E]">
                  <p>ที่ปรึกษาสินเชื่อประจำเคส</p>
                  <p className="text-sm font-medium text-[#14171A] mt-0.5">
                    {dossier.advisorName} ·{' '}
                    <span className="font-mono-tabular">{dossier.advisorPhone}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    );
  }

  // ---------------------------------------------------------------------------
  // PUBLIC LANDING: ARCHITECTURAL OBSIDIAN HERO + INSTANT PHONE/NID LOOKUP
  // (House models & prices remain hidden until a valid lookup matches)
  // ---------------------------------------------------------------------------
  return (
    <div>
      <section className="bg-[#111315] text-white border-b border-[#25282D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 bg-[#C9A875]" aria-hidden="true" />
                  <p className="text-xs font-medium tracking-[0.14em] text-[#C9A875]">
                    GAVIN PRIVATE MORTGAGE CONCIERGE
                  </p>
                </div>
                <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.15] max-w-2xl [text-wrap:balance]">
                  บริการตรวจสอบสถานะสินเชื่อบ้านโครงการ Centro พระราม 2 – พุทธบูชา 2
                </h1>
                <p className="text-sm sm:text-base text-[#D6D3D1] max-w-xl leading-relaxed">
                  ติดตามผลพิจารณาจากธนาคาร ข้อมูลบ้านเลขที่และราคาที่จองไว้อย่างเป็นส่วนตัว
                  พร้อมอัปเดตข้อมูลแบบเรียลไทม์ทันทีที่เจ้าหน้าที่บันทึกผล
                </p>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-[#2A2E35] min-h-[260px] sm:min-h-[340px]">
                <img
                  src="/assets/aistudio/image_189de71f.png"
                  alt="ซุ้มทางเข้าโครงการ Centro พระราม 2 – พุทธบูชา 2"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover lg:h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111315]/85 via-[#111315]/15 to-transparent flex items-end justify-between p-5 sm:p-6">
                  <div>
                    <p className="text-xs text-[#E2CFAF]">
                      Centro Rama 2 – Phutthabucha 2
                    </p>
                    <p className="text-sm font-medium text-white mt-0.5">
                      Private Residence Mortgage Tracking
                    </p>
                  </div>
                  <p className="text-xs font-mono-tabular text-[#D6D3D1] hidden sm:block">
                    REAL-TIME CLOUD SYNC
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white text-[#14171A] rounded-xl p-6 sm:p-8 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col justify-between border border-[#E2DDD4]">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-[#9A7B4F] mb-2">
                    <Lock className="w-3.5 h-3.5" />
                    <span>เข้าดูข้อมูลสินเชื่อเฉพาะบุคคล</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-[#14171A] tracking-tight">
                    ค้นหาสถานะสินเชื่อของคุณ
                  </h2>
                  <p className="text-sm text-[#57534E] mt-1.5 leading-relaxed">
                    กรอกเบอร์โทรศัพท์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก
                    โดยไม่ต้องใส่เครื่องหมายขีด (-) เพื่อดูผลพิจารณาได้ทันที
                  </p>
                </div>

                <form onSubmit={handleLookupSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="lookup-identifier"
                      className="block text-xs font-medium text-[#14171A] mb-1.5"
                    >
                      เบอร์โทรศัพท์มือถือ (10 หลัก) หรือ เลขบัตรประชาชน (13 หลัก)
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        ref={inputRef}
                        id="lookup-identifier"
                        type="text"
                        inputMode="numeric"
                        value={identifierInput}
                        onChange={(e) => {
                          const clean = normalizeLookupInput(e.target.value)
                            .replace(/\D/g, '')
                            .slice(0, 13);
                          setIdentifierInput(clean);
                          setLookupError('');
                        }}
                        placeholder="เช่น 0891234567 หรือ 1100400891234"
                        className="w-full pl-10 pr-4 py-3 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D2C7] rounded-lg focus:outline-none focus:border-[#9A7B4F] focus:bg-white transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-[#78716C] mt-1.5">
                      ระบบตัดขีด (-) ให้อัตโนมัติ · รองรับเฉพาะตัวเลข 10 หรือ 13 หลัก
                    </p>
                  </div>

                  {lookupError && (
                    <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] leading-relaxed">
                      {lookupError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full py-3.5 px-4 bg-[#111315] hover:bg-[#25292E] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors duration-150 flex items-center justify-center gap-2"
                  >
                    {isSearching ? 'กำลังค้นหาข้อมูลแบบเรียลไทม์...' : 'เช็คสถานะสินเชื่อ'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="pt-4 border-t border-[#E2DDD4]">
                  <button
                    type="button"
                    onClick={() => setShowDemoList((v) => !v)}
                    className="text-xs font-medium text-[#9A7B4F] hover:underline flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {showDemoList
                      ? 'ซ่อนรายชื่อลูกค้าตัวอย่างสำหรับทดสอบ'
                      : 'แสดงรายชื่อลูกค้าตัวอย่างสำหรับทดสอบ'}
                  </button>

                  {showDemoList && (
                    <div className="mt-3 space-y-2 text-xs bg-[#FAF9F6] border border-[#E2DDD4] rounded-lg p-3.5">
                      {INITIAL_DEMO_LOANS.map((demo) => (
                        <div
                          key={demo.appId}
                          className="flex items-center justify-between gap-2 py-1.5 border-b border-[#E2DDD4] last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-[#14171A] truncate">
                              {demo.customerName}
                            </p>
                            <p className="font-mono-tabular text-[11px] text-[#57534E]">
                              โทร {demo.phone} · บัตร {demo.nationalId}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={isSearching}
                            onClick={() => fillDemoCustomer(demo.phone)}
                            className="px-2.5 py-1 bg-[#111315] hover:bg-[#25292E] text-white rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors"
                          >
                            ดูสถานะทันที
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-5 mt-6 border-t border-[#E2DDD4] flex items-center justify-between text-xs text-[#78716C]">
                <span>ซิงค์ข้อมูลออนไลน์แบบเรียลไทม์</span>
                <span className="font-mono-tabular">CLOUD FIRESTORE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-14 space-y-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="border-t border-[#C9A875] pt-5">
            <p className="font-mono-tabular text-xs text-[#9A7B4F] mb-2">01</p>
            <h3 className="text-base font-semibold text-[#14171A] mb-1.5">
              กรอกเบอร์โทรหรือบัตร 13 หลัก
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              กรอกตัวเลขติดกันโดยไม่ต้องมีขีด (-) เช็คผลพิจารณาได้ทันทีในขั้นตอนเดียว
            </p>
          </div>

          <div className="border-t border-[#D8D2C7] pt-5">
            <p className="font-mono-tabular text-xs text-[#9A7B4F] mb-2">02</p>
            <h3 className="text-base font-semibold text-[#14171A] mb-1.5">
              ติดตามผลได้หลายธนาคารพร้อมกัน
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              เปรียบเทียบความคืบหน้า วงเงินอนุมัติ และดอกเบี้ยแยกตามแต่ละธนาคารที่ยื่นกู้
            </p>
          </div>

          <div className="border-t border-[#D8D2C7] pt-5">
            <p className="font-mono-tabular text-xs text-[#9A7B4F] mb-2">03</p>
            <h3 className="text-base font-semibold text-[#14171A] mb-1.5">
              ซ่อนแบบบ้านและราคาจากบุคคลทั่วไป
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              รายละเอียดบ้านเลขที่ แบบบ้าน และราคาที่จองไว้จะแสดงเฉพาะเมื่อค้นหาด้วยข้อมูลลูกค้า
            </p>
          </div>

          <div className="border-t border-[#D8D2C7] pt-5">
            <p className="font-mono-tabular text-xs text-[#9A7B4F] mb-2">04</p>
            <h3 className="text-base font-semibold text-[#14171A] mb-1.5">
              ซิงค์ข้อมูลออนไลน์แบบเรียลไทม์
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              จัดเก็บข้อมูลถาวรบน Cloud Firestore เมื่อเจ้าหน้าที่อัปเดต หน้าจอลูกค้าจะเปลี่ยนทันที
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-[#E2DDD4] min-h-[280px]">
            <img
              src="/assets/aistudio/image_fb8b8a7e.png"
              alt="สถาปัตยกรรมโครงการ Centro พระราม 2 – พุทธบูชา 2"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover lg:h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111315]/75 via-transparent to-transparent flex items-end p-6">
              <p className="text-xs sm:text-sm text-white/95">
                Centro พระราม 2 – พุทธบูชา 2 · บริการที่ปรึกษาสินเชื่อส่วนบุคคลโดยทีม GAVIN
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-[#E2DDD4] rounded-xl p-8 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-xs font-medium tracking-wider text-[#9A7B4F] mb-2">
                REAL-TIME CLIENT PORTAL
              </p>
              <h2 className="font-display text-3xl font-semibold text-[#14171A] tracking-tight mb-3">
                มาตรฐานความปลอดภัยและความเป็นส่วนตัว
              </h2>
              <p className="text-sm text-[#57534E] leading-relaxed">
                GAVIN ออกแบบระบบให้ข้อมูลการจองบ้าน แบบบ้าน และราคาขายของโครงการไม่แสดงต่อสาธารณะ
                ลูกค้าจะเห็นเฉพาะรายละเอียดบ้านและผลสินเชื่อของตนเองเมื่อค้นหาด้วยเบอร์โทรศัพท์หรือเลขบัตรประชาชนเท่านั้น
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#E2DDD4] text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#57534E]">วิธีตรวจสอบข้อมูล</span>
                <span className="font-medium text-[#14171A]">
                  เบอร์มือถือ 10 หลัก หรือ บัตรประชาชน 13 หลัก
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#57534E]">การจัดเก็บข้อมูลออนไลน์</span>
                <span className="font-medium text-[#15803D]">
                  Cloud Firestore แบบเรียลไทม์
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
