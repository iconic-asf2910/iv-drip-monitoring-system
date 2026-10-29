import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';

interface QRCodeModalProps {
  deviceId: string;
  label: string;
  bedNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ deviceId, label, bedNumber, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = `${window.location.origin}/monitoring?device=${deviceId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Device QR Code</h3>
            <p className="text-xs text-slate-500">{deviceId} — {label} ({bedNumber})</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center mb-5 shadow-inner">
          <div className="bg-white p-4 rounded-xl shadow-md border border-slate-100">
            <QRCodeCanvas value={currentUrl} size={180} level="H" includeMargin={true} />
          </div>
          <span className="text-xs text-slate-500 mt-3 text-center">
            Scan with phone camera to open direct monitoring view
          </span>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-700">Direct URL:</div>
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200 text-xs text-slate-600 overflow-hidden">
            <span className="truncate flex-1 font-mono">{currentUrl}</span>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5 shrink-0 font-medium shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <a
            href={`/monitoring?device=${deviceId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <ExternalLink className="w-4 h-4" />
            Open Monitoring Tab
          </a>
        </div>
      </div>
    </div>
  );
};
