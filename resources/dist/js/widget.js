(function() {
    'use strict';

    // Check if config is available
    if (!window.notedisConfig || !window.notedisConfig.siteKey) {
        console.error('Notedis: Missing configuration. Please ensure notedisConfig is defined.');
        return;
    }

    const config = {
        siteKey: window.notedisConfig.siteKey,
        apiUrl: window.notedisConfig.apiUrl || 'https://notedis.com',
        position: window.notedisConfig.position || 'bottom-right',
        color: window.notedisConfig.color || '#3B82F6' // Updated to primary blue
    };

    // Mobile detection function
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.innerWidth <= 768;
    }

    // Load ua-parser-js from CDN for enhanced browser data collection
    function loadUAParser() {
        return new Promise((resolve, reject) => {
            if (window.UAParser) {
                resolve(window.UAParser);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/ua-parser-js@2.0.1/dist/ua-parser.min.js';
            script.onload = () => {
                if (window.UAParser) {
                    resolve(window.UAParser);
                } else {
                    reject(new Error('UAParser loaded but not available'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load UAParser from CDN'));
            document.head.appendChild(script);
        });
    }

    // Get enhanced browser information using ua-parser-js
    async function getBrowserInfo() {
        try {
            const UAParser = await loadUAParser();
            const parser = new UAParser();
            const result = parser.getResult();

            return {
                browser: {
                    name: result.browser.name || null,
                    version: result.browser.version || null,
                    major: result.browser.major || null
                },
                device: {
                    model: result.device.model || null,
                    type: result.device.type || null,
                    vendor: result.device.vendor || null
                },
                os: {
                    name: result.os.name || null,
                    version: result.os.version || null
                },
                engine: {
                    name: result.engine.name || null,
                    version: result.engine.version || null
                },
                cpu: {
                    architecture: result.cpu.architecture || null
                }
            };
        } catch (error) {
            console.log('UAParser failed, falling back to basic user agent:', error.message);
            // Fallback to basic user agent
            return {
                userAgent: navigator.userAgent
            };
        }
    }

    // Prevent multiple instances
    if (window.notedisWidget) {
        return;
    }

    let isOpen = false;
    let widget = null;
    let overlay = null;
    let screenshotMode = false;
    let screenshotData = null;
    let annotationCanvas = null;
    let annotationHistory = [];
    let uploadedFile = null;
    let pageContext = null; // Store page context when widget is opened

    // Toast notification function
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            padding: 16px 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            animation: slideInRight 0.3s ease-out;
            cursor: pointer;
        `;
        toast.textContent = message;

        // Add animation keyframes
        if (!document.getElementById('notedis-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'notedis-toast-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        });

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    // Show special error UI for expired trial or limit exceeded
    function showExpiredTrialError(errorData) {
        const form = document.getElementById('notedis-form'); // Fixed: correct form ID
        const errorEl = document.getElementById('notedis-error'); // Fixed: correct error ID

        console.log('Form element:', form);
        console.log('Error element:', errorEl);

        if (!form || !errorEl) {
            console.error('Missing required elements for error display');
            return;
        }

        // Hide the form
        form.style.display = 'none';

        // Build the error message with links
        const message = errorData.message || 'Unable to submit feedback at this time.';
        const ownerEmail = errorData.metadata?.owner_email;
        const pricingUrl = errorData.metadata?.pricing_url;

        // Create custom error HTML (without inline event handlers for CSP compliance)
        errorEl.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style="color: #374151; font-size: 16px; margin-bottom: 16px; line-height: 1.5;">
                    ${message}
                </p>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
                    ${ownerEmail ? `
                        <button type="button"
                           class="notedis-error-email-btn"
                           style="
                               display: inline-block;
                               padding: 12px 24px;
                               background: #3b82f6;
                               color: white;
                               text-decoration: none;
                               border-radius: 8px;
                               font-weight: 500;
                               font-size: 14px;
                               transition: all 0.2s ease;
                               box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                               border: none;
                               cursor: pointer;
                               width: 100%;
                               box-sizing: border-box;
                               font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                           ">
                            📧 Email Site Owner
                        </button>
                    ` : ''}
                    ${pricingUrl ? `
                        <a href="${pricingUrl}"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="notedis-error-pricing-link"
                           style="
                               color: #3b82f6;
                               text-decoration: none;
                               font-size: 14px;
                               font-weight: 500;
                               transition: opacity 0.2s ease;
                           ">
                            Learn about pricing →
                        </a>
                    ` : ''}
                </div>
            </div>
        `;

        // Add event listeners for hover effects (CSP compliant)
        const emailBtn = errorEl.querySelector('.notedis-error-email-btn');
        if (emailBtn) {
            emailBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 8px 12px -2px rgba(0, 0, 0, 0.15)';
            });
            emailBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            });

            // Add click handler to send upgrade request via API
            emailBtn.addEventListener('click', async function() {
                const originalText = this.textContent;
                const originalDisabled = this.disabled;

                // Show loading state
                this.disabled = true;
                this.textContent = '⏳ Sending...';
                this.style.opacity = '0.7';

                try {
                    // Get email from the form
                    const emailInput = form.querySelector('[name="email"]');
                    const senderEmail = emailInput ? emailInput.value : '';

                    if (!senderEmail || !senderEmail.includes('@')) {
                        throw new Error('Please enter a valid email address in the form first');
                    }

                    // Send request to API
                    const response = await fetch(`${config.apiUrl}/api/feedback/request-upgrade`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({
                            site_key: config.siteKey,
                            sender_email: senderEmail
                        })
                    });

                    const result = await response.json();

                    if (response.ok && result.success) {
                        // Success - keep button in permanent success state
                        this.textContent = '✓ Request Sent';
                        this.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                        this.style.opacity = '1';
                        // Keep button disabled to prevent duplicate sends
                        this.disabled = true;
                        showToast(result.message || 'Your upgrade request has been sent to the site owner.', 'success');
                    } else {
                        throw new Error(result.message || 'Failed to send request');
                    }
                } catch (error) {
                    console.error('Failed to send upgrade request:', error);
                    showToast(error.message || 'Failed to send request. Please try again.', 'error');

                    // Restore button state
                    this.textContent = originalText;
                    this.disabled = originalDisabled;
                    this.style.opacity = '1';
                }
            });
        }

        const pricingLink = errorEl.querySelector('.notedis-error-pricing-link');
        if (pricingLink) {
            pricingLink.addEventListener('mouseenter', function() {
                this.style.opacity = '0.8';
            });
            pricingLink.addEventListener('mouseleave', function() {
                this.style.opacity = '1';
            });
        }

        // Show the error
        errorEl.style.display = 'block';

        // Show error toast as well
        showToast(message, 'error');
    }

    // Create the widget button with enhanced styling
    function createWidget() {
        widget = document.createElement('div');
        widget.id = 'notedis-widget';
        widget.innerHTML = `
            <div id="notedis-button" style="
                position: fixed;
                ${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                width: 56px;
                height: 56px;
                background: ${config.color};
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                z-index: 99999999999999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
                border: 1px solid rgba(255, 255, 255, 0.1);
            " title="Send Feedback">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                </svg>
            </div>
        `;

        document.body.appendChild(widget);

        // Add enhanced hover effects
        const button = widget.querySelector('#notedis-button');
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05) translateY(-2px)';
            button.style.boxShadow = '0 20px 25px -5px rgba(59, 130, 246, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1) translateY(0)';
            button.style.boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        });

        // Add click handler
        button.addEventListener('click', openFeedbackModal);
    }

    // Create the feedback modal
    async function openFeedbackModal() {
        if (isOpen) return;
        isOpen = true;

        // Capture page context when widget is opened (with enhanced browser info)
        const browserInfo = await getBrowserInfo();
        pageContext = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            browserInfo: browserInfo,
            userAgent: browserInfo.userAgent || navigator.userAgent
        };

        // Create overlay
        overlay = document.createElement('div');
        overlay.id = 'notedis-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        overlay.innerHTML = `
            <div class="notedis-modal-content" style="
                background: white;
                border-radius: 16px;
                padding: 0;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow: hidden;
                position: relative;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                border: 1px solid rgba(0, 0, 0, 0.05);
                transition: transform 0.2s ease, opacity 0.2s ease;
            ">
                <!-- Drag Overlay -->
                <div id="notedis-drag-overlay" style="
                    position: absolute;
                    inset: 0;
                    background: rgba(59, 130, 246, 0.95);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    border-radius: 16px;
                    pointer-events: none;
                ">
                    <div style="text-align: center; color: white; padding: 32px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🖼️</div>
                        <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Drop your image here</div>
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 12px;">Maximum file size: 25MB</div>
                        <div style="font-size: 13px; opacity: 0.8;">Supported: PNG, JPG, GIF, WebP</div>
                    </div>
                </div>

                <!-- Header with gradient -->
                <div style="
                    background: linear-gradient(to right, #f9fafb, rgba(59, 130, 246, 0.05), #f9fafb);
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e7eb;
                    position: relative;
                ">
                    <h3 style="margin: 0; color: #111827; font-size: 20px; font-weight: 600;">Send us your feedback</h3>
                    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                        We'd love to hear from you! Share your thoughts below.
                    </p>
                    <button id="notedis-close" style="
                        background: white;
                        border: 1px solid #e5e7eb;
                        font-size: 24px;
                        cursor: pointer;
                        color: #6b7280;
                        padding: 0;
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        width: 32px;
                        height: 32px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                        line-height: 1;
                        font-family: Arial, sans-serif;
                    " onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">&times;</button>
                </div>

                <!-- Form content -->
                <div style="padding: 24px; overflow-y: auto; max-height: calc(90vh - 100px);">

                <form id="notedis-form">
                    <!-- Category Selection with visual cards -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; color: #111827; font-weight: 500; font-size: 14px;">What type of feedback?</label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px;">
                            <label style="cursor: pointer;">
                                <input type="radio" name="category" value="bug" required checked style="display: none;">
                                <div class="category-option" style="
                                    padding: 12px 8px;
                                    border: 2px solid #3b82f6;
                                    border-radius: 8px;
                                    text-align: center;
                                    transition: all 0.2s;
                                    background: #eff6ff;
                                " onmouseover="this.style.borderColor='#3b82f6'; this.style.backgroundColor='#eff6ff'" onmouseout="if(!this.parentElement.querySelector('input').checked){this.style.borderColor='#e5e7eb'; this.style.backgroundColor='white'}">
                                    <div style="font-size: 24px; margin-bottom: 4px;">🐛</div>
                                    <div style="font-size: 12px; color: #6b7280;">Bug</div>
                                </div>
                            </label>
                            <label style="cursor: pointer;">
                                <input type="radio" name="category" value="feature" required style="display: none;">
                                <div class="category-option" style="
                                    padding: 12px 8px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    text-align: center;
                                    transition: all 0.2s;
                                    background: white;
                                " onmouseover="this.style.borderColor='#3b82f6'; this.style.backgroundColor='#eff6ff'" onmouseout="if(!this.parentElement.querySelector('input').checked){this.style.borderColor='#e5e7eb'; this.style.backgroundColor='white'}">
                                    <div style="font-size: 24px; margin-bottom: 4px;">✨</div>
                                    <div style="font-size: 12px; color: #6b7280;">Feature</div>
                                </div>
                            </label>
                            <label style="cursor: pointer;">
                                <input type="radio" name="category" value="improvement" required style="display: none;">
                                <div class="category-option" style="
                                    padding: 12px 8px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    text-align: center;
                                    transition: all 0.2s;
                                    background: white;
                                " onmouseover="this.style.borderColor='#3b82f6'; this.style.backgroundColor='#eff6ff'" onmouseout="if(!this.parentElement.querySelector('input').checked){this.style.borderColor='#e5e7eb'; this.style.backgroundColor='white'}">
                                    <div style="font-size: 24px; margin-bottom: 4px;">🔧</div>
                                    <div style="font-size: 12px; color: #6b7280;">Improve</div>
                                </div>
                            </label>
                            <label style="cursor: pointer;">
                                <input type="radio" name="category" value="question" required style="display: none;">
                                <div class="category-option" style="
                                    padding: 12px 8px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    text-align: center;
                                    transition: all 0.2s;
                                    background: white;
                                " onmouseover="this.style.borderColor='#3b82f6'; this.style.backgroundColor='#eff6ff'" onmouseout="if(!this.parentElement.querySelector('input').checked){this.style.borderColor='#e5e7eb'; this.style.backgroundColor='white'}">
                                    <div style="font-size: 24px; margin-bottom: 4px;">❓</div>
                                    <div style="font-size: 12px; color: #6b7280;">Question</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Priority Selection -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; color: #111827; font-weight: 500; font-size: 14px;">How urgent is this?</label>
                        <div style="display: flex; gap: 8px;">
                            <label style="cursor: pointer; flex: 1;">
                                <input type="radio" name="priority" value="low" required checked style="display: none;">
                                <div style="
                                    padding: 8px;
                                    border: 2px solid #10b981;
                                    border-radius: 8px;
                                    text-align: center;
                                    transition: all 0.2s;
                                    background: #f0fdf4;
                                    font-size: 13px;
                                    color: #6b7280;
                                " onmouseover="this.style.borderColor='#10b981'; this.style.backgroundColor='#f0fdf4'" onmouseout="if(!this.parentElement.querySelector('input').checked){this.style.borderColor='#e5e7eb'; this.style.backgroundColor='white'}">
                                    Low
                                </div>
                            </label>
                            <label style="cursor: pointer; flex: 1;">
                                <input type="radio" name="priority" value="medium" required style="display: none;">
                                <div style="
                                    padding: 8px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    text-align: center;
                                    transition: all 0.2s;
                                    background: white;
                                    font-size: 13px;
                                    color: #111827;
                                    font-weight: 500;
                                ">
                                    Medium
                                </div>
                            </label>
                            <label style="cursor: pointer; flex: 1;">
                                <input type="radio" name="priority" value="high" required style="display: none;">
                                <div style="
                                    padding: 8px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    text-align: center;
                                    transition: all 0.2s;
                                    background: white;
                                    font-size: 13px;
                                    color: #6b7280;
                                " onmouseover="this.style.borderColor='#f59e0b'; this.style.backgroundColor='#fef3c7'" onmouseout="if(!this.parentElement.querySelector('input').checked){this.style.borderColor='#e5e7eb'; this.style.backgroundColor='white'}">
                                    High
                                </div>
                            </label>
                            <label style="cursor: pointer; flex: 1;">
                                <input type="radio" name="priority" value="urgent" required style="display: none;">
                                <div style="
                                    padding: 8px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    text-align: center;
                                    transition: all 0.2s;
                                    background: white;
                                    font-size: 13px;
                                    color: #6b7280;
                                " onmouseover="this.style.borderColor='#ef4444'; this.style.backgroundColor='#fee2e2'" onmouseout="if(!this.parentElement.querySelector('input').checked){this.style.borderColor='#e5e7eb'; this.style.backgroundColor='white'}">
                                    Urgent
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Title Field -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #111827; font-weight: 500; font-size: 14px;">
                            Title <span style="color: #ef4444;">*</span>
                        </label>
                        <input type="text" name="title" required placeholder="Brief description of your feedback" minlength="3" maxlength="255" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 14px;
                            transition: all 0.2s;
                            box-sizing: border-box;
                        " onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'">
                    </div>

                    <!-- Message Field -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #111827; font-weight: 500; font-size: 14px;">
                            Tell us more... <span style="color: #ef4444;">*</span>
                        </label>
                        <div style="position: relative;">
                            <textarea name="message" required placeholder="Describe your feedback in detail..." style="
                                width: 100%;
                                min-height: 120px;
                                padding: 12px;
                                border: 2px solid #e5e7eb;
                                border-radius: 8px;
                                font-size: 14px;
                                resize: vertical;
                                font-family: inherit;
                                transition: all 0.2s;
                                line-height: 1.5;
                                box-sizing: border-box;
                            " onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'"></textarea>
                            <div style="position: absolute; bottom: 8px; right: 12px; font-size: 11px; color: #9ca3af;">0/500</div>
                        </div>
                    </div>

                    <!-- Email Field -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #111827; font-weight: 500; font-size: 14px;">
                            Your email <span style="color: #ef4444;">*</span>
                        </label>
                        <input type="email" name="email" required placeholder="your@email.com" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 14px;
                            transition: all 0.2s;
                            box-sizing: border-box;
                        " onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #111827; font-weight: 500; font-size: 14px;">
                            Screenshot (Optional)
                        </label>
                        <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Max file size: 25MB</p>

                        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                            ${!isMobileDevice() ? `
                            <button type="button" id="notedis-take-screenshot" style="
                                flex: 1;
                                padding: 8px 16px;
                                background: #f3f4f6;
                                color: #374151;
                                border: 1px solid #d1d5db;
                                border-radius: 6px;
                                font-size: 14px;
                                cursor: pointer;
                                font-weight: 500;
                                transition: all 0.2s;
                            " onmouseover="this.style.backgroundColor='#e5e7eb'" onmouseout="this.style.backgroundColor='#f3f4f6'">📷 Take Screenshot</button>
                            ` : ''}

                            <button type="button" id="notedis-upload-file-btn" style="
                                flex: 1;
                                padding: 8px 16px;
                                background: #f3f4f6;
                                color: #374151;
                                border: 1px solid #d1d5db;
                                border-radius: 6px;
                                font-size: 14px;
                                cursor: pointer;
                                font-weight: 500;
                                transition: all 0.2s;
                            " onmouseover="this.style.backgroundColor='#e5e7eb'" onmouseout="this.style.backgroundColor='#f3f4f6'">${isMobileDevice() ? '🖼️ Upload Image' : '🖼️ Upload Image'}</button>
                        </div>

                        <input type="file" id="notedis-file-input" style="display: none;" accept="image/*">

                        <div id="notedis-screenshot-preview" style="display: none; margin-top: 10px;">
                            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Screenshot captured - click to edit annotations</div>
                            <div id="notedis-screenshot-thumbnail" style="
                                width: 120px;
                                height: 80px;
                                border: 1px solid #d1d5db;
                                border-radius: 4px;
                                background-size: cover;
                                background-position: center;
                                cursor: pointer;
                                position: relative;
                            "></div>
                        </div>

                        <div id="notedis-file-preview" style="display: none; margin-top: 10px;">
                            <div style="
                                display: flex;
                                align-items: center;
                                gap: 12px;
                                padding: 12px;
                                background: #f9fafb;
                                border: 1px solid #d1d5db;
                                border-radius: 6px;
                            ">
                                <div style="font-size: 24px;">📄</div>
                                <div style="flex: 1;">
                                    <div id="notedis-file-name" style="font-size: 13px; font-weight: 500; color: #111827;"></div>
                                    <div id="notedis-file-size" style="font-size: 12px; color: #6b7280;"></div>
                                </div>
                                <button type="button" id="notedis-remove-file" style="
                                    padding: 4px 8px;
                                    background: white;
                                    border: 1px solid #d1d5db;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    cursor: pointer;
                                    color: #ef4444;
                                    font-weight: 500;
                                " onmouseover="this.style.backgroundColor='#fee2e2'" onmouseout="this.style.backgroundColor='white'">Remove</button>
                            </div>
                        </div>
                    </div>

                    <!-- Form Actions -->
                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <button type="button" id="notedis-cancel" style="
                            flex: 1;
                            padding: 12px 20px;
                            background: white;
                            color: #6b7280;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s;
                        " onmouseover="this.style.backgroundColor='#f9fafb'; this.style.borderColor='#d1d5db'" onmouseout="this.style.backgroundColor='white'; this.style.borderColor='#e5e7eb'">Cancel</button>
                        <button type="submit" style="
                            flex: 1;
                            padding: 12px 20px;
                            background: linear-gradient(135deg, #3b82f6 0%, #2563EB 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
                        " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 10px 15px -3px rgba(59, 130, 246, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(59, 130, 246, 0.3)'">Send Feedback</button>
                    </div>
                </form>

                <div id="notedis-loading" style="display: none; text-align: center; color: #6b7280;">
                    Sending feedback...
                </div>

                <div id="notedis-success" style="display: none; text-align: center; color: #10b981; font-weight: 500;">
                    Thank you! Your feedback has been sent.
                </div>

                <div id="notedis-error" style="display: none; text-align: center; color: #ef4444; font-weight: 500;">
                    Sorry, there was an error sending your feedback. Please try again.
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add event listeners
        overlay.querySelector('#notedis-close').addEventListener('click', closeFeedbackModal);
        overlay.querySelector('#notedis-cancel').addEventListener('click', closeFeedbackModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeFeedbackModal();
        });

        // Handle form submission
        overlay.querySelector('#notedis-form').addEventListener('submit', handleSubmit);

        // Handle screenshot button and preview (desktop only)
        const takeScreenshotBtn = overlay.querySelector('#notedis-take-screenshot');
        const screenshotPreview = overlay.querySelector('#notedis-screenshot-preview');

        if (takeScreenshotBtn) {
            takeScreenshotBtn.addEventListener('click', takeScreenshot);
        }

        const screenshotThumbnail = overlay.querySelector('#notedis-screenshot-thumbnail');
        if (screenshotThumbnail) {
            screenshotThumbnail.addEventListener('click', () => {
                if (screenshotData) {
                    openAnnotationEditor();
                }
            });
        }

        // Handle file upload
        uploadedFile = null; // Reset for new modal
        const fileInput = overlay.querySelector('#notedis-file-input');
        const uploadFileBtn = overlay.querySelector('#notedis-upload-file-btn');
        const filePreview = overlay.querySelector('#notedis-file-preview');
        const fileName = overlay.querySelector('#notedis-file-name');
        const fileSize = overlay.querySelector('#notedis-file-size');
        const removeFileBtn = overlay.querySelector('#notedis-remove-file');
        const modalContent = overlay.querySelector('.notedis-modal-content');
        const dragOverlay = overlay.querySelector('#notedis-drag-overlay');

        uploadFileBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFileSelection(file);
            }
        });

        // Drag and drop functionality on entire modal
        let dragCounter = 0;

        modalContent.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (dragCounter === 1) {
                dragOverlay.style.display = 'flex';
            }
        });

        modalContent.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                dragOverlay.style.display = 'none';
            }
        });

        modalContent.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        modalContent.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            dragOverlay.style.display = 'none';

            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileSelection(file);
            }
        });

        removeFileBtn.addEventListener('click', () => {
            uploadedFile = null;
            fileInput.value = '';
            filePreview.style.display = 'none';
        });

        function handleFileSelection(file) {
            // Check file size (25MB limit)
            const maxSize = 25 * 1024 * 1024; // 25MB in bytes
            if (file.size > maxSize) {
                showToast('File size exceeds 25MB limit. Please choose a smaller image.', 'error');
                return;
            }

            // Validate file type (images only)
            if (!file.type.startsWith('image/')) {
                showToast('Please upload an image file (PNG, JPG, GIF, WebP).', 'error');
                return;
            }

            uploadedFile = file;

            // Format file size
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            const sizeInKB = (file.size / 1024).toFixed(2);
            const displaySize = file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;

            // Update preview
            fileName.textContent = file.name;
            fileSize.textContent = displaySize;

            // Show preview
            filePreview.style.display = 'block';

            // Show success toast
            showToast(`File uploaded: ${file.name}`, 'success');
        }

        // Handle radio button selection states for category
        const categoryOptions = overlay.querySelectorAll('input[name="category"]');
        categoryOptions.forEach(radio => {
            radio.addEventListener('change', () => {
                // Reset all options
                categoryOptions.forEach(r => {
                    const div = r.parentElement.querySelector('.category-option');
                    if (r.checked) {
                        div.style.borderColor = '#3b82f6';
                        div.style.backgroundColor = '#eff6ff';
                        div.style.color = '#111827';
                        div.style.fontWeight = '500';
                    } else {
                        div.style.borderColor = '#e5e7eb';
                        div.style.backgroundColor = 'white';
                        div.style.color = '#6b7280';
                        div.style.fontWeight = 'normal';
                    }
                });
            });
        });

        // Handle radio button selection states for priority
        const priorityOptions = overlay.querySelectorAll('input[name="priority"]');
        priorityOptions.forEach(radio => {
            radio.addEventListener('change', () => {
                // Reset all options
                priorityOptions.forEach(r => {
                    const div = r.nextElementSibling;
                    if (r.checked) {
                        if (r.value === 'low') {
                            div.style.borderColor = '#10b981';
                            div.style.backgroundColor = '#f0fdf4';
                        } else if (r.value === 'medium') {
                            div.style.borderColor = '#3b82f6';
                            div.style.backgroundColor = '#eff6ff';
                        } else if (r.value === 'high') {
                            div.style.borderColor = '#f59e0b';
                            div.style.backgroundColor = '#fef3c7';
                        } else if (r.value === 'urgent') {
                            div.style.borderColor = '#ef4444';
                            div.style.backgroundColor = '#fee2e2';
                        }
                        div.style.color = '#111827';
                        div.style.fontWeight = '500';
                    } else {
                        div.style.borderColor = '#e5e7eb';
                        div.style.backgroundColor = 'white';
                        div.style.color = '#6b7280';
                        div.style.fontWeight = 'normal';
                    }
                });
            });
        });

        // Handle character counter for message field
        const messageField = overlay.querySelector('textarea[name="message"]');
        const charCounter = messageField.parentElement.querySelector('div[style*="position: absolute"]');
        messageField.addEventListener('input', () => {
            const count = messageField.value.length;
            charCounter.textContent = `${count}/500`;
            if (count > 500) {
                charCounter.style.color = '#ef4444';
            } else {
                charCounter.style.color = '#9ca3af';
            }
        });

        // Focus first input
        setTimeout(() => {
            const firstCategory = overlay.querySelector('input[name="category"]');
            if (firstCategory) {
                firstCategory.focus();
            }
        }, 100);
    }

    function closeFeedbackModal() {
        if (overlay) {
            document.body.removeChild(overlay);
            overlay = null;
        }
        isOpen = false;
        screenshotData = null;
    }

    async function takeScreenshotSafe() {
        console.log('Starting screenshot capture with native Screen Capture API...');

        // Use native Screen Capture API only
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            throw new Error('Screen Capture API not supported. Please use the file upload option instead.');
        }

        try {
            console.log('Requesting screen capture permission...');
            const stream = await navigator.mediaDevices.getDisplayMedia({
                preferCurrentTab: true,
                selfBrowserSurface: "include",
                video: {
                    mediaSource: 'screen',
                    width: { ideal: 4096 },
                    height: { ideal: 2160 }
                }
            });

            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            return new Promise((resolve, reject) => {
                video.onloadedmetadata = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0);

                    // Stop the stream
                    stream.getTracks().forEach(track => track.stop());

                    console.log('Screenshot captured successfully');
                    resolve(canvas);
                };

                video.onerror = () => {
                    stream.getTracks().forEach(track => track.stop());
                    reject(new Error('Failed to load video stream'));
                };
            });
        } catch (error) {
            console.log('Screen Capture API failed:', error.message);

            // Provide user-friendly error messages
            if (error.name === 'NotAllowedError') {
                throw new Error('Screenshot permission denied. Please grant permission or upload a screenshot manually.');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('Screen capture is not supported on this device. Please upload a screenshot manually.');
            } else if (error.message && error.message.includes('cancelled')) {
                throw new Error('Screenshot capture cancelled. You can upload a screenshot manually if needed.');
            }

            throw error;
        }
    }


    async function takeScreenshot() {
        try {
            const takeScreenshotBtn = overlay.querySelector('#notedis-take-screenshot');
            takeScreenshotBtn.textContent = '📷 Capturing...';
            takeScreenshotBtn.disabled = true;

            // Always hide the modal completely for clean screenshot
            overlay.style.display = 'none';

            // Wait for DOM to update and any animations to complete
            await new Promise(resolve => setTimeout(resolve, 300));

            // Use the safe screenshot method that handles OKLCH
            const canvas = await takeScreenshotSafe();

            // Show modal again
            overlay.style.display = 'flex';

            // Store screenshot data with annotation support
            screenshotData = {
                canvas: canvas,
                originalDataUrl: canvas.toDataURL('image/png'),
                annotations: [],
                width: canvas.width,
                height: canvas.height
            };

            // Initialize annotation history
            annotationHistory = [];

            // Show preview
            const thumbnail = overlay.querySelector('#notedis-screenshot-thumbnail');
            const preview = overlay.querySelector('#notedis-screenshot-preview');
            thumbnail.style.backgroundImage = `url(${screenshotData.originalDataUrl})`;
            preview.style.display = 'block';

            // Reset button
            takeScreenshotBtn.textContent = '📷 Retake Screenshot';
            takeScreenshotBtn.disabled = false;

            // Show success toast
            showToast('Screenshot captured! Click the preview to add annotations.', 'success');

            // Automatically open annotation editor after taking screenshot
            openAnnotationEditor();
        } catch (error) {
            console.error('Screenshot failed:', error);
            overlay.style.display = 'flex';

            const takeScreenshotBtn = overlay.querySelector('#notedis-take-screenshot');

            // If button doesn't exist (mobile), just return
            if (!takeScreenshotBtn) {
                return;
            }

            // If user cancelled, just reset button silently
            if (error.name === 'NotAllowedError' || error.message.includes('denied') || error.message.includes('cancelled')) {
                takeScreenshotBtn.textContent = '📷 Take Screenshot';
                takeScreenshotBtn.disabled = false;

                // Show toast notification at top right
                showToast('Screenshot cancelled. You can upload a screenshot manually using the file upload option below.');
                return;
            }

            // Provide helpful error messages based on error type
            let errorMessage = 'Screenshot failed. Please try again or upload manually.';

            if (error.name === 'NotSupportedError') {
                errorMessage = 'Screen capture is not supported on this browser. Please upload a screenshot manually.';
            } else if (error.message && error.message.includes('Screen Capture API not supported')) {
                errorMessage = 'Screen capture is not supported on this device. Please upload a screenshot manually.';
            }

            showToast(errorMessage, 'error');

            takeScreenshotBtn.textContent = '📷 Take Screenshot';
            takeScreenshotBtn.disabled = false;
        }
    }

    // localStorage functions for annotation sizes
    function loadAnnotationSizes() {
        try {
            const saved = localStorage.getItem('notedis_annotation_sizes');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Could not load annotation sizes from localStorage:', e);
        }
        // Return defaults if nothing saved
        return {
            arrow: 'large',
            text: '32'
        };
    }

    function saveAnnotationSize(tool, size) {
        try {
            const sizes = loadAnnotationSizes();
            sizes[tool] = size;
            localStorage.setItem('notedis_annotation_sizes', JSON.stringify(sizes));
        } catch (e) {
            console.warn('Could not save annotation size to localStorage:', e);
        }
    }

    function openAnnotationEditor() {
        if (!screenshotData) return;

        // Create annotation editor overlay
        const annotationOverlay = document.createElement('div');
        annotationOverlay.id = 'notedis-annotation-editor';
        annotationOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            z-index: 10001;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const maxWidth = Math.min(window.innerWidth - 40, screenshotData.canvas.width);
        const maxHeight = window.innerHeight - 120;
        const scale = Math.min(maxWidth / screenshotData.canvas.width, maxHeight / screenshotData.canvas.height);

        annotationOverlay.innerHTML = `
            <!-- Floating Widget Bar -->
            <div id="notedis-floating-toolbar" style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 25px;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 10002;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <!-- Tool Buttons with SVG Icons -->
                <div style="display: flex; gap: 4px; padding-right: 12px; border-right: 1px solid rgba(255, 255, 255, 0.2);">
                    <button id="notedis-tool-arrow" class="notedis-tool-btn active" data-tool="arrow" title="Arrow (1)" style="
                        background: #007cba;
                        border: none;
                        border-radius: 12px;
                        width: 40px;
                        height: 40px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7,7 17,7 17,17"></polyline>
                        </svg>
                    </button>

                    <button id="notedis-tool-text" class="notedis-tool-btn" data-tool="text" title="Text Box - Draw bounds then type (Ctrl+Enter to finish) (2)" style="
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        border-radius: 12px;
                        width: 40px;
                        height: 40px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <polyline points="4,7 4,4 20,4 20,7"></polyline>
                            <line x1="9" y1="20" x2="15" y2="20"></line>
                            <line x1="12" y1="4" x2="12" y2="20"></line>
                        </svg>
                    </button>

                    <button id="notedis-tool-highlight" class="notedis-tool-btn" data-tool="highlight" title="Highlight (3)" style="
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        border-radius: 12px;
                        width: 40px;
                        height: 40px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="m9 11-6 6v3h3l6-6"></path>
                            <path d="m22 12-4.5 4.5a2.5 2.5 0 0 1-3.5 0l-.5-.5a2.5 2.5 0 0 1 0-3.5L18 8"></path>
                            <path d="m15 5 4 4"></path>
                        </svg>
                    </button>

                    <button id="notedis-tool-rectangle" class="notedis-tool-btn" data-tool="rectangle" title="Rectangle (4)" style="
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        border-radius: 12px;
                        width: 40px;
                        height: 40px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        </svg>
                    </button>

                    <button id="notedis-tool-circle" class="notedis-tool-btn" data-tool="circle" title="Circle (5)" style="
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        border-radius: 12px;
                        width: 40px;
                        height: 40px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                    </button>
                </div>

                <!-- Size Controls -->
                <div id="notedis-arrow-controls" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2">
                        <path d="M12 19.5v-15M5.5 12l6.5 6.5L18.5 12"></path>
                    </svg>
                    <select id="notedis-arrow-size" style="
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        padding: 6px 10px;
                        font-size: 12px;
                        min-width: 80px;
                        cursor: pointer;
                    ">
                        <option value="xs" style="background: #333; color: white;">X-Small</option>
                        <option value="small" style="background: #333; color: white;">Small</option>
                        <option value="medium" style="background: #333; color: white;">Medium</option>
                        <option value="large" selected style="background: #333; color: white;">Large</option>
                        <option value="xl" style="background: #333; color: white;">X-Large</option>
                    </select>
                </div>

                <div id="notedis-text-controls" style="display: none; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2">
                        <polyline points="4,7 4,4 20,4 20,7"></polyline>
                        <line x1="9" y1="20" x2="15" y2="20"></line>
                        <line x1="12" y1="4" x2="12" y2="20"></line>
                    </svg>
                    <select id="notedis-text-size" style="
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        padding: 6px 10px;
                        font-size: 12px;
                        min-width: 80px;
                        cursor: pointer;
                    ">
                        <option value="16" style="background: #333; color: white;">Small</option>
                        <option value="24" style="background: #333; color: white;">Medium</option>
                        <option value="32" selected style="background: #333; color: white;">Large</option>
                        <option value="48" style="background: #333; color: white;">X-Large</option>
                        <option value="64" style="background: #333; color: white;">XX-Large</option>
                    </select>
                </div>

                <!-- Color Picker -->
                <div style="display: flex; align-items: center; gap: 8px; padding-left: 12px; border-left: 1px solid rgba(255, 255, 255, 0.2);">
                    <svg width="17" height="15" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M14.4493 4.61314C14.3802 4.49843 14.3098 4.38324 14.2325 4.26754C13.8572 3.70439 13.3904 3.13357 12.8397 2.58308C12.109 1.85246 11.3353 1.26132 10.597 0.847524C10.2266 0.642176 9.86386 0.47715 9.51629 0.363186C9.16869 0.251416 8.83125 0.185547 8.50916 0.185547C8.29856 0.185547 8.09295 0.213288 7.89522 0.281898C7.69974 0.347799 7.51194 0.459537 7.35982 0.611661L6.56055 1.41092L6.13841 1.8331L5.50091 2.47079L5.07154 2.90013L3.57707 4.39434L2.25528 5.71616L1.52466 6.44678C1.3267 6.64474 1.18722 6.8858 1.09851 7.14695C1.00955 7.40836 0.97168 7.68484 0.97168 7.9767C0.97168 8.64884 1.17706 9.38717 1.54498 10.1381C1.91291 10.8891 2.44805 11.6477 3.13828 12.3377C3.82058 13.0203 4.5641 13.5455 5.29969 13.9057C6.03554 14.266 6.76096 14.4612 7.42317 14.4639C7.71751 14.4639 8.0017 14.4233 8.26553 14.3318C8.52939 14.2431 8.77541 14.0985 8.97582 13.898L13.5232 9.36333C13.5212 9.47087 13.5202 9.56055 13.5202 9.63413C13.5202 9.67093 13.52 9.70969 13.5197 9.75001C13.5157 10.34 13.5095 11.2638 14.2873 11.2638C14.514 11.2638 14.8626 11.1041 14.8626 10.3053C14.8626 9.81399 15.3739 9.9815 15.3739 10.2731V11.1358C15.3739 12.0307 15.6616 12.3505 16.141 12.3505C16.6204 12.3505 16.9717 11.9989 16.9717 11.168V7.42885C16.9717 6.41556 15.8893 5.08041 14.4493 4.61314ZM3.22202 6.18541L2.24267 7.16476C2.16661 7.24082 2.10567 7.33995 2.06009 7.4742C2.01422 7.60874 1.98648 7.77622 1.98648 7.97667C1.98403 8.43849 2.13861 9.04969 2.45573 9.69164C2.77039 10.3336 3.24238 11.0085 3.85358 11.6199C4.46008 12.2237 5.1196 12.688 5.74619 12.9949C6.37301 13.3019 6.96912 13.4515 7.42323 13.4491C7.62613 13.4491 7.79883 13.4211 7.93583 13.3727C8.07534 13.3247 8.1794 13.2613 8.25795 13.18L8.22995 13.2105L13.1456 8.30759C12.6739 8.21543 12.1677 8.01054 11.6385 7.71597C10.9113 7.3084 10.1465 6.72616 9.42207 6.00199C8.6979 5.27753 8.1154 4.51275 7.70813 3.78558C7.41578 3.26012 7.21211 2.75717 7.11895 2.28841L4.57923 4.82816L3.22202 6.18541ZM10.5019 5.96983C10.32 5.81103 10.1387 5.64255 9.96027 5.46391C9.28169 4.78529 8.73909 4.06954 8.37243 3.41376C8.00376 2.75991 7.81922 2.16087 7.82219 1.75998C7.82219 1.68937 7.82838 1.62695 7.8378 1.56973L8.07789 1.32964C8.11605 1.29422 8.15914 1.26377 8.2275 1.24093C8.29614 1.21541 8.39004 1.20032 8.50923 1.20032C8.6918 1.20032 8.93037 1.23822 9.20169 1.32964C9.61022 1.4617 10.0924 1.70249 10.5945 2.035C11.097 2.3697 11.6195 2.79859 12.1219 3.30102C12.5023 3.6801 12.8372 4.07106 13.1229 4.45608C12.2537 4.53114 11.3407 4.97038 10.5019 5.96983Z" fill="white" fill-opacity="0.7"/>
                    </svg>

                    <select id="notedis-color-picker" style="
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        padding: 6px 10px;
                        font-size: 12px;
                        min-width: 70px;
                        cursor: pointer;
                    ">
                        <option value="#ff0000" selected style="background: #333; color: white;">🔴 Red</option>
                        <option value="#00ff00" style="background: #333; color: white;">🟢 Green</option>
                        <option value="#0000ff" style="background: #333; color: white;">🔵 Blue</option>
                        <option value="#ffff00" style="background: #333; color: white;">🟡 Yellow</option>
                        <option value="#ff00ff" style="background: #333; color: white;">🟣 Purple</option>
                        <option value="#000000" style="background: #333; color: white;">⚫ Black</option>
                        <option value="#ffffff" style="background: #333; color: white;">⚪ White</option>
                    </select>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 4px; padding-left: 12px; border-left: 1px solid rgba(255, 255, 255, 0.2);">
                    <button id="notedis-undo-annotation" title="Undo (Ctrl+Z)" style="
                        background: rgba(255, 152, 0, 0.8);
                        border: none;
                        border-radius: 10px;
                        width: 36px;
                        height: 36px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    ">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <polyline points="1,4 1,10 7,10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                    </button>

                    <button id="notedis-clear-annotations" title="Clear All" style="
                        background: rgba(244, 67, 54, 0.8);
                        border: none;
                        border-radius: 10px;
                        width: 36px;
                        height: 36px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    ">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"></path>
                        </svg>
                    </button>

                    <button id="notedis-close-annotation" title="Done (Esc)" style="
                        background: rgba(76, 175, 80, 0.8);
                        border: none;
                        border-radius: 10px;
                        width: 36px;
                        height: 36px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    ">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
            <div style="
                flex: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
                overflow: auto;
            ">
                <div id="notedis-canvas-container" style="
                    position: relative;
                    border: 2px solid #374151;
                ">
                    <canvas id="notedis-annotation-canvas"
                        width="${screenshotData.canvas.width}"
                        height="${screenshotData.canvas.height}"
                        style="
                            width: ${screenshotData.canvas.width * scale}px;
                            height: ${screenshotData.canvas.height * scale}px;
                            cursor: crosshair;
                            display: block;
                        "
                    ></canvas>
                </div>
            </div>
        `;

        document.body.appendChild(annotationOverlay);

        // Initialize annotation canvas
        initAnnotationCanvas();

        // Load saved annotation sizes from localStorage
        const savedSizes = loadAnnotationSizes();
        const arrowSizeSelect = annotationOverlay.querySelector('#notedis-arrow-size');
        const textSizeSelect = annotationOverlay.querySelector('#notedis-text-size');

        if (arrowSizeSelect && savedSizes.arrow) {
            arrowSizeSelect.value = savedSizes.arrow;
        }
        if (textSizeSelect && savedSizes.text) {
            textSizeSelect.value = savedSizes.text;
        }

        // Save size preferences when changed
        if (arrowSizeSelect) {
            arrowSizeSelect.addEventListener('change', () => {
                saveAnnotationSize('arrow', arrowSizeSelect.value);
            });
        }
        if (textSizeSelect) {
            textSizeSelect.addEventListener('change', () => {
                saveAnnotationSize('text', textSizeSelect.value);
            });
        }

        // Add event listeners

        // Tool button event listeners
        annotationOverlay.querySelectorAll('.notedis-tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clickedButton = e.currentTarget;

                // Update active states with floating widget styling
                annotationOverlay.querySelectorAll('.notedis-tool-btn').forEach(b => {
                    b.style.background = 'rgba(255, 255, 255, 0.1)';
                    b.classList.remove('active');
                });
                clickedButton.style.background = '#007cba';
                clickedButton.classList.add('active');

                // Show/hide relevant controls based on selected tool
                const selectedTool = clickedButton.dataset.tool;
                const arrowControls = annotationOverlay.querySelector('#notedis-arrow-controls');
                const textControls = annotationOverlay.querySelector('#notedis-text-controls');

                if (selectedTool === 'arrow' || selectedTool === 'rectangle' || selectedTool === 'circle') {
                    arrowControls.style.display = 'flex';
                    textControls.style.display = 'none';
                } else if (selectedTool === 'text') {
                    arrowControls.style.display = 'none';
                    textControls.style.display = 'flex';
                } else {
                    arrowControls.style.display = 'none';
                    textControls.style.display = 'none';
                }
            });

            // Add hover effects for the floating buttons
            btn.addEventListener('mouseenter', (e) => {
                if (!e.target.classList.contains('active')) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.transform = 'scale(1.05)';
                }
            });

            btn.addEventListener('mouseleave', (e) => {
                if (!e.target.classList.contains('active')) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.transform = 'scale(1)';
                }
            });
        });

        // Action button event listeners with hover effects
        const undoBtn = annotationOverlay.querySelector('#notedis-undo-annotation');
        const clearBtn = annotationOverlay.querySelector('#notedis-clear-annotations');
        const closeBtn = annotationOverlay.querySelector('#notedis-close-annotation');

        undoBtn.addEventListener('click', undoLastAnnotation);
        clearBtn.addEventListener('click', clearAnnotations);
        closeBtn.addEventListener('click', closeAnnotationEditor);

        // Add hover effects for action buttons
        [undoBtn, clearBtn, closeBtn].forEach(btn => {
            btn.addEventListener('mouseenter', (e) => {
                e.target.style.transform = 'scale(1.1)';
                e.target.style.filter = 'brightness(1.1)';
            });

            btn.addEventListener('mouseleave', (e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.filter = 'brightness(1)';
            });
        });

        // Add keyboard shortcuts
        const handleKeyboard = (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        undoLastAnnotation();
                        break;
                    case 'enter':
                        e.preventDefault();
                        closeAnnotationEditor();
                        break;
                }
            } else {
                switch(e.key) {
                    case '1':
                        annotationOverlay.querySelector('#notedis-tool-arrow').click();
                        break;
                    case '2':
                        annotationOverlay.querySelector('#notedis-tool-text').click();
                        break;
                    case '3':
                        annotationOverlay.querySelector('#notedis-tool-highlight').click();
                        break;
                    case '4':
                        annotationOverlay.querySelector('#notedis-tool-rectangle').click();
                        break;
                    case '5':
                        annotationOverlay.querySelector('#notedis-tool-circle').click();
                        break;
                    case 'Escape':
                        closeAnnotationEditor();
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyboard);

        // Clean up keyboard listener when editor is closed
        const originalCloseEditor = closeAnnotationEditor;
        window.closeAnnotationEditor = function() {
            document.removeEventListener('keydown', handleKeyboard);
            originalCloseEditor();
        };
    }

    function initAnnotationCanvas() {
        const canvas = document.getElementById('notedis-annotation-canvas');
        const ctx = canvas.getContext('2d');

        // Draw the original screenshot
        ctx.drawImage(screenshotData.canvas, 0, 0);

        // Redraw existing annotations
        redrawAnnotations(ctx);

        let isDrawing = false;
        let startX = 0;
        let startY = 0;
        let currentAnnotation = null;

        // Get canvas scale for coordinate conversion
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        canvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            const clientRect = canvas.getBoundingClientRect();
            startX = (e.clientX - clientRect.left) * scaleX;
            startY = (e.clientY - clientRect.top) * scaleY;

            const activeButton = document.querySelector('.notedis-tool-btn.active');
            if (!activeButton) return;
            const activeTool = activeButton.dataset.tool;

            if (activeTool === 'text') {
                // Text tool: user draws a rectangle first, then types in it
                const colorPicker = document.getElementById('notedis-color-picker');
                let color = colorPicker ? colorPicker.value : '#dc2626';

                currentAnnotation = {
                    type: 'text-box-drawing',
                    startX: startX,
                    startY: startY,
                    endX: startX,
                    endY: startY,
                    color: color
                };
            } else {
                const colorPicker = document.getElementById('notedis-color-picker');
                const arrowSizePicker = document.getElementById('notedis-arrow-size');
                let color = colorPicker ? colorPicker.value : '#dc2626';

                // For highlights, add transparency to the selected color
                if (activeTool === 'highlight') {
                    // Convert hex to rgba with 0.3 opacity
                    const hex = color.replace('#', '');
                    const r = parseInt(hex.substr(0, 2), 16);
                    const g = parseInt(hex.substr(2, 2), 16);
                    const b = parseInt(hex.substr(4, 2), 16);
                    color = `rgba(${r}, ${g}, ${b}, 0.3)`;
                }

                currentAnnotation = {
                    type: activeTool,
                    startX: startX,
                    startY: startY,
                    endX: startX,
                    endY: startY,
                    color: color,
                    arrowSize: arrowSizePicker ? arrowSizePicker.value : 'medium'
                };
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDrawing || !currentAnnotation) return;

            const clientRect = canvas.getBoundingClientRect();
            currentAnnotation.endX = (e.clientX - clientRect.left) * scaleX;
            currentAnnotation.endY = (e.clientY - clientRect.top) * scaleY;

            // Redraw with current annotation preview
            redrawCanvas();
            drawAnnotation(ctx, currentAnnotation);
        });

        canvas.addEventListener('mouseup', (e) => {
            if (isDrawing && currentAnnotation) {
                // Special handling for text-box-drawing
                if (currentAnnotation.type === 'text-box-drawing') {
                    const clientRect = canvas.getBoundingClientRect();
                    // Create text input within the drawn bounds
                    createTextBoxInBounds(
                        currentAnnotation.startX,
                        currentAnnotation.startY,
                        currentAnnotation.endX,
                        currentAnnotation.endY,
                        currentAnnotation.color,
                        clientRect,
                        scaleX,
                        scaleY
                    );
                    currentAnnotation = null;
                } else {
                    screenshotData.annotations.push(currentAnnotation);
                    saveAnnotationState();
                    currentAnnotation = null;
                }
            }
            isDrawing = false;
        });

        function redrawCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(screenshotData.canvas, 0, 0);
            redrawAnnotations(ctx);
        }
    }

    function redrawAnnotations(ctx) {
        screenshotData.annotations.forEach(annotation => {
            drawAnnotation(ctx, annotation);
        });
    }

    function drawAnnotation(ctx, annotation) {
        ctx.save();

        if (annotation.type === 'arrow') {
            drawArrow(ctx, annotation.startX, annotation.startY, annotation.endX, annotation.endY, annotation.color, annotation.arrowSize);
        } else if (annotation.type === 'text-box-drawing') {
            // Show rectangle preview while drawing text box bounds
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Dashed line
            ctx.strokeRect(
                Math.min(annotation.startX, annotation.endX),
                Math.min(annotation.startY, annotation.endY),
                Math.abs(annotation.endX - annotation.startX),
                Math.abs(annotation.endY - annotation.startY)
            );
            ctx.setLineDash([]); // Reset dash
        } else if (annotation.type === 'text') {
            // Enable high-quality text rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Use system font stack for better quality
            ctx.font = `600 ${annotation.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
            ctx.textBaseline = 'top';

            const padding = 8;
            const lineHeight = annotation.fontSize * 1.3;
            const maxWidth = annotation.width - (padding * 2);

            // Split by newlines first (from Enter key), then wrap each paragraph
            const paragraphs = annotation.text.split('\n');
            const lines = [];

            paragraphs.forEach(paragraph => {
                if (!paragraph.trim()) {
                    lines.push(''); // Preserve empty lines
                    return;
                }

                const words = paragraph.split(/\s+/);
                let currentLine = '';

                for (const word of words) {
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    const metrics = ctx.measureText(testLine);

                    if (metrics.width > maxWidth && currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine) {
                    lines.push(currentLine);
                }
            });

            // Draw text lines without background or border
            ctx.fillStyle = annotation.color;
            lines.forEach((line, index) => {
                const y = annotation.y + padding + (index * lineHeight);
                ctx.fillText(line, annotation.x + padding, y);
            });
        } else if (annotation.type === 'highlight') {
            ctx.fillStyle = annotation.color;
            ctx.fillRect(
                Math.min(annotation.startX, annotation.endX),
                Math.min(annotation.startY, annotation.endY),
                Math.abs(annotation.endX - annotation.startX),
                Math.abs(annotation.endY - annotation.startY)
            );
        } else if (annotation.type === 'rectangle') {
            ctx.strokeStyle = annotation.color;
            // Use same size config as arrows
            const sizeConfig = {
                xs: 1, small: 2, medium: 3, large: 4, xl: 6
            };
            ctx.lineWidth = sizeConfig[annotation.arrowSize] || sizeConfig.large;
            ctx.strokeRect(
                Math.min(annotation.startX, annotation.endX),
                Math.min(annotation.startY, annotation.endY),
                Math.abs(annotation.endX - annotation.startX),
                Math.abs(annotation.endY - annotation.startY)
            );
        } else if (annotation.type === 'circle') {
            const centerX = (annotation.startX + annotation.endX) / 2;
            const centerY = (annotation.startY + annotation.endY) / 2;
            const radius = Math.sqrt(
                Math.pow(annotation.endX - annotation.startX, 2) +
                Math.pow(annotation.endY - annotation.startY, 2)
            ) / 2;

            ctx.strokeStyle = annotation.color;
            // Use same size config as arrows
            const sizeConfig = {
                xs: 1, small: 2, medium: 3, large: 4, xl: 6
            };
            ctx.lineWidth = sizeConfig[annotation.arrowSize] || sizeConfig.large;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawArrow(ctx, fromX, fromY, toX, toY, color, size = 'large') {
        // Define size configurations with 5 options
        const sizeConfig = {
            xs: { headlen: 8, lineWidth: 1 },
            small: { headlen: 12, lineWidth: 2 },
            medium: { headlen: 18, lineWidth: 4 },
            large: { headlen: 25, lineWidth: 6 },
            xl: { headlen: 35, lineWidth: 8 }
        };

        const config = sizeConfig[size] || sizeConfig.large;
        const headlen = config.headlen;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        ctx.strokeStyle = color;
        ctx.lineWidth = config.lineWidth;
        ctx.lineCap = 'round';

        // Draw line
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Draw arrowhead
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }

    function createTextBoxInBounds(startX, startY, endX, endY, color, clientRect, scaleX, scaleY) {
        // Get current settings
        const textSizePicker = document.getElementById('notedis-text-size');
        const fontSize = textSizePicker ? parseInt(textSizePicker.value) : 24;

        // Normalize coordinates
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        // Don't create text box if bounds are too small
        if (width < 30 || height < 20) {
            return;
        }

        // Remove any existing text input and checkmark
        const existingInput = document.getElementById('notedis-text-input');
        if (existingInput) {
            existingInput.remove();
        }
        const existingCheckmark = document.getElementById('notedis-text-checkmark');
        if (existingCheckmark) {
            existingCheckmark.remove();
        }

        // Convert canvas coordinates to screen coordinates
        const screenX = (x / scaleX) + clientRect.left;
        const screenY = (y / scaleY) + clientRect.top;
        const screenWidth = width / scaleX;
        const screenHeight = height / scaleY;

        // Create text input element
        const textInput = document.createElement('div');
        textInput.id = 'notedis-text-input';
        textInput.contentEditable = true;
        textInput.style.cssText = `
            position: fixed;
            left: ${screenX}px;
            top: ${screenY}px;
            width: ${screenWidth}px;
            min-height: ${screenHeight}px;
            max-height: none;
            padding: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: ${fontSize / scaleX}px;
            font-weight: 600;
            line-height: 1.3;
            color: ${color};
            background: transparent;
            border: 2px dashed ${color};
            border-radius: 4px;
            outline: none;
            z-index: 2147483648;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-wrap: break-word;
            overflow-y: auto;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            box-sizing: border-box;
        `;
        textInput.setAttribute('placeholder', 'Type text...');

        // Create checkmark button to finalize
        const checkmarkButton = document.createElement('button');
        checkmarkButton.id = 'notedis-text-checkmark';
        checkmarkButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        checkmarkButton.style.cssText = `
            position: fixed;
            left: ${screenX + screenWidth - 18}px;
            top: ${screenY - 18}px;
            width: 36px;
            height: 36px;
            padding: 0;
            background: #10B981;
            border: 2px solid white;
            border-radius: 50%;
            cursor: pointer;
            z-index: 2147483649;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.1s ease;
        `;
        checkmarkButton.title = 'Finalize text (Ctrl+Enter)';

        // Hover effect
        checkmarkButton.addEventListener('mouseenter', () => {
            checkmarkButton.style.transform = 'scale(1.1)';
        });
        checkmarkButton.addEventListener('mouseleave', () => {
            checkmarkButton.style.transform = 'scale(1)';
        });

        document.body.appendChild(textInput);
        document.body.appendChild(checkmarkButton);

        // Flag to prevent premature blur
        let isReady = false;

        // Wait a moment before enabling blur handler
        setTimeout(() => {
            isReady = true;
            textInput.focus();
        }, 100);

        // Function to finalize text input
        const finalizeText = () => {
            if (!isReady) return; // Don't finalize if not ready yet

            const text = textInput.innerText.trim();
            if (text) {
                // Calculate the actual height needed for the wrapped text
                const padding = 8;
                const lineHeight = fontSize * 1.3;

                // Create temporary canvas to measure text
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;

                const maxWidth = width - (padding * 2);
                const paragraphs = text.split('\n');
                let lineCount = 0;

                paragraphs.forEach(paragraph => {
                    if (!paragraph.trim()) {
                        lineCount++;
                        return;
                    }

                    const words = paragraph.split(/\s+/);
                    let currentLine = '';

                    for (const word of words) {
                        const testLine = currentLine ? currentLine + ' ' + word : word;
                        const metrics = tempCtx.measureText(testLine);

                        if (metrics.width > maxWidth && currentLine) {
                            lineCount++;
                            currentLine = word;
                        } else {
                            currentLine = testLine;
                        }
                    }
                    if (currentLine) {
                        lineCount++;
                    }
                });

                // Calculate actual height needed
                const actualHeight = Math.max(height, (lineCount * lineHeight) + (padding * 2));

                const annotation = {
                    type: 'text',
                    x: x,
                    y: y,
                    width: width,
                    height: actualHeight,
                    text: text,
                    color: color,
                    fontSize: fontSize
                };
                screenshotData.annotations.push(annotation);
                saveAnnotationState();

                // Redraw canvas with new annotation
                const canvas = document.getElementById('notedis-annotation-canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(screenshotData.canvas, 0, 0);
                    redrawAnnotations(ctx);
                }
            }
            textInput.remove();
            checkmarkButton.remove();
        };

        // Checkmark button click handler
        checkmarkButton.addEventListener('click', (e) => {
            e.stopPropagation();
            isReady = true;
            finalizeText();
        });

        // Handle Enter key to finish (Ctrl+Enter or Cmd+Enter)
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                isReady = true;
                finalizeText();
            } else if (e.key === 'Escape') {
                textInput.remove();
                checkmarkButton.remove();
            }
        });

        // Finalize on blur (clicking outside)
        textInput.addEventListener('blur', () => {
            if (isReady) {
                setTimeout(finalizeText, 100);
            }
        });
    }

    function clearAnnotations() {
        if (confirm('Clear all annotations?')) {
            screenshotData.annotations = [];
            annotationHistory = []; // Clear history when clearing all annotations
            const canvas = document.getElementById('notedis-annotation-canvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(screenshotData.canvas, 0, 0);
        }
    }

    function saveAnnotationState() {
        // Save current state to history (keep last 20 states to prevent memory issues)
        annotationHistory.push([...screenshotData.annotations]);
        if (annotationHistory.length > 20) {
            annotationHistory.shift();
        }
    }

    function undoLastAnnotation() {
        if (screenshotData.annotations.length > 0) {
            // Remove the last annotation
            screenshotData.annotations.pop();

            // Redraw canvas
            const canvas = document.getElementById('notedis-annotation-canvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(screenshotData.canvas, 0, 0);
            redrawAnnotations(ctx);
        }
    }

    function closeAnnotationEditor() {
        const annotationEditor = document.getElementById('notedis-annotation-editor');
        const canvas = document.getElementById('notedis-annotation-canvas');

        // Always create the final annotated screenshot before closing
        if (canvas && screenshotData) {
            // Create a final canvas with annotations
            const ctx = canvas.getContext('2d');

            // Clear and redraw everything to ensure we capture the final state
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(screenshotData.canvas, 0, 0);
            redrawAnnotations(ctx);

            // Capture the final annotated image
            screenshotData.annotatedDataUrl = canvas.toDataURL('image/png');

            // Update thumbnail to show the annotated version
            const thumbnail = overlay.querySelector('#notedis-screenshot-thumbnail');
            if (thumbnail) {
                thumbnail.style.backgroundImage = `url(${screenshotData.annotatedDataUrl})`;
            }
        }

        if (annotationEditor) {
            document.body.removeChild(annotationEditor);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const loadingEl = overlay.querySelector('#notedis-loading');
        const successEl = overlay.querySelector('#notedis-success');
        const errorEl = overlay.querySelector('#notedis-error');

        // Hide previous messages
        form.style.display = 'none';
        loadingEl.style.display = 'block';
        successEl.style.display = 'none';
        errorEl.style.display = 'none';

        try {
            // Include screenshot data if available
            let screenshotBase64 = null;
            if (screenshotData) {
                try {
                    // If no annotations were made, use original screenshot
                    let dataUrl = screenshotData.originalDataUrl;

                    // If there are annotations, ensure we have the annotated version
                    if (screenshotData.annotations && screenshotData.annotations.length > 0) {
                        // If annotatedDataUrl exists, use it
                        if (screenshotData.annotatedDataUrl) {
                            dataUrl = screenshotData.annotatedDataUrl;
                        } else {
                            // Create annotated version on-the-fly if needed
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = screenshotData.width;
                            tempCanvas.height = screenshotData.height;
                            const tempCtx = tempCanvas.getContext('2d');

                            // Draw original screenshot
                            tempCtx.drawImage(screenshotData.canvas, 0, 0);

                            // Draw annotations
                            screenshotData.annotations.forEach(annotation => {
                                drawAnnotation(tempCtx, annotation);
                            });

                            dataUrl = tempCanvas.toDataURL('image/png');
                        }
                    }

                    screenshotBase64 = dataUrl.split(',')[1]; // Remove data:image/png;base64, prefix
                } catch (err) {
                    console.warn('Screenshot processing failed:', err);
                }
            }

            // Convert uploaded file to base64 if present
            let uploadedFileBase64 = null;
            let uploadedFileName = null;
            let uploadedFileType = null;

            if (uploadedFile) {
                try {
                    const fileReader = new FileReader();
                    const filePromise = new Promise((resolve, reject) => {
                        fileReader.onload = (e) => resolve(e.target.result);
                        fileReader.onerror = reject;
                        fileReader.readAsDataURL(uploadedFile);
                    });

                    const fileDataUrl = await filePromise;
                    uploadedFileBase64 = fileDataUrl.split(',')[1]; // Remove data URL prefix
                    uploadedFileName = uploadedFile.name;
                    uploadedFileType = uploadedFile.type;
                } catch (err) {
                    console.warn('File upload processing failed:', err);
                }
            }

            // Prepare data with page context
            const data = {
                site_key: config.siteKey,
                title: formData.get('title'),
                category: formData.get('category'),
                priority: formData.get('priority'),
                message: formData.get('message'),
                email: formData.get('email') || null,
                url: pageContext ? pageContext.url : window.location.href,
                page_title: pageContext ? pageContext.title : document.title,
                viewport_width: pageContext ? pageContext.viewport.width : window.innerWidth,
                viewport_height: pageContext ? pageContext.viewport.height : window.innerHeight,
                user_agent: pageContext ? pageContext.userAgent : navigator.userAgent,
                browser_info: pageContext ? pageContext.browserInfo : null,
                timestamp: pageContext ? pageContext.timestamp : new Date().toISOString(),
                screenshot_requested: !!screenshotData,
                screenshot_base64: screenshotBase64,
                uploaded_file_base64: uploadedFileBase64,
                uploaded_file_name: uploadedFileName,
                uploaded_file_type: uploadedFileType
            };

            // Submit feedback
            const response = await fetch(`${config.apiUrl}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                loadingEl.style.display = 'none';
                successEl.style.display = 'block';

                // Show success toast
                showToast('Thank you! Your feedback has been submitted successfully.', 'success');

                // Auto-close after success
                setTimeout(() => {
                    closeFeedbackModal();
                }, 2000);
            } else {
                // Parse error response
                let errorData;
                try {
                    errorData = await response.json();
                    console.log('Error response data:', errorData);
                } catch (parseError) {
                    console.error('Failed to parse error response:', parseError);
                    throw new Error('Failed to submit feedback. Please try again later.');
                }

                // Handle structured error responses
                if (errorData.error_type === 'trial_expired' || errorData.error_type === 'limit_exceeded') {
                    console.log('Showing expired trial error UI');
                    loadingEl.style.display = 'none';

                    // Create special expired trial error message
                    showExpiredTrialError(errorData);
                    return;
                }

                throw new Error(errorData.message || 'Network response was not ok');
            }

        } catch (error) {
            console.error('Feedback submission error:', error);
            loadingEl.style.display = 'none';
            errorEl.style.display = 'block';

            // Show error toast
            const errorMessage = error.message || 'Failed to submit feedback. Please check your connection and try again.';
            showToast(errorMessage, 'error');

            // Show form again after error
            setTimeout(() => {
                form.style.display = 'block';
                errorEl.style.display = 'none';
            }, 3000);
        }
    }

    // Check if site is active before initializing
    async function checkSiteStatus() {
        try {
            const response = await fetch(`${config.apiUrl}/api/site/status?site_key=${config.siteKey}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                return data.active === true;
            }

            // If request fails, don't show widget
            return false;
        } catch (error) {
            console.error('Notedis: Failed to check site status:', error);
            // On error, don't show widget to be safe
            return false;
        }
    }

    // Initialize widget when DOM is ready
    async function init() {
        // Check if site is active before creating widget
        const isActive = await checkSiteStatus();

        if (!isActive) {
            console.log('Notedis: Widget disabled - site is inactive');
            return;
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createWidget);
        } else {
            createWidget();
        }
    }

    // Mark as loaded
    window.notedisWidget = {
        version: '1.0.0',
        config: config,
        open: openFeedbackModal,
        close: closeFeedbackModal
    };

    // Start initialization
    init();
})();
