import React, { createContext, useState, useContext, useEffect } from 'react';

var translations = {
    en: {
        'dashboard': 'Dashboard', 'total_students': 'Total Students', 'total_staff': 'Total Staff',
        'fees_collected': 'Fees Collected', 'outstanding_debts': 'Outstanding Debts',
        'students': 'Students', 'staff': 'Staff', 'finance': 'Finance', 'settings': 'Settings',
        'save': 'Save', 'cancel': 'Cancel', 'delete': 'Delete', 'edit': 'Edit',
        'search': 'Search', 'loading': 'Loading...', 'logout': 'Logout', 'welcome': 'Welcome',
        'male': 'Male', 'female': 'Female', 'class': 'Class', 'subject': 'Subject',
        'add': 'Add', 'print': 'Print', 'yes': 'Yes', 'no': 'No',
        'active': 'Active', 'inactive': 'Inactive'
    },
    lg: {
        'dashboard': 'Dasibodi', 'total_students': 'Abayizi Abamu', 'total_staff': 'Abakozi Abamu',
        'fees_collected': 'Sente Eziweebwa', 'outstanding_debts': 'Sente Enta',
        'students': 'Abayizi', 'staff': 'Abakozi', 'finance': 'Sente', 'settings': 'Enteekateeka',
        'save': 'Bika', 'cancel': 'Sazaamu', 'delete': 'Gyawo', 'edit': 'Kyusa',
        'search': 'Noonya', 'loading': 'Tikyaakutikka...', 'logout': 'Ofula', 'welcome': 'Kaakusiibire',
        'male': 'Mulenzi', 'female': 'Muwala', 'class': 'Kilasi', 'subject': 'Somero',
        'add': 'Gatta', 'print': 'Printa', 'yes': 'Yee', 'no': 'Nedda',
        'active': 'Kakola', 'inactive': 'Tikakola'
    }
};

var LanguageContext = createContext({
    lang: 'en', setLang: function() { /* no-op */ }, t: function(key) { return key; }
});

export function LanguageProvider(props) {
    var children = props.children;
    var [lang, setLang] = useState(function() {
        try { return localStorage.getItem('erp_lang') || 'en'; }
        catch (e) { return 'en'; }
    });

    useEffect(function() {
        try { localStorage.setItem('erp_lang', lang); } catch (e) { /* localStorage unavailable */ }
    }, [lang]);

    var setLanguage = function(newLang) { setLang(newLang); };
    var t = function(key) {
        var dict = translations[lang] || translations.en;
        return dict[key] || translations.en[key] || key;
    };

    return React.createElement(LanguageContext.Provider,
        { value: { lang: lang, setLang: setLanguage, t: t } }, children);
}

export function useLanguage() { return useContext(LanguageContext); }
export { LanguageContext };

