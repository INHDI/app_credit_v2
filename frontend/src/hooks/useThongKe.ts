import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchThongKe, ThongKeData, Granularity } from '@/services/thongkeApi';

interface UseThongKeProps {
  granularity: Granularity;
  startDate: string; // DD-MM-YYYY
  endDate: string;   // DD-MM-YYYY
}

export function useThongKe({
  granularity: initialGranularity,
  startDate: initialStartDate,
  endDate: initialEndDate,
}: UseThongKeProps) {
  const [granularity, setGranularity] = useState<Granularity>(initialGranularity);
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [data, setData] = useState<ThongKeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchThongKe(granularity, startDate, endDate);
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to fetch statistics');
        setData(null);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [granularity, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = useMemo(() => {
    const chi = data?.summary?.total_disbursed ?? 0;
    const thu = data?.summary?.total_collected ?? 0;
    const lai = data?.summary?.total_interest ?? 0;
    const net = data?.summary?.net_cash_flow ?? 0;
    const overdueAmount = data?.summary?.overdue_amount ?? 0;
    return { chi, thu, lai, net, overdueAmount };
  }, [data]);

  const series = useMemo(() => {
    if (!data?.trend) return null;
    return { data: data.trend };
  }, [data]);

  return {
    state: { granularity, startDate, endDate },
    setGranularity,
    setStartDate,
    setEndDate,
    data: series,
    totals,
    statistics: data,
    loading,
    error,
  };
}

