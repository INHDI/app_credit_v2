import { ContractModalConfig, ContractType, FieldConfig } from '@/types/contract';
import { User, DollarSign, Calendar, Clock } from 'lucide-react';

// Base common fields (shared by all contract types)
const baseCommonFields: FieldConfig[] = [
  {
    key: 'ho_ten',
    label: 'Họ Tên',
    type: 'text',
    placeholder: 'Nhập họ và tên',
    required: true,
    icon: User,
    gridCols: 1
  },
  {
    key: 'ngay_vay',
    label: 'Ngày Vay',
    type: 'date',
    required: true,
    icon: Calendar,
    gridCols: 1
  }
];

// Common financial fields
const commonFinancialFields: FieldConfig[] = [
  {
    key: 'so_tien_vay',
    label: 'Số tiền vay',
    type: 'currency',
    placeholder: 'Nhập số tiền',
    required: true,
    icon: DollarSign,
    gridCols: 1,
    formatValue: (value: number) => value.toLocaleString('vi-VN'),
    parseValue: (value: string) => parseFloat(value.replace(/[^\d]/g, '')) || 0
  },
  {
    key: 'ky_dong',
    label: 'Kỳ đóng (ngày)',
    type: 'number',
    placeholder: 'Nhập số ngày',
    required: true,
    icon: Clock,
    gridCols: 1,
    validation: {
      min: 1
    }
  }
];

// Contract-specific field configurations
const tinChapSpecificFields: FieldConfig[] = [
  // Tín chấp: Lãi suất cố định mỗi kỳ (VNĐ)
  {
    key: 'lai_suat',
    label: 'Lãi suất (VNĐ/kỳ)',
    type: 'currency',
    placeholder: '0',
    required: true,
    icon: DollarSign,
    gridCols: 1,
    formatValue: (value: number) => value.toLocaleString('vi-VN'),
    parseValue: (value: string) => parseFloat(value.replace(/[^\d]/g, '')) || 0
  }
];

const traGopSpecificFields: FieldConfig[] = [
  // Trả góp: Tổng số lần trả
  {
    key: 'so_lan_tra',
    label: 'Số lần trả',
    type: 'number',
    placeholder: 'Nhập số lần',
    required: true,
    icon: Calendar,
    gridCols: 1,
    validation: {
      min: 1
    }
  },
  // Trả góp: Tổng lãi cả kỳ hạn (VNĐ)
  {
    key: 'lai_suat',
    label: 'Lãi suất (VNĐ)',
    type: 'currency',
    placeholder: '0',
    required: true,
    icon: DollarSign,
    gridCols: 1,
    formatValue: (value: number) => value.toLocaleString('vi-VN'),
    parseValue: (value: string) => parseFloat(value.replace(/[^\d]/g, '')) || 0
  }
];
// Contract-specific configurations
export const contractConfigs: Record<ContractType, ContractModalConfig> = {
  [ContractType.TIN_CHAP]: {
    title: 'Thêm mới hợp đồng tín chấp',
    gridLayout: {
      cols: 3,
      gap: 3
    },
    fields: [
      ...baseCommonFields,
      ...commonFinancialFields,
      ...tinChapSpecificFields
    ],
    defaultValues: {
      ho_ten: '',
      ngay_vay: new Date(),
      so_tien_vay: 0,
      ky_dong: 1,
      lai_suat: 0
    }
  },

  [ContractType.TRA_GOP]: {
    title: 'Thêm mới hợp đồng trả góp',
    gridLayout: {
      cols: 3,
      gap: 3
    },
    fields: [
      ...baseCommonFields,
      ...commonFinancialFields,
      ...traGopSpecificFields
    ],
    defaultValues: {
      ho_ten: '',
      ngay_vay: new Date(),
      so_tien_vay: 0,
      ky_dong: 1,
      so_lan_tra: 1,
      lai_suat: 0
    }
  }
};

// Helper function to get config by contract type
export const getContractConfig = (contractType: ContractType): ContractModalConfig => {
  return contractConfigs[contractType];
};
