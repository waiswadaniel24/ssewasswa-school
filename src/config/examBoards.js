// FileName: src/config/examBoards.js
// Ssewasswa School ERP V10 — Ugandan Examination Boards
// Comprehensive list of ALL exam boards and examination bodies in Uganda

export const EXAM_BOARDS = {
  UNEB: {
    name: 'Uganda National Examinations Board',
    shortName: 'UNEB',
    website: 'https://uneb.ac.ug',
    description: 'National examinations for Primary (PLE), O-Level (UCE), and A-Level (UACE)',
    examTypes: {
      PLE: { name: 'Primary Leaving Examination', levels: ['Primary', 'Nursery_Primary', 'Primary_Secondary'] },
      UCE: { name: 'Uganda Certificate of Education (O-Level)', levels: ['Secondary', 'Primary_Secondary'] },
      UACE: { name: 'Uganda Advanced Certificate of Education (A-Level)', levels: ['Secondary', 'Primary_Secondary'] },
      UCEBT: { name: 'UCE Business/Technical', levels: ['Secondary', 'Primary_Secondary', 'Technical'] }
    },
    registrationRequired: true,
    apiIntegration: true,
    applicableSchoolLevels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary', 'Technical']
  },
  
  UBTEB: {
    name: 'Uganda Business and Technical Examinations Board',
    shortName: 'UBTEB',
    website: 'https://ubteb.go.ug',
    description: 'Examinations for Business, Technical, and Vocational Education and Training (BTVET)',
    examTypes: {
      CERT_BUSINESS: { name: 'Certificate in Business Studies', levels: ['Business', 'Tertiary', 'Technical'] },
      DIPLOMA_BUSINESS: { name: 'Diploma in Business Studies', levels: ['Business', 'Tertiary'] },
      CERT_TECHNICAL: { name: 'Certificate in Technical Studies', levels: ['Technical', 'Vocational'] },
      DIPLOMA_TECHNICAL: { name: 'Diploma in Technical Studies', levels: ['Technical', 'Tertiary'] },
      CERT_VOCATIONAL: { name: 'Certificate in Vocational Studies', levels: ['Vocational', 'Technical'] },
      HIGHER_DIPLOMA: { name: 'Higher Diploma', levels: ['Business', 'Technical', 'Tertiary'] }
    },
    registrationRequired: true,
    apiIntegration: false,
    applicableSchoolLevels: ['Business', 'Technical', 'Vocational', 'Tertiary']
  },
  
  NCHE: {
    name: 'National Council for Higher Education',
    shortName: 'NCHE',
    website: 'https://unche.or.ug',
    description: 'Accreditation and quality assurance for universities and tertiary institutions',
    examTypes: {
      ACCREDITATION: { name: 'Institutional Accreditation', levels: ['University', 'Tertiary'] },
      PROGRAM_REVIEW: { name: 'Program Review & Approval', levels: ['University', 'Tertiary'] },
      QUALITY_AUDIT: { name: 'Quality Audit', levels: ['University', 'Tertiary'] }
    },
    registrationRequired: false,
    apiIntegration: false,
    applicableSchoolLevels: ['University', 'Tertiary', 'Business', 'Arts', 'Sciences', 'Theological']
  },
  
  NURSES_COUNCIL: {
    name: 'Nurses Council of Uganda',
    shortName: 'NCU',
    website: 'https://nunc.go.ug',
    description: 'Examinations and registration for nursing and midwifery professionals',
    examTypes: {
      CERT_NURSING: { name: 'Certificate in Nursing', levels: ['Health'] },
      DIPLOMA_NURSING: { name: 'Diploma in Nursing', levels: ['Health'] },
      DIPLOMA_MIDWIFERY: { name: 'Diploma in Midwifery', levels: ['Health'] },
      ADV_DIPLOMA: { name: 'Advanced Diploma (Specialized)', levels: ['Health'] }
    },
    registrationRequired: true,
    apiIntegration: false,
    applicableSchoolLevels: ['Health']
  },
  
  AHPC: {
    name: 'Allied Health Professionals Council',
    shortName: 'AHPC',
    website: 'https://ahpc.go.ug',
    description: 'Examinations for allied health professionals (lab tech, pharmacy, radiography, etc.)',
    examTypes: {
      CERT_LAB: { name: 'Certificate in Medical Laboratory Technology', levels: ['Health'] },
      DIPLOMA_LAB: { name: 'Diploma in Medical Laboratory Technology', levels: ['Health'] },
      CERT_PHARMACY: { name: 'Certificate in Pharmacy', levels: ['Health'] },
      DIPLOMA_PHARMACY: { name: 'Diploma in Pharmacy', levels: ['Health'] },
      CERT_RADIO: { name: 'Certificate in Radiography', levels: ['Health'] }
    },
    registrationRequired: true,
    apiIntegration: false,
    applicableSchoolLevels: ['Health']
  },
  
  KYAMBOGO: {
    name: 'Kyambogo University (Teacher Education)',
    shortName: 'KYU',
    website: 'https://kyu.ac.ug',
    description: 'Teacher certification examinations for PTC, NTC, and Graduate Diploma in Education',
    examTypes: {
      PTC: { name: 'Primary Teacher Certificate', levels: ['TeacherTraining'] },
      NTC: { name: 'National Teacher Certificate', levels: ['TeacherTraining'] },
      GDE: { name: 'Graduate Diploma in Education', levels: ['TeacherTraining'] },
      ECD_CERT: { name: 'ECD Teacher Certificate', levels: ['TeacherTraining'] }
    },
    registrationRequired: true,
    apiIntegration: false,
    applicableSchoolLevels: ['TeacherTraining']
  }
};

// Helper: get exam boards applicable to a school level
export function getExamBoardsForLevel(schoolLevel) {
  return Object.entries(EXAM_BOARDS)
    .filter(([key, board]) => board.applicableSchoolLevels.includes(schoolLevel))
    .map(([key, board]) => ({ key, ...board }));
}

// Helper: get all exam types for a school level
export function getExamTypesForLevel(schoolLevel) {
  const boards = getExamBoardsForLevel(schoolLevel);
  const types = [];
  boards.forEach(board => {
    Object.entries(board.examTypes).forEach(([key, exam]) => {
      if (exam.levels.includes(schoolLevel)) {
        types.push({ boardKey: board.key, boardName: board.shortName, examKey: key, examName: exam.name });
      }
    });
  });
  return types;
}

// Helper: check if a school level has any exam boards
export function hasExamBoards(schoolLevel) {
  return getExamBoardsForLevel(schoolLevel).length > 0;
}

export default EXAM_BOARDS;
