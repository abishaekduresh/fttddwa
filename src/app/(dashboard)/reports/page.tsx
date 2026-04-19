"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Filter } from "lucide-react";
import { TAMIL_NADU_DISTRICTS } from "@/constants/districts";

export default function ReportsPage() {
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);

  const exportData = async (format: string) => {
    setExporting(format);
    const params = new URLSearchParams({ format, ...(district && { district }), ...(status && { status }) });
    const url = `/api/members/export?${params}`;

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.click();

    setTimeout(() => setExporting(null), 2000);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Exports</h1>
        <p className="text-slate-500 text-sm">Download member data in various formats</p>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Filter size={16} /> Filter Options
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">District</label>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} className="form-input">
              <option value="">All Districts</option>
              {Object.keys(TAMIL_NADU_DISTRICTS).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-input">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <FileSpreadsheet size={24} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Excel Export</h3>
              <p className="text-sm text-slate-500 mt-1">
                Download all member data as a formatted Excel spreadsheet (.xlsx) with auto-filter support.
              </p>
              <button
                onClick={() => exportData("excel")}
                disabled={exporting === "excel"}
                className="btn btn-primary mt-4 w-full"
              >
                <Download size={15} />
                {exporting === "excel" ? "Downloading..." : "Download Excel"}
              </button>
            </div>
          </div>
        </div>

        <div className="card p-5 opacity-75">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <FileText size={24} className="text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">PDF Export</h3>
              <p className="text-sm text-slate-500 mt-1">
                Generate a formatted PDF report with member details and membership cards.
              </p>
              <button disabled className="btn btn-outline mt-4 w-full opacity-50 cursor-not-allowed">
                <Download size={15} /> Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Export Notes:</p>
        <ul className="space-y-1 list-disc list-inside text-blue-700">
          <li>Aadhaar numbers are masked in exports for security</li>
          <li>Large datasets may take a few moments to generate</li>
          <li>Apply filters above to export specific member groups</li>
          <li>Exports include all fields except sensitive security data</li>
        </ul>
      </div>
    </div>
  );
}
