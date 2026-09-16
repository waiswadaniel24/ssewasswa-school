import { jsPDF } from 'jspdf';
// FileName: src/utils/DocumentEngine.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

export class SchoolDocument {
    constructor(schoolProfile = {}, config = {}) {
        this.school = {
            name: schoolProfile.school_name || 'SSEWASSWA SCHOOL',
            motto: schoolProfile.motto || '',
            slogan: schoolProfile.slogan || '',
            scripture: schoolProfile.scripture || '',
            address: schoolProfile.postal_address || '',
            phone: schoolProfile.phone || '',
            email: schoolProfile.email || '',
            website: schoolProfile.website || '',
            logo: schoolProfile.logo || null,
            badge: schoolProfile.badge || null,
            ...schoolProfile
        };
        this.cfg = {
            pageSize: 'a4',
            orientation: 'portrait',
            margin: { top: 12, right: 15, bottom: 12, left: 15 },
            headerH: 0,
            footerH: 18,
            primary: [26, 115, 232],
            accent: [13, 71, 161],
            light: [232, 240, 254],
            font: 'helvetica',
            ...config
        };
        this.doc = null;
        this.page = 0;
        this.y = 0;
    }

    // ─── Page dimensions (mm) ──────────────────────────────────
    get pw() { return this.cfg.orientation === 'portrait' ? 210 : 297; }
    get ph() { return this.cfg.orientation === 'portrait' ? 297 : 210; }
    get cw() { return this.pw - this.cfg.margin.left - this.cfg.margin.right; }
    get ct() { return this.cfg.margin.top + this.cfg.headerH; }
    get cb() { return this.ph - this.cfg.margin.bottom - this.cfg.footerH; }

    // ─── Create new jsPDF document ──────────────────────────────
    create() {
        const { jsPDF } = window.jspdf || {}; // Fallback handled by import
        this.doc = new jsPDF({
            orientation: this.cfg.orientation,
            unit: 'mm',
            format: this.cfg.pageSize
        });
        this.page = 0;
        this.y = 0;
        return this;
    }

    // ═══════════════════════════════════════════════════════════
    // HEADER — logo, badge, school name, motto, slogan, scripture
    // ═══════════════════════════════════════════════════════════

    drawHeader(o = {}) {
        const d = this.doc, m = this.cfg.margin, w = this.cw, x = m.left;
        let y = m.top;

        const s = {
            logo: o.logo !== false,
            badge: o.badge !== false && !!this.school.badge,
            name: o.name !== false,
            motto: o.motto !== false && !!this.school.motto,
            slogan: o.slogan !== false && !!this.school.slogan,
            scripture: o.scripture !== false && !!this.school.scripture,
            contact: o.contact !== false,
            line: o.line !== false,
            bg: o.bg || false,
            ...o
        };
        const cx = x + w / 2;

        // Background tint
        if (s.bg) {
            d.setFillColor(...this.cfg.light);
            d.rect(x - 2, y - 2, w + 4, 42, 'F');
        }

        // Logo
        let imgOff = 0;
        if (s.logo && this.school.logo) {
            try {
                d.addImage(this.school.logo, 'PNG', x, y + 2, 16, 16);
                imgOff = 20;
            } catch (e) {
                console.warn('DocumentEngine: logo add failed:', e.message);
            }
        }

        // Badge
        if (s.badge && this.school.badge) {
            try {
                d.addImage(this.school.badge, 'PNG', x + imgOff, y + 2, 16, 16);
            } catch (e) {
                console.warn('DocumentEngine: badge add failed:', e.message);
            }
        }

        // School name
        if (s.name) {
            d.setFont(this.cfg.font, 'bold');
            d.setFontSize(15);
            d.setTextColor(...this.cfg.accent);
            d.text(this.school.name.toUpperCase(), cx, y + 8, { align: 'center', maxWidth: w - 50 });
        }

        // Motto
        let ly = 14;
        if (s.motto) {
            d.setFont(this.cfg.font, 'italic');
            d.setFontSize(8.5);
            d.setTextColor(100, 100, 100);
            d.text('"' + this.school.motto + '"', cx, y + ly, { align: 'center' });
            ly += 5;
        }

        // Slogan
        if (s.slogan) {
            d.setFont(this.cfg.font, 'normal');
            d.setFontSize(7.5);
            d.setTextColor(80, 80, 80);
            d.text(this.school.slogan, cx, y + ly, { align: 'center' });
            ly += 5;
        }

        // Scripture
        if (s.scripture) {
            d.setFont(this.cfg.font, 'italic');
            d.setFontSize(7);
            d.setTextColor(120, 80, 40);
            d.text(this.school.scripture, cx, y + ly, { align: 'center', maxWidth: w - 20 });
            ly += 5;
        }

        // Contact info
        if (s.contact) {
            const p = [this.school.address, this.school.phone, this.school.email].filter(Boolean);
            if (p.length) {
                d.setFont(this.cfg.font, 'normal');
                d.setFontSize(6.5);
                d.setTextColor(100, 100, 100);
                d.text(p.join('  |  '), cx, y + ly, { align: 'center' });
                ly += 4;
            }
        }

        // Double line separator
        if (s.line) {
            d.setDrawColor(...this.cfg.primary);
            d.setLineWidth(0.5);
            d.line(x, y + ly, x + w, y + ly);
            d.setLineWidth(0.15);
            d.line(x, y + ly + 1.2, x + w, y + ly + 1.2);
            ly += 3;
        }

        this.cfg.headerH = ly;
        this.y = this.ct + 4;
        return this;
    }

    // ═══════════════════════════════════════════════════════════
    // FOOTER — address, phone, email, page number, date
    // ═══════════════════════════════════════════════════════════

    drawFooter(o = {}) {
        const d = this.doc, m = this.cfg.margin, w = this.cw, x = m.left;
        const y = this.ph - m.bottom;
        const cx = x + w / 2;

        // Double line separator
        if (o.line !== false) {
            d.setDrawColor(...this.cfg.primary);
            d.setLineWidth(0.15);
            d.line(x, y - 3, x + w, y - 3);
            d.setLineWidth(0.5);
            d.line(x, y - 4.2, x + w, y - 4.2);
        }

        // Contact text
        if (o.text !== false) {
            const p = [this.school.address, this.school.phone, this.school.email, this.school.website].filter(Boolean);
            if (p.length) {
                d.setFont(this.cfg.font, 'normal');
                d.setFontSize(6);
                d.setTextColor(140, 140, 140);
                d.text(p.join('  |  '), cx, y + 2, { align: 'center' });
            }
        }

        // Page number (right)
        if (o.page !== false) {
            d.setFont(this.cfg.font, 'normal');
            d.setFontSize(6.5);
            d.setTextColor(140, 140, 140);
            d.text('Page ' + this.page, x + w, y + 2, { align: 'right' });
        }

        // Date (left)
        if (o.date !== false) {
            d.setFont(this.cfg.font, 'normal');
            d.setFontSize(6.5);
            d.setTextColor(140, 140, 140);
            d.text(new Date().toLocaleDateString(), x, y + 2, { align: 'left' });
        }

        return this;
    }

    // ═══════════════════════════════════════════════════════════
    // BOUNDARY — decorative border styles
    // ═══════════════════════════════════════════════════════════

    drawBoundary(style = 'simple') {
        const d = this.doc, m = this.cfg.margin;
        const x = m.left - 3, y = m.top - 3;
        const w = this.cw + 6;
        const h = this.ph - m.top - m.bottom + 6 - this.cfg.footerH;

        switch (style) {
            case 'none':
                break;

            case 'simple':
                d.setDrawColor(...this.cfg.primary);
                d.setLineWidth(0.5);
                d.rect(x, y, w, h, 'S');
                break;

            case 'double':
                d.setDrawColor(...this.cfg.primary);
                d.setLineWidth(0.8);
                d.rect(x, y, w, h, 'S');
                d.setLineWidth(0.2);
                d.rect(x + 2, y + 2, w - 4, h - 4, 'S');
                break;

            case 'nursery':
                d.setDrawColor(255, 152, 0);
                d.setLineWidth(1.5);
                d.rect(x, y, w, h, 'S');
                d.setDrawColor(76, 175, 80);
                d.setLineWidth(0.8);
                d.rect(x + 3, y + 3, w - 6, h - 6, 'S');
                // Corner circles
                [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]].forEach(([ccx, ccy]) => {
                    d.setFillColor(255, 193, 7);
                    d.circle(ccx, ccy, 2.5, 'F');
                    d.setFillColor(244, 67, 54);
                    d.circle(ccx, ccy, 1, 'F');
                });
                break;

            case 'primary':
                d.setDrawColor(...this.cfg.primary);
                d.setLineWidth(0.3);
                d.rect(x, y, w, h, 'S');
                d.setFillColor(...this.cfg.primary);
                d.rect(x, y, w, 3.5, 'F');
                d.rect(x, y + h - 3.5, w, 3.5, 'F');
                break;

            case 'secondary':
                d.setDrawColor(...this.cfg.accent);
                d.setLineWidth(0.8);
                d.rect(x, y, w, h, 'S');
                d.setLineWidth(0.2);
                d.rect(x + 2.5, y + 2.5, w - 5, h - 5, 'S');
                // Corner accents
                [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([ccx, ccy, dx, dy]) => {
                    d.setDrawColor(...this.cfg.primary);
                    d.setLineWidth(0.6);
                    d.line(ccx, ccy, ccx + 12 * dx, ccy);
                    d.line(ccx, ccy, ccx, ccy + 12 * dy);
                    d.line(ccx + 9 * dx, ccy, ccx + 12 * dx, ccy + 3 * dy);
                    d.line(ccx, ccy + 9 * dy, ccx + 3 * dx, ccy + 12 * dy);
                });
                break;

            case 'certificate':
                d.setDrawColor(...this.cfg.accent);
                d.setLineWidth(1.2);
                d.rect(x, y, w, h, 'S');
                d.setLineWidth(0.4);
                d.rect(x + 4, y + 4, w - 8, h - 8, 'S');
                d.setLineWidth(0.15);
                d.rect(x + 6, y + 6, w - 12, h - 12, 'S');
                // Corner flourishes
                [[x + 2, y + 2, 1, 1], [x + w - 2, y + 2, -1, 1], [x + 2, y + h - 2, 1, -1], [x + w - 2, y + h - 2, -1, -1]].forEach(([ccx, ccy, dx, dy]) => {
                    d.setDrawColor(...this.cfg.primary);
                    d.setLineWidth(0.5);
                    for (let i = 0; i < 3; i++) {
                        const off = i * 3;
                        d.line(ccx, ccy, ccx + (18 - off) * dx, ccy);
                        d.line(ccx, ccy, ccx, ccy + (18 - off) * dy);
                    }
                });
                break;

            case 'letter':
                d.setFillColor(...this.cfg.primary);
                d.rect(x, y, 4, h, 'F');
                break;

            default:
                d.setDrawColor(...this.cfg.primary);
                d.setLineWidth(0.5);
                d.rect(x, y, w, h, 'S');
        }

        return this;
    }

    // ═══════════════════════════════════════════════════════════
    // SIGNATURES
    // ═══════════════════════════════════════════════════════════

    drawSig(label, img, name, title, x, y, o = {}) {
        const d = this.doc;
        const w = o.width || 50;

        // Label
        d.setFont(this.cfg.font, 'normal');
        d.setFontSize(6.5);
        d.setTextColor(100, 100, 100);
        d.text(label, x + w / 2, y, { align: 'center' });

        // Signature image or line
        if (img) {
            try {
                d.addImage(img, 'PNG', x + 5, y + 2, w - 10, 14);
            } catch (e) {
                // Fallback: draw line
                d.setDrawColor(0, 0, 0);
                d.setLineWidth(0.3);
                d.line(x + 2, y + 10, x + w - 2, y + 10);
            }
        } else {
            d.setDrawColor(0, 0, 0);
            d.setLineWidth(0.3);
            d.line(x + 2, y + 10, x + w - 2, y + 10);
        }

        // Name
        if (name) {
            d.setFont(this.cfg.font, 'bold');
            d.setFontSize(7.5);
            d.setTextColor(0, 0, 0);
            d.text(name, x + w / 2, y + 16, { align: 'center' });
        }

        // Title
        if (title) {
            d.setFont(this.cfg.font, 'normal');
            d.setFontSize(6.5);
            d.setTextColor(100, 100, 100);
            d.text(title, x + w / 2, y + 21, { align: 'center' });
        }

        // Date placeholder
        if (o.date !== false) {
            d.setFont(this.cfg.font, 'italic');
            d.setFontSize(6);
            d.setTextColor(140, 140, 140);
            d.text('Date: ___________', x + w / 2, y + 25.5, { align: 'center' });
        }

        return this;
    }

    drawSigRow(sigs, y, o = {}) {
        const w = this.cw;
        const n = sigs.length;
        const sw = Math.min(o.width || 55, (w - 10) / n);
        const gap = (w - sw * n) / (n + 1);

        sigs.forEach((s, i) => {
            this.drawSig(
                s.label, s.image, s.name, s.title,
                this.cfg.margin.left + gap + i * (sw + gap),
                y,
                { width: sw, date: s.date !== false }
            );
        });

        return this;
    }

    // ═══════════════════════════════════════════════════════════
    // PAGE MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    newPage() {
        if (this.page > 0) this.drawFooter();
        this.doc.addPage();
        this.page++;
        this.y = this.cfg.margin.top;
        return this;
    }

    checkBreak(need = 20) {
        if (this.y + need > this.cb) {
            this.newPage();
            return true;
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════
    // TEXT UTILITIES
    // ═══════════════════════════════════════════════════════════

    txt(str, x, y, o = {}) {
        const d = this.doc;

        d.setFont(o.font || this.cfg.font, o.style || 'normal');
        d.setFontSize(o.size || 10);
        d.setTextColor(...(o.color || [0, 0, 0]));

        const textOpts = {
            align: o.align || 'left',
            maxWidth: o.maxWidth || this.cw
        };

        d.text(String(str != null ? str : ''), x != null ? x : this.cfg.margin.left, y != null ? y : this.y, textOpts);

        if (o.moveY !== false) {
            this.y += (o.size || 10) * 0.38 + (o.spacing || 1.5);
        }

        return this;
    }

    gap(n = 1, s = 5) {
        this.y += n * s;
        return this;
    }

    hr(o = {}) {
        const d = this.doc;
        d.setDrawColor(...(o.color || [200, 200, 200]));
        d.setLineWidth(o.width || 0.3);
        d.line(this.cfg.margin.left, this.y, this.cfg.margin.left + this.cw, this.y);
        this.y += (o.spacing || 2);
        return this;
    }

    // ═══════════════════════════════════════════════════════════
    // TABLE
    // ═══════════════════════════════════════════════════════════

    tbl(headers, rows, o = {}) {
        const d = this.doc;
        const x = o.x || this.cfg.margin.left;
        const w = o.width || this.cw;
        const cw = w / headers.length;
        const rh = o.rowH || 7;
        const hh = o.headerH || 8;

        // Check if we need a page break
        if (this.y + hh + rows.length * rh > this.cb) {
            this.newPage();
        }

        // Header row
        d.setFillColor(...(o.headerColor || this.cfg.primary));
        d.rect(x, this.y, w, hh, 'F');
        d.setFont(this.cfg.font, 'bold');
        d.setFontSize(o.fontSize || 7.5);
        d.setTextColor(255, 255, 255);
        headers.forEach((h, i) => {
            d.text(String(h), x + i * cw + cw / 2, this.y + hh / 2 + 1, { align: 'center' });
        });
        this.y += hh;

        // Data rows
        d.setFont(this.cfg.font, 'normal');
        d.setTextColor(0, 0, 0);

        rows.forEach((row, ri) => {
            // Page break check
            if (this.y + rh > this.cb) {
                this.newPage();
                // Redraw header on new page
                d.setFillColor(...(o.headerColor || this.cfg.primary));
                d.rect(x, this.y, w, hh, 'F');
                d.setFont(this.cfg.font, 'bold');
                d.setFontSize(o.fontSize || 7.5);
                d.setTextColor(255, 255, 255);
                headers.forEach((h, i) => {
                    d.text(String(h), x + i * cw + cw / 2, this.y + hh / 2 + 1, { align: 'center' });
                });
                d.setFont(this.cfg.font, 'normal');
                d.setTextColor(0, 0, 0);
                this.y += hh;
            }

            // Striped rows
            if (ri % 2 === 1 && o.striped !== false) {
                d.setFillColor(248, 248, 248);
                d.rect(x, this.y, w, rh, 'F');
            }

            // Row separator line
            d.setDrawColor(225, 225, 225);
            d.setLineWidth(0.08);
            d.line(x, this.y + rh, x + w, this.y + rh);

            // Cell values
            headers.forEach((_, i) => {
                const v = row[i] != null ? String(row[i]) : '';
                d.text(v, x + i * cw + 1.5, this.y + rh / 2 + 1, {
                    align: (o.aligns && o.aligns[i]) || 'left',
                    maxWidth: cw - 3
                });
            });

            this.y += rh;
        });

        // Outer border
        d.setDrawColor(180, 180, 180);
        d.setLineWidth(0.3);
        d.rect(x, this.y - rows.length * rh - hh, w, hh + rows.length * rh, 'S');

        return this;
    }

    // ═══════════════════════════════════════════════════════════
    // REPORT CARD
    // ═══════════════════════════════════════════════════════════

    reportCard({ student, cls, term, year, grades, comments, teacherSig, headSig, boundary }) {
        // Determine boundary style based on student level
        const b = boundary || (
            student.level === 'Nursery' ? 'nursery' :
                (student.level === 'Secondary' || student.level === 'O_Level' || student.level === 'A_Level') ? 'secondary' :
                    'primary'
        );

        this.create().drawBoundary(b).drawHeader({ scripture: true }).gap(0.5);

        // Title
        this.txt('END OF TERM REPORT CARD', this.cfg.margin.left + this.cw / 2, null, {
            align: 'center', size: 13, style: 'bold', moveY: false
        });
        this.txt(term + ' - ' + year, this.cfg.margin.left + this.cw / 2, null, {
            align: 'center', size: 9, style: 'italic', color: [100, 100, 100], moveY: false
        });
        this.gap(1.5);

        // Student info
        const info = [
            ['Name', student.first_name + ' ' + student.last_name + ' ' + (student.other_name || '')],
            ['Adm No', student.admission_number],
            ['Class', cls],
            ['Gender', student.gender === 'M' ? 'Male' : 'Female'],
            ['Type', student.student_type || 'Day']
        ];

        info.forEach(([l, v]) => {
            this.doc.setFont(this.cfg.font, 'bold');
            this.doc.setFontSize(8.5);
            this.doc.setTextColor(80, 80, 80);
            this.doc.text(l + ':', this.cfg.margin.left + 5, this.y);
            this.doc.setFont(this.cfg.font, 'normal');
            this.doc.setTextColor(0, 0, 0);
            this.doc.text(v || 'N/A', this.cfg.margin.left + 40, this.y);
            this.y += 5.5;
        });
        this.gap(1);

        // Academic performance
        if (grades && grades.length) {
            this.txt('Academic Performance:', null, null, { size: 9, style: 'bold' });
            this.gap(0.3);

            this.tbl(
                ['Subject', 'Score', 'Grade', 'Remarks'],
                grades.map(g => [g.subject_name || g.name, g.score, g.grade || this._grade(g.score), g.remarks || '']),
                { fontSize: 7.5 }
            );
            this.gap(0.5);

            // Totals
            const tot = grades.reduce((s, g) => s + (parseFloat(g.score) || 0), 0);
            const avg = grades.length ? (tot / grades.length).toFixed(1) : 0;

            this.doc.setFont(this.cfg.font, 'bold');
            this.doc.setFontSize(8.5);
            this.doc.text('Total: ' + tot, this.cfg.margin.left + 5, this.y);
            this.doc.text('Average: ' + avg + ' (' + this._grade(avg) + ')', this.cfg.margin.left + 55, this.y);
            this.y += 7;
        }

        // Comments
        if (comments) {
            this.gap(0.5);
            this.txt("Teacher's Comment:", null, null, { size: 8.5, style: 'bold' });
            this.gap(0.2);
            this.txt(comments.teacher || '', null, null, { size: 8 });
            this.gap(0.5);
            this.txt("Head Teacher's Comment:", null, null, { size: 8.5, style: 'bold' });
            this.gap(0.2);
            this.txt(comments.head || '', null, null, { size: 8 });
        }

        // Signatures
        this.y = Math.max(this.y + 8, this.cb - 32);
        this.drawSigRow([
            { label: 'Class Teacher', image: teacherSig, name: teacherSig ? '' : '________________', title: 'Signature & Stamp' },
            { label: 'Head Teacher', image: headSig, name: headSig ? '' : '________________', title: 'Signature & Stamp' },
            { label: 'Parent/Guardian', name: '________________', title: 'Signature' }
        ], this.y);

        this.save('ReportCard_' + (student.admission_number || student.first_name) + '_' + term.replace(/\s/g, '_') + '.pdf');
    }

    // ═══════════════════════════════════════════════════════════
    // OFFICIAL LETTER
    // ═══════════════════════════════════════════════════════════

    letter({ to, subject, body, ref, signatures, boundary }) {
        this.create().drawBoundary(boundary || 'letter').drawHeader({ scripture: false }).gap(1.5);

        if (ref) {
            this.txt('Ref: ' + ref, null, null, { size: 9 });
            this.txt('Date: ' + new Date().toLocaleDateString(), null, null, { size: 9 });
            this.gap(1);
        }

        if (to) {
            this.txt(to, null, null, { size: 10 });
            this.gap(1);
        }

        if (subject) {
            this.txt('RE: ' + subject, null, null, { size: 10, style: 'bold' });
            this.gap(1);
        }

        this.txt('Dear Sir/Madam,', null, null, { size: 10 });
        this.gap(0.5);

        (Array.isArray(body) ? body : [body || '']).forEach(p => {
            this.txt(p, null, null, { size: 10, maxWidth: this.cw - 5 });
            this.gap(0.5);
        });

        this.gap(1);
        this.txt('Yours faithfully,', null, null, { size: 10 });
        this.gap(3);

        if (signatures && signatures.length) {
            this.drawSigRow(signatures, this.y);
        }

        this.save('Letter_' + (ref || 'draft') + '_' + new Date().toISOString().slice(0, 10) + '.pdf');
    }

    // ═══════════════════════════════════════════════════════════
    // CERTIFICATE
    // ═══════════════════════════════════════════════════════════

    certificate({ title, recipient, body, signatures, boundary }) {
        this.create().drawBoundary(boundary || 'certificate').drawHeader({ bg: true, contact: false, line: false }).gap(3);

        this.txt(title || 'CERTIFICATE OF ACHIEVEMENT', this.cfg.margin.left + this.cw / 2, null, {
            align: 'center', size: 18, style: 'bold', color: this.cfg.accent, moveY: false
        });
        this.gap(1);

        this.txt('This is to certify that', this.cfg.margin.left + this.cw / 2, null, {
            align: 'center', size: 10, style: 'italic', color: [100, 100, 100], moveY: false
        });
        this.gap(0.5);

        this.txt(recipient, this.cfg.margin.left + this.cw / 2, null, {
            align: 'center', size: 16, style: 'bold', color: this.cfg.primary, moveY: false
        });
        this.gap(0.5);

        if (body) {
            const bodyArr = Array.isArray(body) ? body : [body];
            bodyArr.forEach(p => {
                this.txt(p, this.cfg.margin.left + this.cw / 2, null, {
                    align: 'center', size: 10, maxWidth: this.cw - 30
                });
            });
        }

        this.gap(2);

        if (signatures && signatures.length) {
            this.drawSigRow(signatures, this.y);
        }

        this.txt('Issued: ' + new Date().toLocaleDateString(), this.cfg.margin.left + this.cw / 2, null, {
            align: 'center', size: 7.5, color: [140, 140, 140]
        });

        this.save('Certificate_' + (recipient || 'doc').replace(/\s/g, '_') + '.pdf');
    }

    // ═══════════════════════════════════════════════════════════
    // MEETING MINUTES
    // ═══════════════════════════════════════════════════════════

    minutes({ meeting, attendees, agenda, items, actions, signatures }) {
        this.create().drawBoundary('simple').drawHeader().gap(0.5);

        this.txt('MEETING MINUTES', this.cfg.margin.left + this.cw / 2, null, {
            align: 'center', size: 13, style: 'bold', moveY: false
        });
        this.gap(1.5);

        // Meeting details
        const details = [
            ['Type', meeting.type],
            ['Date', meeting.date],
            ['Time', meeting.time],
            ['Venue', meeting.venue],
            ['Chair', meeting.chairperson],
            ['Secretary', meeting.secretary]
        ];

        details.forEach(([l, v]) => {
            this.doc.setFont(this.cfg.font, 'bold');
            this.doc.setFontSize(8.5);
            this.doc.setTextColor(80, 80, 80);
            this.doc.text(l + ':', this.cfg.margin.left + 5, this.y);
            this.doc.setFont(this.cfg.font, 'normal');
            this.doc.setTextColor(0, 0, 0);
            this.doc.text(v || '', this.cfg.margin.left + 45, this.y);
            this.y += 5.5;
        });

        // Attendees
        if (attendees && attendees.length) {
            this.gap(1);
            this.txt('Attendees:', null, null, { size: 9, style: 'bold' });
            this.gap(0.2);
            attendees.forEach((a, i) => {
                this.txt((i + 1) + '. ' + a.name + (a.role ? ' (' + a.role + ')' : ''), this.cfg.margin.left + 10, null, { size: 8.5 });
            });
        }

        // Agenda
        if (agenda && agenda.length) {
            this.gap(1);
            this.txt('Agenda:', null, null, { size: 9, style: 'bold' });
            this.gap(0.2);
            agenda.forEach((a, i) => {
                this.txt((i + 1) + '. ' + a, this.cfg.margin.left + 10, null, { size: 8.5 });
            });
        }

        // Minutes / Discussion items
        if (items && items.length) {
            this.gap(1);
            this.txt('Minutes:', null, null, { size: 9, style: 'bold' });
            this.gap(0.2);
            items.forEach(m => {
                this.checkBreak(15);
                this.txt(m.topic, this.cfg.margin.left + 5, null, { size: 8.5, style: 'bold' });
                if (m.discussion) {
                    this.txt(m.discussion, this.cfg.margin.left + 10, null, { size: 8, maxWidth: this.cw - 20 });
                }
                if (m.resolution) {
                    this.txt('Resolution: ' + m.resolution, this.cfg.margin.left + 10, null, {
                        size: 8, style: 'italic', color: [13, 71, 161], maxWidth: this.cw - 20
                    });
                }
                this.gap(0.5);
            });
        }

        // Action items table
        if (actions && actions.length) {
            this.checkBreak(20);
            this.gap(0.5);
            this.tbl(
                ['#', 'Action', 'Responsible', 'Deadline', 'Status'],
                actions.map((a, i) => [i + 1, a.action, a.responsible, a.deadline || '', a.status || 'Pending']),
                { fontSize: 7, rowH: 5.5 }
            );
        }

        // Signatures
        if (signatures && signatures.length) {
            this.y = Math.max(this.y + 8, this.cb - 32);
            this.drawSigRow(signatures, this.y);
        }

        this.save('Minutes_' + (meeting.type || 'Meeting').replace(/\s/g, '_') + '_' + (meeting.date || 'undated').replace(/\//g, '-') + '.pdf');
    }

    // ═══════════════════════════════════════════════════════════
    // ID CARD (landscape, 85.6mm x 54mm — standard CR80 size)
    // ═══════════════════════════════════════════════════════════

    idCard({ person, type, photo }) {
        if (!window.jspdf) {
            throw new Error('jsPDF not loaded');
        }
        const { jsPDF } = window.jspdf;
        const isStaff = type === 'staff';

        const cw = 85.6, ch = 54;
        const id = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [cw, ch] });
        const old = this.doc;
        this.doc = id;

        // Border
        this.doc.setDrawColor(...this.cfg.primary);
        this.doc.setLineWidth(0.8);
        this.doc.rect(2, 2, cw - 4, ch - 4, 'S');

        // Header bar
        if (isStaff) {
            this.doc.setFillColor(...this.cfg.primary);
            this.doc.rect(2, 2, cw - 4, 12, 'F');
        } else {
            this.doc.setFillColor(...this.cfg.primary);
            this.doc.rect(2, 2, 6, ch - 4, 'F');
        }

        // Header text
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(7);
        this.doc.setTextColor(255, 255, 255);
        this.doc.text(this.school.name.toUpperCase(), cw / 2, isStaff ? 7.5 : 6, { align: 'center' });
        if (isStaff) {
            this.doc.setFontSize(5);
            this.doc.text(person.designation || person.role || 'STAFF', cw / 2, 11, { align: 'center' });
        }

        // Photo
        const px = 5, py = isStaff ? 16 : 6;
        if (photo) {
            try {
                this.doc.addImage(photo, 'PNG', px, py, 18, 22);
            } catch (e) {
                this.doc.setDrawColor(200, 200, 200);
                this.doc.rect(px, py, 18, 22, 'S');
            }
        } else {
            this.doc.setDrawColor(200, 200, 200);
            this.doc.setFillColor(245, 245, 245);
            this.doc.rect(px, py, 18, 22, 'FD');
            this.doc.setFontSize(5);
            this.doc.setTextColor(180, 180, 180);
            this.doc.text('NO PHOTO', px + 9, py + 12, { align: 'center' });
        }

        // Info fields
        this.doc.setTextColor(0, 0, 0);
        let iy = isStaff ? 17 : 9;
        const ix = 26;

        const info = isStaff
            ? [
                ['Name', person.first_name + ' ' + person.last_name],
                ['Staff ID', person.staff_id_number || ''],
                ['Department', person.role || ''],
                ['Phone', person.phone || '']
            ]
            : [
                ['Name', person.first_name + ' ' + person.last_name],
                ['Adm No', person.admission_number || ''],
                ['Class', person.class_name || ''],
                ['Gender', person.gender === 'M' ? 'Male' : 'Female']
            ];

        info.forEach(([l, v]) => {
            this.doc.setFont('helvetica', 'bold');
            this.doc.setFontSize(5.5);
            this.doc.text(l + ':', ix, iy);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(v || 'N/A', ix + 18, iy);
            iy += 5;
        });

        // QR code placeholder
        this.doc.setDrawColor(200, 200, 200);
        this.doc.rect(cw - 22, ch - 22, 18, 18, 'S');
        this.doc.setFontSize(4);
        this.doc.setTextColor(180, 180, 180);
        this.doc.text('QR CODE', cw - 13, ch - 12, { align: 'center' });

        // Footer
        this.doc.setFontSize(4);
        this.doc.setTextColor(120, 120, 120);
        this.doc.text(this.school.phone + ' | ' + this.school.address, cw / 2, ch - 2, { align: 'center' });

        this.doc.save('ID_' + type + '_' + (person.first_name || 'card') + '.pdf');
        this.doc = old;
        return this;
    }

    // ═══════════════════════════════════════════════════════════
    // SAVE — draws footer then saves the PDF
    // ═══════════════════════════════════════════════════════════

    save(filename) {
        this.drawFooter();
        this.doc.save(filename);
        return this;
    }

    // ═══════════════════════════════════════════════════════════
    // GRADE CALCULATION — Uganda education grading system
    // ═══════════════════════════════════════════════════════════

    _grade(s) {
        const n = parseFloat(s);
        if (isNaN(n)) return '';

        // Uganda grading (consistent with ReportCards.jsx and StudentProfile.jsx)
        if (n >= 80) return 'D1';   // Distinction 1
        if (n >= 75) return 'D2';   // Distinction 2
        if (n >= 70) return 'C3';   // Credit 3
        if (n >= 65) return 'C4';   // Credit 4
        if (n >= 60) return 'C5';   // Credit 5
        if (n >= 55) return 'C6';   // Credit 6
        if (n >= 50) return 'P7';   // Pass 7
        if (n >= 45) return 'P8';   // Pass 8
        return 'F9';                // Fail 9
    }
}

export default SchoolDocument;