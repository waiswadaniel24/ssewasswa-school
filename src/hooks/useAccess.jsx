// FileName: src/hooks/useAccess.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import {
    canAccess,
    getFilteredMenu,
    getAcademicLevels,
    getExamTypes,
    getSchoolLevelLabel,
    SCHOOL_LEVELS
} from '../config/accessControl.js';

/**
 * Custom hook to manage user access roles and school level configurations.
 * Pulls schoolLevel directly from AuthContext to prevent race conditions 
 * and ensure single-source-of-truth.
 */
export function useAccess() {
    const { user, schoolLevel } = useContext(AuthContext);

    const role = user?.role || 'Viewer';
    const levelConfig = SCHOOL_LEVELS[schoolLevel] || SCHOOL_LEVELS['Primary'];

    return {
        role,
        schoolLevel,
        schoolLevelLabel: getSchoolLevelLabel(schoolLevel),
        academicLevels: getAcademicLevels(schoolLevel),
        examTypes: getExamTypes(schoolLevel),
        canAccess: (path) => canAccess(role, schoolLevel, path),
        getFilteredMenu: (search) => getFilteredMenu(role, schoolLevel, search),
        loading: !user, // Consider loading state if user is not yet populated
        isUNEBLevel: levelConfig.showUNEB,
        isNurseryLevel: levelConfig.showNursery,
        isSecondaryLevel: levelConfig.showSecondary,
        isTertiaryLevel: ['Tertiary', 'University'].includes(schoolLevel)
    };
}


