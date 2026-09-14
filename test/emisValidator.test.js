const v = require('../src/utils/emisValidator');

describe('EMIS Validator', () => {
    test('findMissingField returns rows missing a field', () => {
        const rows = [{ id: 1, nin: '' }, { id: 2, nin: 'A123' }];
        const res = v.findMissingField(rows, 'nin');
        expect(res.length).toBe(1);
        expect(res[0].id).toBe(1);
    });

    test('findDuplicates detects duplicate admission numbers', () => {
        const rows = [{ id: 1, admission_number: 'A1' }, { id: 2, admission_number: 'A1' }, { id: 3, admission_number: 'B2' }];
        const res = v.findDuplicates(rows, 'admission_number');
        expect(res.length).toBe(2);
    });

    test('findImplausibleAges flags ages outside range', () => {
        const rows = [
            { id: 1, date_of_birth: '2024-01-01' },
            { id: 2, date_of_birth: '1990-01-01' },
            { id: 3, date_of_birth: '2018-01-01' }
        ];
        const res = v.findImplausibleAges(rows, { min: 3, max: 25 });
        expect(res.some(r => r.id === 1)).toBeTruthy();
        expect(res.some(r => r.id === 2)).toBeTruthy();
    });
});
