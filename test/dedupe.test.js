const d = require('../src/utils/dedupe');

describe('Dedupe utilities', () => {
    test('byNin groups records with same NIN', () => {
        const rows = [
            { id: 1, first_name: 'John', last_name: 'Doe', nin: 'A123' },
            { id: 2, first_name: 'Jane', last_name: 'Doe', nin: 'A123' },
            { id: 3, first_name: 'Alice', last_name: 'X', nin: '' }
        ];
        const groups = d.byNin(rows);
        expect(groups.length).toBe(1);
        expect(groups[0].length).toBe(2);
    });

    test('byAdmission groups records with same admission_number', () => {
        const rows = [
            { id: 1, admission_number: 'ADM001' },
            { id: 2, admission_number: 'ADM001' },
            { id: 3, admission_number: 'ADM002' }
        ];
        const groups = d.byAdmission(rows);
        expect(groups.length).toBe(1);
        expect(groups[0].length).toBe(2);
    });

    test('potentialDuplicates finds fuzzy name + dob matches', () => {
        const rows = [
            { id: 1, first_name: 'Sam', last_name: 'Kato', date_of_birth: '2010-05-10' },
            { id: 2, first_name: 'Samuel', last_name: 'Kato', date_of_birth: '2010-05-10' },
            { id: 3, first_name: 'Different', last_name: 'Person', date_of_birth: '2009-01-01' }
        ];
        const res = d.potentialDuplicates(rows);
        // should see sam and samuel
        expect(res.find(r => r.id === 1)).toBeDefined();
        expect(res.find(r => r.id === 2)).toBeDefined();
    });
});
