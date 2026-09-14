// FileName: src/hooks/useAuditLog.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import { useAuth } from '../context/AuthContext.jsx';

/**
 * Custom hook to record audit logs for user actions.
 */
export function useAuditLog() {
    const { user } = useAuth();

    const logAction = async (eventType, details = {}) => {
        // Prevent logging if DB API isn't available or user isn't loaded
        if (!window.electronAPI || typeof window.electronAPI.queryDatabase !== 'function') {
            console.error('Audit log failed: electronAPI.queryDatabase is not available.');
            return;
        }
        if (!user || !user.id) {
            console.warn('Audit log skipped: User not authenticated.');
            return;
        }

        try {
            await window.electronAPI.queryDatabase(
                `INSERT INTO audit_log 
                (event_type, table_name, record_id, old_values, new_values, user_id, username)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    eventType || 'UNKNOWN',
                    details.tableName || null,
                    details.recordId || null,
                    details.oldValues ? JSON.stringify(details.oldValues) : null,
                    details.newValues ? JSON.stringify(details.newValues) : null,
                    user.id,
                    user.username || 'System'
                ]
            );
        } catch (error) {
            console.error('Failed to log audit event:', error.message);
            // Fail silently to avoid blocking the user's actual action, 
            // but visible in console for debugging.
        }
    };

    return { logAction };
}

