"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  className?: string;
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = "lg",
  showCloseButton = true,
  className = ""
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg", 
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-7xl"
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Enhanced Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center">
        <div 
          className={`relative w-full ${sizeClasses[size]} ${className} transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-3 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">+</span>
              </div>
              {title}
            </h2>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Đóng"
              >
                <X className="h-5 w-5 text-slate-600" />
              </Button>
            )}
          </div>

          {/* Modal Content */}
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
