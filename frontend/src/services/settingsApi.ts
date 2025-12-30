
/**
 * API service for System Settings
 */
import { API_CONFIG, API_HEADERS, ENV_CONFIG } from '@/config/config';
import { getAuthHeaders } from './authApi';

export interface Bank {
    id: number;
    name: string;
    short_name: string;
    code: string;
    bin: string;
}

export interface SystemSettings {
    id: number;
    bank_id?: number | null;
    bank_account_no?: string | null;
    bank_account_name?: string | null;

    zalo_enabled: boolean;
    zalo_webhook_url?: string | null;

    telegram_enabled: boolean;
    telegram_bot_token?: string | null;
    telegram_chat_id?: string | null;

    email_enabled: boolean;
    email_host?: string | null;
    email_port?: number | null;
    email_user?: string | null;
    email_password?: string | null;

    site_name: string;
}

export interface SystemSettingsUpdate extends Partial<Omit<SystemSettings, 'id'>> { }

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
}

export async function getBanks(): Promise<ApiResponse<Bank[]>> {
    const url = `${ENV_CONFIG.API_BASE_URL}/settings/banks`;
    const resp = await fetch(url, {
        method: 'GET',
        headers: {
            ...API_HEADERS.JSON_ACCEPT,
            ...getAuthHeaders()
        }
    });

    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
    }

    return await resp.json();
}

export async function getSettings(): Promise<ApiResponse<SystemSettings>> {
    const url = `${ENV_CONFIG.API_BASE_URL}/settings`;
    const resp = await fetch(url, {
        method: 'GET',
        headers: {
            ...API_HEADERS.JSON_ACCEPT,
            ...getAuthHeaders()
        }
    });

    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
    }

    return await resp.json();
}

export async function updateSettings(settings: SystemSettingsUpdate): Promise<ApiResponse<SystemSettings>> {
    const url = `${ENV_CONFIG.API_BASE_URL}/settings`;
    const resp = await fetch(url, {
        method: 'PUT',
        headers: {
            ...API_HEADERS.JSON,
            ...getAuthHeaders()
        },
        body: JSON.stringify(settings)
    });

    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
    }

    return await resp.json();
}
