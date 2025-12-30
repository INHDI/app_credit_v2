"use client";

import { useState, useEffect } from "react";
import { Download, X, Users } from "lucide-react";

interface Debtor {
    name: string;
    count: number;
}

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (selectedNames: string[]) => void;
    debtors: Debtor[];
    type: "tinchap" | "tragop";
}

export default function ExportModal({
    isOpen,
    onClose,
    onExport,
    debtors,
    type,
}: ExportModalProps) {
    const [selectedNames, setSelectedNames] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSelectedNames([]);
            setSelectAll(false);
        }
    }, [isOpen]);

    const handleToggleName = (name: string) => {
        setSelectedNames((prev) =>
            prev.includes(name)
                ? prev.filter((n) => n !== name)
                : [...prev, name]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedNames([]);
        } else {
            setSelectedNames(debtors.map((d) => d.name));
        }
        setSelectAll(!selectAll);
    };

    const handleExport = () => {
        onExport(selectedNames);
        onClose();
    };

    const handleExportAll = () => {
        onExport([]);  // Empty array means export all
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Xuất Excel {type === "tinchap" ? "Tín Chấp" : "Trả Góp"}
                            </h2>
                            <p className="text-sm text-gray-500">
                                Chọn người nợ để xuất hoặc xuất tất cả
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {debtors.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Không có dữ liệu người nợ
                        </div>
                    ) : (
                        <>
                            {/* Select All */}
                            <label className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors mb-4">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="font-semibold text-gray-900">
                                    Chọn tất cả ({debtors.length} người)
                                </span>
                            </label>

                            {/* Debtor List */}
                            <div className="space-y-2">
                                {debtors.map((debtor) => (
                                    <label
                                        key={debtor.name}
                                        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedNames.includes(debtor.name)}
                                            onChange={() => handleToggleName(debtor.name)}
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                                {debtor.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {debtor.count} hợp đồng
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 flex gap-3">
                    <button
                        onClick={handleExportAll}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Xuất tất cả
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={selectedNames.length === 0}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Xuất đã chọn ({selectedNames.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
