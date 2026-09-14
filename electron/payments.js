// FileName: electron/payments.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

const https = require('https');
const crypto = require('crypto');

class UgandaPayments {
    /**
     * @param {Object} db - sql.js database instance
     * @param {Function} saveDb - Function to persist database to disk
     */
    constructor(db, saveDb) {
        this.db = db;
        this.saveDb = saveDb;
    }

    // ═════════════════════════════════════════════════════════
    // SAFE DB CONFIG HELPER (uses prepare + bind, NOT exec with params)
    // ═════════════════════════════════════════════════════════

    /**
     * Get a system setting value by key using parameterized query.
     * @param {string} key - The setting key (e.g., 'mtn_api_key')
     * @returns {string} The setting value, or empty string if not found
     */
    _getConfig(key) {
        try {
            const stmt = this.db.prepare("SELECT value FROM system_settings WHERE key = ?");
            stmt.bind([key]);
            let value = '';
            if (stmt.step()) {
                const row = stmt.getAsObject();
                value = row.value || '';
            }
            stmt.free();
            return value;
        } catch (e) {
            return '';
        }
    }

    // ═════════════════════════════════════════════════════════
    // MTN MOBILE MONEY
    // ═════════════════════════════════════════════════════════

    /**
     * Initiate an MTN MoMo collection request.
     * @param {Object} params - { phone, amount, narration, reference }
     * @returns {Promise<{success: boolean, data?: Object, transactionRef?: string, error?: string}>}
     */
    async initiateMTN({ phone, amount, narration, reference }) {
        try {
            const apiKey = this._getConfig('mtn_api_key');
            const userId = this._getConfig('mtn_user_id');
            const callbackUrl = this._getConfig('mtn_callback_url') || 'https://ssewasswa-erp.com/callback/mtn';

            if (!apiKey || !userId) {
                return { success: false, error: 'MTN MoMo not configured. Go to Settings > Payment APIs to set up.' };
            }

            // Format phone: remove spaces, +256, leading 0; prepend 256
            let formattedPhone = phone.replace(/\s+/g, '').replace(/^(\+)?256/, '');
            if (!formattedPhone.startsWith('256')) {
                formattedPhone = '256' + formattedPhone.replace(/^0/, '');
            }

            const requestBody = JSON.stringify({
                amount: String(Math.round(amount)),
                currency: 'UGX',
                externalId: reference || 'TXN-' + Date.now(),
                payer: {
                    partyIdType: 'MSISDN',
                    partyId: formattedPhone
                },
                payerMessage: narration || 'School Fee Payment',
                payeeNote: reference || 'School Payment'
            });

            const transactionRef = crypto.randomBytes(16).toString('hex');
            const token = await this._getMTNAuthToken(apiKey, userId);

            const options = {
                hostname: 'sandbox.momodeveloper.mtn.com',
                path: '/collection/v1_0/requesttopay',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Reference-Id': transactionRef,
                    'X-Target-Environment': 'sandbox',
                    'Ocp-Apim-Subscription-Key': apiKey,
                    'Authorization': 'Bearer ' + token,
                    'X-Callback-Url': callbackUrl // Used here to prevent unused variable error
                }
            };

            return new Promise((resolve) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        // MTN returns 202 Accepted for pending payments
                        if (res.statusCode === 202) {
                            this._recordTransaction({
                                reference: reference || transactionRef,
                                student_id: null,
                                method: 'MTN',
                                phone: formattedPhone,
                                amount: Math.round(amount),
                                status: 'Pending',
                                narration: narration || 'School Fee Payment'
                            });
                            resolve({ success: true, data: { status: 'Pending' }, transactionRef: transactionRef });
                        } else {
                            let errorMsg = 'MTN transaction failed';
                            try {
                                const result = JSON.parse(data);
                                errorMsg = result.message || errorMsg;
                            } catch (e) {
                                /* not JSON */
                            }
                            resolve({ success: false, error: errorMsg });
                        }
                    });
                });
                req.on('error', (e) => resolve({ success: false, error: 'Network error: ' + e.message }));
                req.write(requestBody);
                req.end();
            });

        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get MTN OAuth access token.
     * Calls the MTN token endpoint with Basic auth.
     * @param {string} apiKey - API key
     * @param {string} userId - User ID
     * @returns {Promise<string>} Bearer token
     */
    async _getMTNAuthToken(apiKey, userId) {
        return new Promise((resolve, reject) => {
            const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');
            const options = {
                hostname: 'sandbox.momodeveloper.mtn.com',
                path: '/collection/token/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': apiKey,
                    'Authorization': `Basic ${auth}`
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.access_token) {
                            resolve(result.access_token);
                        } else {
                            reject(new Error('Failed to retrieve MTN access token'));
                        }
                    } catch (e) {
                        reject(new Error('Failed to parse MTN token response'));
                    }
                });
            });

            req.on('error', (e) => reject(new Error('Network error fetching token: ' + e.message)));
            req.end();
        });
    }

    // ═════════════════════════════════════════════════════════
    // AIRTEL MONEY
    // ═════════════════════════════════════════════════════════

    /**
     * Initiate an Airtel Money collection request.
     * @param {Object} params - { phone, amount, narration, reference }
     * @returns {Promise<{success: boolean, data?: Object, transactionRef?: string, error?: string}>}
     */
    async initiateAirtel({ phone, amount, narration, reference }) {
        try {
            const clientId = this._getConfig('airtel_client_id');
            const clientSecret = this._getConfig('airtel_client_secret');
            const pin = this._getConfig('airtel_pin');

            if (!clientId || !clientSecret || !pin) {
                return { success: false, error: 'Airtel Money not configured. Go to Settings > Payment APIs to set up.' };
            }

            // Format phone
            let formattedPhone = phone.replace(/\s+/g, '').replace(/^(\+)?256/, '');
            if (!formattedPhone.startsWith('256')) {
                formattedPhone = '256' + formattedPhone.replace(/^0/, '');
            }

            const transactionId = 'TXN-' + crypto.randomBytes(8).toString('hex');

            const requestBody = JSON.stringify({
                reference: reference || ('TXN-' + Date.now()),
                subscriber: {
                    country: 'UG',
                    msisdn: formattedPhone
                },
                transaction: {
                    amount: Math.round(amount),
                    country: 'UG',
                    currency: 'UGX',
                    id: transactionId
                },
                pin: pin,
                narration: narration || 'School Fee Payment'
            });

            const authString = Buffer.from(clientId + ':' + clientSecret).toString('base64');

            const options = {
                hostname: 'openapiuat.airtel.africa',
                path: '/merchant/v1/payments/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + authString,
                    'X-Country': 'UG',
                    'X-Currency': 'UGX'
                }
            };

            return new Promise((resolve) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const result = JSON.parse(data);
                            if (result.status && result.status.code === '200') {
                                this._recordTransaction({
                                    reference: reference || transactionId,
                                    student_id: null,
                                    method: 'Airtel',
                                    phone: formattedPhone,
                                    amount: Math.round(amount),
                                    status: 'Pending',
                                    narration: narration || 'School Fee Payment'
                                });
                                resolve({ success: true, data: result.data, transactionRef: result.data.txn_id || transactionId });
                            } else {
                                resolve({ success: false, error: (result.status && result.status.message) || 'Airtel transaction failed' });
                            }
                        } catch (e) {
                            resolve({ success: false, error: 'Failed to parse Airtel response' });
                        }
                    });
                });
                req.on('error', (e) => resolve({ success: false, error: 'Network error: ' + e.message }));
                req.write(requestBody);
                req.end();
            });

        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // ═════════════════════════════════════════════════════════
    // BANK PAYMENT (Manual reference — deposit at bank, confirm manually)
    // ═════════════════════════════════════════════════════════

    /**
     * Create a bank payment reference for manual deposit.
     * @param {Object} params - { bankName, accountNumber, accountName, amount, studentName, reference, narration }
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async createBankPayment({ bankName, accountNumber, accountName, amount, studentName, reference, narration }) {
        try {
            const bankRef = reference || ('BNK-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase());

            const stmt = this.db.prepare(
                "INSERT INTO bank_payments (reference, bank_name, account_number, account_name, amount, student_name, narration, status, created_at) VALUES (?,?,?,?,?,?,?,?,'Pending',datetime('now'))"
            );
            stmt.bind([bankRef, bankName, accountNumber, accountName, amount, studentName, narration || 'School Fee Payment']);
            stmt.step();
            stmt.free();

            this.saveDb();

            return {
                success: true,
                data: {
                    reference: bankRef,
                    bankName: bankName,
                    accountNumber: accountNumber,
                    accountName: accountName,
                    amount: amount,
                    message: 'Please deposit UGX ' + amount.toLocaleString() + ' to ' + bankName +
                        ' Account ' + accountNumber + ' (' + accountName + ')' +
                        ' and use reference: ' + bankRef
                }
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Confirm a bank payment (mark as received).
     * @param {string} reference - The bank payment reference
     * @returns {{success: boolean, error?: string}}
     */
    confirmBankPayment(reference) {
        try {
            const stmt = this.db.prepare("UPDATE bank_payments SET status = 'Confirmed', confirmed_at = datetime('now') WHERE reference = ?");
            stmt.bind([reference]);
            stmt.step();
            stmt.free();

            this.saveDb();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // ═════════════════════════════════════════════════════════
    // PAYMENT STATUS CHECK (uses prepare + bind, NOT exec with params)
    // ═════════════════════════════════════════════════════════

    /**
     * Check payment status by reference number.
     * Searches payment_transactions and bank_payments tables.
     * @param {string} reference - The payment reference
     * @returns {{success: boolean, data?: Object, error?: string}}
     */
    checkPaymentStatus(reference) {
        try {
            // Check payment_transactions (MTN, Airtel)
            let stmt = this.db.prepare("SELECT * FROM payment_transactions WHERE reference = ?");
            stmt.bind([reference]);
            if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();
                return { success: true, data: row };
            }
            stmt.free();

            // Check bank_payments
            stmt = this.db.prepare("SELECT * FROM bank_payments WHERE reference = ?");
            stmt.bind([reference]);
            if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();
                return { success: true, data: row };
            }
            stmt.free();

            return { success: false, error: 'Payment not found' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // ═════════════════════════════════════════════════════════
    // PAYMENT METHODS CONFIG
    // ═════════════════════════════════════════════════════════

    /**
     * Get list of configured payment methods.
     * @returns {{success: boolean, data: Array}}
     */
    getPaymentMethods() {
        try {
            const methods = [
                { key: 'cash', name: 'Cash', icon: '💵', enabled: true },
                { key: 'mtn', name: 'MTN Mobile Money', icon: '📱', enabled: false },
                { key: 'airtel', name: 'Airtel Money', icon: '📱', enabled: false },
                { key: 'bank', name: 'Bank Transfer', icon: '🏦', enabled: false },
                { key: 'cheque', name: 'Cheque', icon: '📝', enabled: true }
            ];

            // Check which are configured via _getConfig (safe parameterized query)
            if (this._getConfig('mtn_api_key')) {
                const mtnMethod = methods.find(m => m.key === 'mtn');
                if (mtnMethod) mtnMethod.enabled = true;
            }

            if (this._getConfig('airtel_client_id')) {
                const airtelMethod = methods.find(m => m.key === 'airtel');
                if (airtelMethod) airtelMethod.enabled = true;
            }

            if (this._getConfig('bank_account_number')) {
                const bankMethod = methods.find(m => m.key === 'bank');
                if (bankMethod) bankMethod.enabled = true;
            }

            return { success: true, data: methods };
        } catch (e) {
            return { success: true, data: [] };
        }
    }

    // ═════════════════════════════════════════════════════════
    // INTERNAL: Record a transaction in payment_transactions table
    // ═════════════════════════════════════════════════════════

    /**
     * Insert a payment transaction record.
     * @param {Object} params - { reference, student_id, method, phone, amount, status, narration }
     * @private
     */
    _recordTransaction({ reference, student_id, method, phone, amount, status, narration }) {
        try {
            const stmt = this.db.prepare(
                "INSERT INTO payment_transactions (reference, student_id, method, phone, amount, status, narration, created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))"
            );
            stmt.bind([reference, student_id, method, phone, amount, status, narration]);
            stmt.step();
            stmt.free();

            this.saveDb();
        } catch (e) {
            console.error('Failed to record transaction:', e.message);
        }
    }
}

module.exports = UgandaPayments;