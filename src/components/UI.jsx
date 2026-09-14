// FileName: src/components/UI.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Reusable UI components — cards, badges, buttons, tables, empty states, info boxes

import React from 'react';

// ═══════════════════════════════════════════════════════════
// STAT CARD — for dashboard metrics
// ═══════════════════════════════════════════════════════════

export const StatCard = ({ title, value, subtitle, icon, color = '#1a73e8', trend, trendValue }) => (
    <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderLeft: `4px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'transform 0.2s, box-shadow 0.2s'
    }}>
        {/* Icon */}
        <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `${color}15`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            flexShrink: 0
        }}>
            {icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
                fontSize: '12px',
                color: '#5f6368',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '2px'
            }}>
                {title}
            </div>
            <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: color,
                lineHeight: 1.1
            }}>
                {value}
            </div>
            {subtitle && (
                <div style={{
                    fontSize: '12px',
                    color: '#5f6368',
                    marginTop: '4px'
                }}>
                    {subtitle}
                </div>
            )}
            {trend && (
                <div style={{
                    fontSize: '11px',
                    marginTop: '4px',
                    color: trend === 'up' ? '#0d904f' : '#d32f2f',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    {trend === 'up' ? '↑' : '↓'} {trendValue}
                </div>
            )}
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════
// SECTION — wrapper with header + optional action button
// ═══════════════════════════════════════════════════════════

export const Section = ({ title, children, action }) => (
    <div style={{ marginBottom: '24px' }}>
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
        }}>
            <h2 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#202124',
                margin: 0
            }}>
                {title}
            </h2>
            {action}
        </div>
        {children}
    </div>
);

// ═══════════════════════════════════════════════════════════
// INFO BOX — success/error/warning messages
// ═══════════════════════════════════════════════════════════

export const InfoBox = ({ children, variant = 'default' }) => {
    const styles = {
        default: { bg: '#f1f3f4', color: '#5f6368', border: '#dadce0', icon: 'ℹ️' },
        success: { bg: '#e8f5e9', color: '#0d904f', border: '#a5d6a7', icon: '✅' },
        danger: { bg: '#ffebee', color: '#c62828', border: '#ef9a9a', icon: '⚠️' },
        warning: { bg: '#fff3e0', color: '#e65100', border: '#ffcc80', icon: '⚠️' },
        info: { bg: '#e8f0fe', color: '#1a73e8', border: '#aecbfa', icon: 'ℹ️' }
    };

    const s = styles[variant] || styles.default;

    return (
        <div style={{
            background: s.bg,
            color: s.color,
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            border: `1px solid ${s.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            <span style={{ fontSize: '16px' }}>{s.icon}</span>
            <span>{children}</span>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// EMPTY STATE — shown when no data exists
// ═══════════════════════════════════════════════════════════

export const EmptyState = ({ icon = '📋', title = 'No data found', text = 'There are no records to display' }) => (
    <div style={{
        textAlign: 'center',
        padding: '48px 24px',
        color: '#999'
    }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>{icon}</div>
        <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#5f6368',
            marginBottom: '4px'
        }}>
            {title}
        </div>
        <div style={{
            fontSize: '13px',
            color: '#999'
        }}>
            {text}
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════
// BADGE — small status labels
// ═══════════════════════════════════════════════════════════

export const Badge = ({ children, variant = 'primary' }) => {
    const styles = {
        primary: { bg: '#e8f0fe', color: '#1a73e8' },
        success: { bg: '#e8f5e9', color: '#0d904f' },
        danger: { bg: '#ffebee', color: '#c62828' },
        warning: { bg: '#fff3e0', color: '#e65100' },
        info: { bg: '#e3f2fd', color: '#1565c0' }
    };

    const s = styles[variant] || styles.primary;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '600',
            background: s.bg,
            color: s.color,
            whiteSpace: 'nowrap'
        }}>
            {children}
        </span>
    );
};

// ═══════════════════════════════════════════════════════════
// STATUS DOT — small colored circle for active/inactive status
// ═══════════════════════════════════════════════════════════

export const StatusDot = ({ status = 'active' }) => {
    const colors = {
        active: '#0d904f',
        inactive: '#d32f2f',
        pending: '#e65100',
        draft: '#5f6368'
    };

    return (
        <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: colors[status] || colors.inactive,
            marginRight: '6px',
            flexShrink: 0
        }} />
    );
};

// ═══════════════════════════════════════════════════════════
// ACTION BUTTON — small button for table row actions
// ═══════════════════════════════════════════════════════════

export const ActionBtn = ({ children, onClick, danger, disabled, ...props }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: danger ? 'transparent' : 'transparent',
            color: disabled ? '#ccc' : (danger ? '#d32f2f' : '#1a73e8'),
            opacity: disabled ? 0.5 : 1,
            transition: 'opacity 0.2s',
            whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
            if (!disabled) e.target.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
            if (!disabled) e.target.style.opacity = '1';
        }}
        {...props}
    >
        {children}
    </button>
);

// ═══════════════════════════════════════════════════════════
// TABLE CONTAINER — scrollable wrapper for data tables
// ═══════════════════════════════════════════════════════════

export const TableContainer = ({ children }) => (
    <div style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
    }}>
        {children}
    </div>
);

// ═══════════════════════════════════════════════════════════
// FORM SECTION — grouped form fields with title
// ═══════════════════════════════════════════════════════════

export const FormSection = ({ title, children, required }) => (
    <div style={{ marginBottom: '24px' }}>
        <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#202124',
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid #e8eaed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            {title}
            {required && <span style={{ color: '#d32f2f', fontSize: '12px' }}>*</span>}
        </h3>
        {children}
    </div>
);

// ═══════════════════════════════════════════════════════════
// FORM GRID — responsive grid for form fields
// ═══════════════════════════════════════════════════════════

export const FormGrid = ({ children, columns = 3, gap = '15px' }) => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gap
    }}>
        {children}
    </div>
);

// ═══════════════════════════════════════════════════════════
// MODAL — overlay dialog (replaces alert/confirm)
// ═══════════════════════════════════════════════════════════

export const Modal = ({ open, title, children, onClose, footer }) => {
    if (!open) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }}
            onClick={onClose}
        >
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <h2 style={{
                        margin: '0 0 16px 0',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#333'
                    }}>
                        {title}
                    </h2>
                )}
                <div style={{ marginBottom: '20px' }}>
                    {children}
                </div>
                {footer && (
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end'
                    }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// SPINNER — loading indicator
// ═══════════════════════════════════════════════════════════

export const Spinner = ({ size = '40px', color = '#1a73e8' }) => (
    <div style={{
        width: size,
        height: size,
        border: `4px solid #e0e0e0`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
    }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// ═══════════════════════════════════════════════════════════
// CONFIRM BUTTON — button that requires two clicks (safer delete)
// ═══════════════════════════════════════════════════════════

export const ConfirmButton = ({ children, onConfirm, danger, style }) => {
    const [armed, setArmed] = React.useState(false);

    return (
        <button
            onClick={() => {
                if (armed) {
                    onConfirm();
                    setArmed(false);
                } else {
                    setArmed(true);
                    // Auto-reset after 3 seconds
                    setTimeout(() => setArmed(false), 3000);
                }
            }}
            style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: armed
                    ? (danger ? '#d32f2f' : '#1a73e8')
                    : 'transparent',
                color: armed ? 'white' : (danger ? '#d32f2f' : '#1a73e8'),
                transition: 'all 0.2s',
                ...style
            }}
        >
            {armed ? '⚠️ Confirm?' : children}
        </button>
    );
};