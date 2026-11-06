const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    validateContactData,
    buildMailtoUrl,
    formatClipboardSummary,
    submitContactForm
} = require('../html/js/main.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTML_DIR = path.join(ROOT_DIR, 'html');

test('validateContactData accepts valid form input and rejects invalid fields', () => {
    const valid = validateContactData({
        name: 'Jared Karol',
        email: 'jared@example.com',
        organization: 'Disco Et Emergo',
        message: 'We would love to book a session for 30 team leads.'
    });
    assert.equal(valid.valid, true);
    assert.equal(valid.errors.length, 0);

    const invalid = validateContactData({
        name: '   ',
        email: 'not-an-email',
        message: 'hi'
    });
    assert.equal(invalid.valid, false);
    assert.equal(invalid.errors.length, 3);
});

test('buildMailtoUrl and formatClipboardSummary include sender details and organization', () => {
    const formData = {
        name: 'Mercedes Adams',
        email: 'mercedes@example.com',
        organization: 'Acme Learning (40 people)',
        message: 'Looking for an interactive meeting transformation workshop.'
    };
    const config = {
        fallbackEmail: 'coaching@discoetemergo.example.com',
        subjectPrefix: '[Disco Et Emergo]'
    };

    const mailto = buildMailtoUrl(formData, config);
    assert.match(mailto, /^mailto:coaching@discoetemergo\.example\.com\?subject=/);
    assert.match(decodeURIComponent(mailto), /Mercedes Adams \(Acme Learning \(40 people\)\)/);
    assert.match(decodeURIComponent(mailto), /Looking for an interactive meeting transformation workshop\./);

    const clip = formatClipboardSummary(formData, config);
    assert.match(clip, /To: coaching@discoetemergo\.example\.com/);
    assert.match(clip, /Organization \/ Team Size: Acme Learning \(40 people\)/);
});

test('submitContactForm blocks honeypot spam submissions', async () => {
    const res = await submitContactForm({
        name: 'Spam Bot',
        email: 'bot@example.com',
        message: 'Buy cheap links now!',
        botcheck: true
    });
    assert.equal(res.status, 'spam_blocked');
});

test('submitContactForm uses mailto fallback when accessKey is empty', async () => {
    const res = await submitContactForm(
        {
            name: 'Alex Rivera',
            email: 'alex@company.com',
            organization: 'Product Team',
            message: 'Interested in bringing Disco Et Emergo to our quarterly offsite.'
        },
        { accessKey: '', fallbackEmail: 'hello@discoetemergo.example.com' }
    );
    assert.equal(res.status, 'fallback_mailto');
    assert.ok(res.mailtoUrl.startsWith('mailto:hello@discoetemergo.example.com'));
});

test('submitContactForm sends POST via fetch when plug-and-play accessKey is configured', async () => {
    let capturedUrl = null;
    let capturedOptions = null;

    const mockFetch = async (url, options) => {
        capturedUrl = url;
        capturedOptions = options;
        return { ok: true, status: 200 };
    };

    const res = await submitContactForm(
        {
            name: 'Alex Rivera',
            email: 'alex@company.com',
            organization: 'Engineering',
            message: 'We want to host productive meetings that do not suck!'
        },
        {
            endpointUrl: 'https://api.web3forms.com/submit',
            accessKey: 'test-public-access-key-123'
        },
        mockFetch
    );

    assert.equal(res.status, 'sent_api');
    assert.equal(capturedUrl, 'https://api.web3forms.com/submit');
    const parsedBody = JSON.parse(capturedOptions.body);
    assert.equal(parsedBody.access_key, 'test-public-access-key-123');
    assert.equal(parsedBody.name, 'Alex Rivera');
    assert.equal(parsedBody.email, 'alex@company.com');
});

test('submitContactForm gracefully falls back to mailto if API fetch fails', async () => {
    const failingFetch = async () => {
        throw new Error('Network unreachable');
    };

    const res = await submitContactForm(
        {
            name: 'Alex Rivera',
            email: 'alex@company.com',
            message: 'Testing graceful fallback when offline.'
        },
        {
            endpointUrl: 'https://api.web3forms.com/submit',
            accessKey: 'test-key'
        },
        failingFetch
    );

    assert.equal(res.status, 'fallback_mailto');
    assert.ok(res.mailtoUrl.startsWith('mailto:'));
});

test('html/index.html and logo assets exist and contain all required sections and PDF content', () => {
    const htmlPath = path.join(HTML_DIR, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Verify logo assets exist and broken reference is removed
    assert.ok(!html.includes('WhatsApp Image'), 'Broken WhatsApp image path should be removed');
    assert.ok(html.includes('images/logo-transparent.png'), 'Hero should use transparent logo');
    assert.ok(html.includes('images/logo-mark.png'), 'Navbar/footer should use logo mark');

    for (const file of ['images/logo.jpeg', 'images/logo-transparent.png', 'images/logo-mark.png']) {
        const fullPath = path.join(HTML_DIR, file);
        assert.ok(fs.existsSync(fullPath), `Expected asset ${file} to exist in html/`);
        assert.ok(fs.statSync(fullPath).size > 1000, `Expected asset ${file} to be non-empty`);
    }

    // Verify key content from PDF
    assert.match(html, /Host productive meetings/i);
    assert.match(html, /Bring your personality to the table\./);
    assert.match(html, /Be Respectful\./);
    assert.match(html, /Always pause to reflect\./);
    assert.match(html, /Measure the experience against your intention\./);
    assert.match(html, /Give yourself grace\./);
    assert.match(html, /Jared Karol/);
    assert.match(html, /Mercedes Adams/);
    assert.match(html, /Learn, practice, grow — emerge!/);
    assert.match(html, /https:\/\/speakwiseapp\.com\/blog\/time-spent-in-meetings-statistics/);
    assert.match(html, /https:\/\/www\.nber\.org\/papers\/w35706/);
    assert.match(html, /id="contact-form"/);
});

