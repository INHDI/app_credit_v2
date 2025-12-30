/**
 * Export API Service
 * Handles Excel file downloads for contracts
 */
import { API_CONFIG } from '@/config/config';
import { getAuthHeaders } from './authApi';

export interface ExportParams {
    status?: string;
    search?: string;
    ma_hd?: string;
    ho_ten_list?: string;  // Comma-separated list of HoTen names
}

/**
 * Export service for downloading Excel files
 */
export const ExportService = {
    /**
     * Export Tin Chap contracts to Excel
     */
    async exportTinChap(params?: ExportParams): Promise<void> {
        await downloadExcel('/export/tin-chap', params, 'TinChap');
    },

    /**
     * Export Tra Gop contracts to Excel
     */
    async exportTraGop(params?: ExportParams): Promise<void> {
        await downloadExcel('/export/tra-gop', params, 'TraGop');
    },
};

/**
 * Helper function to download Excel file
 */
async function downloadExcel(
    endpoint: string,
    params?: ExportParams,
    defaultFilename: string = 'Export'
): Promise<void> {
    try {
        // Build URL with query params
        const url = new URL(`${API_CONFIG.BASE_URL}${endpoint}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.append(key, value);
                }
            });
        }

        // Fetch the file
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                ...getAuthHeaders(),
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `${defaultFilename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename=(.+)/);
            if (filenameMatch) {
                filename = filenameMatch[1].replace(/"/g, '');
            }
        }

        // Convert response to ArrayBuffer first, then create blob with correct type
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Create download link
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
}

export default ExportService;
