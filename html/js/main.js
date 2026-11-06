/**
 * Disco Et Emergo — Main Client Script
 * Handles mobile navigation and the plug-and-play static contact form
 * (supports Web3Forms / Formspree fetch relay with automatic mailto: fallback for GitHub Pages).
 */

const DEFAULT_CONTACT_CONFIG = {
    // Plug-and-Play: Paste your free Web3Forms Access Key (https://web3forms.com)
    // or change endpointUrl to a Formspree endpoint (https://formspree.io/f/YOUR_ID)
    endpointUrl: 'https://api.web3forms.com/submit',
    accessKey: '',
    fallbackEmail: 'hello@discoetemergo.example.com',
    subjectPrefix: '[Disco Et Emergo Inquiry]'
};

/**
 * Validates contact form fields.
 * @param {{ name: string, email: string, organization?: string, message: string, botcheck?: boolean }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateContactData(data) {
    const errors = [];
    const name = (data.name || '').trim();
    const email = (data.email || '').trim();
    const message = (data.message || '').trim();

    if (!name) {
        errors.push('Please enter your name.');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Please enter a valid email address.');
    }
    if (!message || message.length < 5) {
        errors.push('Please share a brief message (at least 5 characters).');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Builds a pre-filled mailto: URI from contact form data.
 * @param {{ name: string, email: string, organization?: string, message: string }} data
 * @param {typeof DEFAULT_CONTACT_CONFIG} config
 * @returns {string}
 */
function buildMailtoUrl(data, config = DEFAULT_CONTACT_CONFIG) {
    const recipient = config.fallbackEmail || DEFAULT_CONTACT_CONFIG.fallbackEmail;
    const prefix = config.subjectPrefix || DEFAULT_CONTACT_CONFIG.subjectPrefix;
    const orgPart = data.organization && data.organization.trim()
        ? ` (${data.organization.trim()})`
        : '';
    const subject = `${prefix} Coaching Session Inquiry from ${data.name.trim()}${orgPart}`;
    const bodyLines = [
        `Name: ${data.name.trim()}`,
        `Email: ${data.email.trim()}`,
        `Organization / Team Size: ${(data.organization || '').trim() || 'Not specified'}`,
        '',
        'Message:',
        data.message.trim()
    ];

    return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
}

/**
 * Formats plain-text summary for clipboard copying.
 * @param {{ name: string, email: string, organization?: string, message: string }} data
 * @param {typeof DEFAULT_CONTACT_CONFIG} config
 * @returns {string}
 */
function formatClipboardSummary(data, config = DEFAULT_CONTACT_CONFIG) {
    const recipient = config.fallbackEmail || DEFAULT_CONTACT_CONFIG.fallbackEmail;
    return [
        `To: ${recipient}`,
        `Name: ${(data.name || '').trim()}`,
        `Email: ${(data.email || '').trim()}`,
        `Organization / Team Size: ${(data.organization || '').trim() || 'Not specified'}`,
        '',
        (data.message || '').trim()
    ].join('\n');
}

/**
 * Submits the contact form either via configured serverless endpoint (Web3Forms / Formspree)
 * or falls back to pre-filled mailto link when no access key is configured.
 *
 * @param {{ name: string, email: string, organization?: string, message: string, botcheck?: boolean }} data
 * @param {typeof DEFAULT_CONTACT_CONFIG} config
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ status: 'spam_blocked' | 'validation_error' | 'sent_api' | 'fallback_mailto', message: string, mailtoUrl?: string, errors?: string[] }>}
 */
async function submitContactForm(data, config = DEFAULT_CONTACT_CONFIG, fetchImpl = typeof fetch !== 'undefined' ? fetch : null) {
    // 1. Honeypot spam check
    if (data.botcheck) {
        return {
            status: 'spam_blocked',
            message: 'Submission ignored.'
        };
    }

    // 2. Validate inputs
    const validation = validateContactData(data);
    if (!validation.valid) {
        return {
            status: 'validation_error',
            message: validation.errors.join(' '),
            errors: validation.errors
        };
    }

    const mergedConfig = { ...DEFAULT_CONTACT_CONFIG, ...config };
    const hasAccessKey = Boolean(mergedConfig.accessKey && mergedConfig.accessKey.trim());
    const isCustomEndpoint = Boolean(
        mergedConfig.endpointUrl &&
        mergedConfig.endpointUrl.trim() &&
        mergedConfig.endpointUrl !== DEFAULT_CONTACT_CONFIG.endpointUrl
    );

    // 3. If an accessKey or custom Formspree URL is configured, submit via fetch
    if ((hasAccessKey || isCustomEndpoint) && fetchImpl) {
        try {
            const payload = {
                name: data.name.trim(),
                email: data.email.trim(),
                organization: (data.organization || '').trim(),
                message: data.message.trim(),
                subject: `${mergedConfig.subjectPrefix} Inquiry from ${data.name.trim()}`
            };
            if (hasAccessKey) {
                payload.access_key = mergedConfig.accessKey.trim();
            }

            const response = await fetchImpl(mergedConfig.endpointUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response && response.ok) {
                return {
                    status: 'sent_api',
                    message: "Message sent! Thanks for reaching out — we'll get back to you soon."
                };
            }
        } catch (_err) {
            // Fall through to mailto fallback if network request fails
        }
    }

    // 4. Fallback to pre-filled mailto link
    const mailtoUrl = buildMailtoUrl(data, mergedConfig);
    return {
        status: 'fallback_mailto',
        message: "We've prepared your message in your email app! You can also copy the details below.",
        mailtoUrl
    };
}

/**
 * Initializes DOM event listeners for mobile menu and contact form.
 * @param {Document} doc
 * @param {typeof DEFAULT_CONTACT_CONFIG} [customConfig]
 */
function initSite(doc = typeof document !== 'undefined' ? document : null, customConfig = {}) {
    if (!doc) return;

    const config = {
        ...DEFAULT_CONTACT_CONFIG,
        ...(typeof window !== 'undefined' && window.DISCO_CONTACT_CONFIG ? window.DISCO_CONTACT_CONFIG : {}),
        ...customConfig
    };

    // Mobile Menu Toggle
    const menuBtn = doc.getElementById('mobile-menu-btn');
    const mobileMenu = doc.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            const isHidden = mobileMenu.classList.contains('hidden');
            if (isHidden) {
                mobileMenu.classList.remove('hidden');
                menuBtn.setAttribute('aria-expanded', 'true');
            } else {
                mobileMenu.classList.add('hidden');
                menuBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Close mobile menu when a link inside it is clicked
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach((link) => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                menuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Contact Form Handling
    const form = doc.getElementById('contact-form');
    const statusBox = doc.getElementById('contact-status');
    const statusText = doc.getElementById('contact-status-text');
    const fallbackActions = doc.getElementById('contact-fallback-actions');
    const mailtoLink = doc.getElementById('contact-mailto-link');
    const copyBtn = doc.getElementById('contact-copy-btn');

    if (form && statusBox && statusText) {
        let lastFormData = null;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = {
                name: (form.querySelector('[name="name"]')?.value || ''),
                email: (form.querySelector('[name="email"]')?.value || ''),
                organization: (form.querySelector('[name="organization"]')?.value || ''),
                message: (form.querySelector('[name="message"]')?.value || ''),
                botcheck: Boolean(form.querySelector('[name="botcheck"]')?.checked)
            };

            const result = await submitContactForm(formData, config);
            statusBox.classList.remove('hidden', 'bg-red-50', 'border-red-300', 'bg-brand-mint/30', 'border-brand-teal');

            if (result.status === 'validation_error') {
                statusBox.classList.add('bg-red-50', 'border-red-300');
                statusText.textContent = result.message;
                if (fallbackActions) fallbackActions.classList.add('hidden');
                return;
            }

            if (result.status === 'spam_blocked') {
                return;
            }

            lastFormData = formData;
            statusBox.classList.add('bg-brand-mint/30', 'border-brand-teal');
            statusText.textContent = result.message;

            if (result.status === 'fallback_mailto' && result.mailtoUrl) {
                if (mailtoLink) {
                    mailtoLink.setAttribute('href', result.mailtoUrl);
                }
                if (fallbackActions) {
                    fallbackActions.classList.remove('hidden');
                }
                // Trigger default mail client in browser environment
                if (typeof window !== 'undefined' && window.location && !window.__DISABLE_MAILTO_REDIRECT__) {
                    window.location.href = result.mailtoUrl;
                }
            } else if (result.status === 'sent_api') {
                if (fallbackActions) {
                    fallbackActions.classList.add('hidden');
                }
                form.reset();
            }
        });

        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                if (!lastFormData) return;
                const summary = formatClipboardSummary(lastFormData, config);
                if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(summary);
                    copyBtn.textContent = 'Copied to Clipboard! ✓';
                }
            });
        }
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initSite(document));
    } else {
        initSite(document);
    }
}

// Export for Node.js unit test suite
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_CONTACT_CONFIG,
        validateContactData,
        buildMailtoUrl,
        formatClipboardSummary,
        submitContactForm,
        initSite
    };
}

