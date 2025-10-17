import { ContractDetailConfig, ContractDetailType } from '@/types/contractDetail';
import { FileText, CalendarDays, CreditCard, DollarSign } from 'lucide-react';

// Tab configurations
const commonTabs = [
  {
    id: "overview",
    label: "Thông tin vay",
    icon: FileText
  },
  {
    id: "payments",
    label: "Lịch sử trả lãi",
    icon: CalendarDays
  }
];

// Contract-specific detail configurations
export const contractDetailConfigs: Record<ContractDetailType, ContractDetailConfig> = {
  [ContractDetailType.TIN_CHAP]: {
    title: 'Chi tiết hợp đồng tín chấp',
    tabs: commonTabs,
    contractType: 'tin_chap',
    apiEndpoint: '/tra_lai_tin_chap',
    paymentApiEndpoint: '/process_payment_tin_chap'
  },

  [ContractDetailType.TRA_GOP]: {
    title: 'Chi tiết hợp đồng trả góp',
    tabs: commonTabs,
    contractType: 'tra_gop',
    apiEndpoint: '/tra_lai_tra_gop',
    paymentApiEndpoint: '/process_payment_tra_gop'
  }
};

// Helper function to get config by contract type
export const getContractDetailConfig = (contractType: ContractDetailType): ContractDetailConfig => {
  return contractDetailConfigs[contractType];
};
