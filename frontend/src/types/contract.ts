// Generic contract form data interface
export interface BaseContractFormData {
  ho_ten: string;
  ngay_vay: Date;
}

// Specific contract types extending base
export interface TinChapFormData extends BaseContractFormData {
  so_tien_vay: number;
  ky_dong: number;
  lai_suat: number;
}

export interface TraGopFormData extends BaseContractFormData {
  so_tien_vay: number;
  ky_dong: number;
  so_lan_tra: number;
  lai_suat: number;
}

// Field configuration types
export type FieldType = 
  | "text" 
  | "number" 
  | "currency" 
  | "date" 
  | "select" 
  | "textarea" 
  | "email" 
  | "phone";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  options?: SelectOption[];
  gridCols?: number; // For responsive grid layout
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  formatValue?: (value: any) => string;
  parseValue?: (value: string) => any;
}

export interface ContractModalConfig {
  title: string;
  fields: FieldConfig[];
  defaultValues: Record<string, any>;
  gridLayout?: {
    cols: number;
    gap: number;
  };
}

// Contract type enum
export enum ContractType {
  TIN_CHAP = "tin_chap",
  TRA_GOP = "tra_gop"
}
