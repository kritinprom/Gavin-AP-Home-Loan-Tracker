/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { INITIAL_CENTRO_UNITS } from './data/centroUnits';
import {
  auth,
  completeGoogleRedirectSignIn,
  db,
  logFirestoreError,
  OperationType,
  PRIMARY_ADMIN_EMAIL,
  UnitRecord,
} from './lib/firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ActiveTab, Navbar } from './components/Navbar';
import { CustomerPortal } from './components/CustomerPortal';
import { AdminConsole } from './components/AdminConsole';
import { BackgroundMusicBar } from './components/BackgroundMusicBar';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('track');
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cloudUnits, setCloudUnits] = useState<UnitRecord[]>([]);
  const [isCloudSeeded, setIsCloudSeeded] = useState(false);

  const isVerifiedAdmin = Boolean(
    currentUser &&
      currentUser.emailVerified &&
      currentUser.email === PRIMARY_ADMIN_EMAIL
  );

  useEffect(() => {
    completeGoogleRedirectSignIn().catch(() => {});
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Only verified admins subscribe to full /units inventory & pricing
  useEffect(() => {
    if (!isVerifiedAdmin) {
      setCloudUnits([]);
      return;
    }

    const unsubUnits = onSnapshot(
      collection(db, 'units'),
      (snap) => {
        if (snap.empty) {
          setCloudUnits([]);
          setIsCloudSeeded(false);
        } else {
          const list = snap.docs.map((d) => d.data() as UnitRecord);
          list.sort((a, b) => a.unitNo.localeCompare(b.unitNo));
          setCloudUnits(list);
          setIsCloudSeeded(true);
        }
      },
      (err) => {
        logFirestoreError(err, OperationType.LIST, 'units');
      }
    );
    return () => unsubUnits();
  }, [isVerifiedAdmin]);

  const adminUnits: UnitRecord[] =
    cloudUnits.length > 0 ? cloudUnits : INITIAL_CENTRO_UNITS;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#F6F4EF] text-[#14171A]">
        <Navbar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onFocusSearch={() => setFocusTrigger((c) => c + 1)}
        />

        <main className="flex-1 pb-24">
          {activeTab === 'track' && (
            <CustomerPortal
              focusTrigger={focusTrigger}
              isCloudSeeded={isCloudSeeded}
            />
          )}

          {activeTab === 'admin' && (
            <AdminConsole
              currentUser={currentUser}
              units={adminUnits}
              isCloudSeeded={isCloudSeeded}
            />
          )}
        </main>

        <footer className="border-t border-[#E2DDD4] bg-white py-8 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#78716C]">
            <div>
              <span className="font-display text-base font-semibold text-[#14171A] mr-2">
                GAVIN
              </span>
              <span>ศูนย์ติดตามสินเชื่อบ้านโครงการ Centro พระราม 2 – พุทธบูชา 2</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('track')}
                className="hover:text-[#14171A] transition-colors"
              >
                ติดตามสินเชื่อ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="hover:text-[#14171A] transition-colors"
              >
                สำหรับเจ้าหน้าที่
              </button>
            </div>
          </div>
        </footer>

        <BackgroundMusicBar />
      </div>
    </ErrorBoundary>
  );
}
