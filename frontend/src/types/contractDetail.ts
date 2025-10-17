// Contract Detail Types
export interface ContractDetailData {
  id: string;
  ma_hop_dong: string;
  ten_khach_hang: string;
  customerInfo: string;
  ngay_vay?: string;
  tong_tien_vay: number;
  lai_suat: string;
  kieu_lai_suat: string;
  total_interest_paid?: number;
  unpaid_amount?: number;
  amount_to_collect?: number;
  daily_interest?: number;
  status: string;
  statusColor: string;
}

export interface PaymentHistoryItem {
  id: number;
  ngay_tra_lai: string;
  so_tien_lai: number;
  so_tien_tra: number;
  trang_thai: string;
  ghi_chu?: string;
  created_at?: string;
}

// Tab Configuration
export interface DetailTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Detail Modal Configuration
export interface ContractDetailConfig {
  title: string;
  tabs: DetailTab[];
  contractType: 'tin_chap' | 'tra_gop';
  apiEndpoint: string;
  paymentApiEndpoint: string;
}

// Contract Type Enum
export enum ContractDetailType {
  TIN_CHAP = 'tin_chap',
  TRA_GOP = 'tra_gop'
}
