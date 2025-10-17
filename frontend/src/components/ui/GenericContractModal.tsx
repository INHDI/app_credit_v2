"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Modal from "@/components/ui/Modal";
import { ContractModalConfig, FieldConfig } from '@/types/contract';

interface GenericContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  config: ContractModalConfig;
}

export default function GenericContractModal({ 
  isOpen, 
  onClose, 
  onSave, 
  loading = false,
  error: externalError,
  success: externalSuccess,
  config
}: GenericContractModalProps) {
  // Local state for handling UI feedback
  const [apiLoading, setApiLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  
  // Use external error/success if provided, otherwise use local state
  const apiError = externalError || localError;
  const apiSuccess = externalSuccess || localSuccess;

  // Set today's date only on client side to avoid hydration mismatch
  useEffect(() => {
    const todayDate = new Date();
    setFormData(prev => ({ ...prev, ngay_vay: todayDate }));
  }, []);

  const [formData, setFormData] = useState<Record<string, any>>(config.defaultValues);

  // Handle input changes with proper type conversion
  const handleInputChange = (field: FieldConfig, value: string | number | Date) => {
    setFormData((prev) => {
      let processedValue = value;
      
      // Handle different field types
      if (field.type === 'date') {
        processedValue = new Date(value as string);
      } else if (field.type === 'number' || field.type === 'currency') {
        processedValue = parseFloat(value as string) || 0;
      }
      
      // Apply custom parsing if provided
      if (field.parseValue) {
        processedValue = field.parseValue(value as string);
      }
      
      return { ...prev, [field.key]: processedValue };
    });
  };

  // Function to format currency values
  const formatCurrency = (value: string) => {
    if (!value || value === "0" || value === "") {
      return "";
    }
    const numberValue = parseFloat(value.replace(/[^\d]/g, ''));
    return isNaN(numberValue) ? '' : numberValue.toLocaleString('vi-VN');
  };

  // Get formatted value for display
  const getDisplayValue = (field: FieldConfig, value: any) => {
    if (field.formatValue && value !== undefined && value !== null) {
      return field.formatValue(value);
    }
    
    if (field.type === 'date' && value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    
    if (field.type === 'currency' && typeof value === 'number') {
      return formatCurrency(value.toString());
    }
    
    return value?.toString() || '';
  };

  // Handle save action
  const handleSave = async () => {
    try {
      setApiLoading(true);
      setLocalError(null);
      setLocalSuccess(null);
      
      if (onSave) {
        await onSave(formData);
        onClose();
      } else {
        console.log('No onSave callback provided, form data:', formData);
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating contract:', error);
      setLocalError(error?.message || 'Có lỗi xảy ra khi tạo hợp đồng');
    } finally {
      setApiLoading(false);
    }
  };

  // Render field based on type
  const renderField = (field: FieldConfig) => {
    const displayValue = getDisplayValue(field, formData[field.key]);
    const IconComponent = field.icon;

    const commonProps = {
      placeholder: field.placeholder,
      className: "rounded-xl border-slate-200 focus:border-emerald-300",
      required: field.required
    };

    const labelElement = (
      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
        {IconComponent && <IconComponent className="h-4 w-4" />}
        {field.label} {field.required && '*'}
      </label>
    );

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div className="space-y-2">
            {labelElement}
            <Input
              {...commonProps}
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              value={displayValue}
              onChange={(e) => handleInputChange(field, e.target.value)}
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            {labelElement}
            <Input
              {...commonProps}
              type="number"
              value={displayValue}
              onChange={(e) => handleInputChange(field, e.target.value)}
              min={field.validation?.min}
              max={field.validation?.max}
            />
          </div>
        );

      case 'currency':
        return (
          <div className="space-y-2">
            {labelElement}
            <Input
              {...commonProps}
              placeholder={field.placeholder}
              value={displayValue}
              onChange={(e) => handleInputChange(field, e.target.value.replace(/[^\d]/g, ''))}
            />
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            {labelElement}
            <Input
              {...commonProps}
              type="date"
              value={displayValue}
              onChange={(e) => handleInputChange(field, e.target.value)}
            />
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            {labelElement}
            <Select 
              value={formData[field.key]} 
              onValueChange={(value) => handleInputChange(field, value)}
            >
              <SelectTrigger className="rounded-xl border-slate-200">
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            {labelElement}
            <Textarea
              {...commonProps}
              value={displayValue}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="rounded-xl border-slate-200 focus:border-blue-300 min-h-[100px]"
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Group fields by grid layout
  const getGridCols = (field: FieldConfig) => {
    return field.gridCols || 1;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      size="xl"
      className="max-h-[95vh] sm:max-h-[90vh]"
    >
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 max-h-[70vh] sm:max-h-[80vh] overflow-y-auto">
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${config.gridLayout?.cols || 3} gap-${config.gridLayout?.gap || 3}`}>
          {config.fields.map((field) => (
            <div 
              key={field.key}
              className={`col-span-${getGridCols(field)}`}
            >
              {renderField(field)}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {apiError && (
        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Lỗi</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{apiError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {apiSuccess && (
        <div className="mx-6 mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Thành công</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{apiSuccess}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Responsive */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between sm:justify-end gap-2 sm:gap-4 p-3 sm:p-6 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
        <Button
          variant="outline"
          onClick={onClose}
          className="rounded-xl border-slate-200 hover:bg-slate-50 px-4 sm:px-8 text-sm flex-1 sm:flex-none"
        >
          Đóng
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading || apiLoading}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg px-4 sm:px-8 text-sm flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || apiLoading ? 'Đang lưu...' : 'Lưu lại'}
        </Button>
      </div>
    </Modal>
  );
}
