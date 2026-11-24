import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      if (this.state.message.includes('Missing or insufficient permissions')) {
        friendly = 'สิทธิ์การเข้าถึงข้อมูลไม่เพียงพอ กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุญาต';
      }
      return (
        <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E5E2DC] rounded-xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#991B1B]/10 flex items-center justify-center text-[#991B1B]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-[#14171A] mb-2">
              ไม่สามารถดำเนินการต่อได้
            </h2>
            <p className="text-sm text-[#57534E] mb-6 leading-relaxed break-words">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14171A] text-white text-sm font-medium rounded-lg hover:bg-[#272B30] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              โหลดหน้าใหม่
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
