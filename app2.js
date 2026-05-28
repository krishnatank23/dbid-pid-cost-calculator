/* ==========================================================================
   Wofi - Supply Chain Finance (SCF) Calculator Core Script
   (app2.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Platform State Object (Preconfigured for SCF/PID default page load)
    const state = {
        mode: 'pid',               // Default: 'pid' (SCF)
        loanAmount: 100000,        // Default ₹1,00,000
        loanDateStr: '2026-05-20', // YYYY-MM-DD
        tenureDays: 60,            // Default 60 days
        repaymentDateStr: '2026-07-10', // YYYY-MM-DD
        interestRateAnnual: 18.25, // Default 18.25% p.a. (corresponds to 0.05% per day)
        minLimit: 100000,          // 1 Lakh min
        maxLimit: 20000000,        // 2 Crore max for SCF
        isInclusiveDays: true      // (End - Start + 1)
    };

    // DOM Elements Cache
    const body = document.body;
    const loanAmountInput = document.getElementById('loan-amount');
    const loanAmountSlider = document.getElementById('loan-amount-slider');
    const loanDateInput = document.getElementById('loan-date');
    const loanTenureInput = document.getElementById('loan-tenure');
    const dueDateInputVal = document.getElementById('due-date-val');
    const repaymentDateInput = document.getElementById('repayment-date');
    const advancedSettingsToggle = document.getElementById('advanced-settings');
    const interestRateInput = document.getElementById('interest-rate');
    const dailyRateDisplay = document.getElementById('daily-rate-display');
    const inclusiveDaysCheckbox = document.getElementById('inclusive-days');


    // Outputs
    const totalToPayDisplay = document.getElementById('total-to-pay-display');
    const principalSubtext = document.getElementById('principal-subtext');
    const interestSubtext = document.getElementById('interest-subtext');
    const daysCountDisplay = document.getElementById('days-count-display');
    const interestToPayDisplay = document.getElementById('interest-to-pay-display');
    const ratioBarPrincipal = document.querySelector('.ratio-bar-fill.principal-fill');
    const ratioBarInterest = document.querySelector('.ratio-bar-fill.interest-fill');
    const ratioLabels = document.querySelector('.ratio-labels');

    // Timelines
    const timelineLoanDate = document.getElementById('timeline-loan-date');
    const timelineRepaymentDate = document.getElementById('timeline-repayment-date');
    const timelineDueDate = document.getElementById('timeline-due-date');
    const timelineElapsedDays = document.getElementById('timeline-elapsed-days');
    const timelineRepaymentStep = timelineRepaymentDate.closest('.timeline-step');

    // Formatted Dates Displays
    const loanDateFormatted = document.getElementById('loan-date-formatted');
    const dueDateFormatted = document.getElementById('due-date-formatted');
    const repaymentDateFormatted = document.getElementById('repayment-date-formatted');

    // Text Labels & Flow
    const proceedModeBadge = document.getElementById('proceed-mode-badge');
    const flowStructureLabel = document.getElementById('flow-structure-type-label');
    const flowStepsWrapper = document.getElementById('flow-steps-wrapper');
    const minLimitDisplay = document.getElementById('min-limit-display');
    const maxLimitDisplay = document.getElementById('max-limit-display');
    const amountValidationMsg = document.getElementById('amount-validation-msg');
    const tenureValidationMsg = document.getElementById('tenure-validation-msg');
    const repaymentValidationMsg = document.getElementById('repayment-validation-msg');
    const overdueBreakdownBox = document.getElementById('overdue-breakdown-box');

    // Modals
    const lockedPageModal = document.getElementById('locked-page-modal');
    const modalPageTitle = document.getElementById('modal-page-title');
    const toastContainer = document.getElementById('toast-container');


    // Current Time Setup (Dynamic System Time & Day)
    const initDate = new Date();
    document.getElementById('current-time-display').innerHTML = formatDateWithDay(initDate);

    /* ==========================================================================
       Operational Flow Configuration
       ========================================================================== */
    const flows = {
        dbid: [
            {
                number: '01',
                title: 'Retailer Sales Invoice',
                desc: 'Distributor delivers goods to retailer and provides their sale invoices to the Wofi system.'
            },
            {
                number: '02',
                title: 'Invoice Authenticated',
                desc: 'Wofi dynamically verifies the retailer sale invoices. No heavy collaterals required.'
            },
            {
                number: '03',
                title: 'Funds Disbursed',
                desc: 'Loan amount is disbursed directly to the Distributor within hours to clear working capital blocks.'
            },
            {
                number: '04',
                title: 'Distributor Settles Loan',
                desc: 'Distributor bears the interest (0.05%/day) and repays total dues on or before Due Date.'
            }
        ],
        pid: [
            {
                number: '01',
                title: 'Brand Purchase Invoice',
                desc: 'Retailer purchases brand stock and provides purchase invoices to the Wofi platform.'
            },
            {
                number: '02',
                title: 'Invoice Authenticated',
                desc: 'Wofi verifies the brand supply invoice details. Quick automated risk check completed.'
            },
            {
                number: '03',
                title: 'Funds Disbursed',
                desc: 'Loan amount is disbursed directly to the Retailer to purchase premium inventories immediately.'
            },
            {
                number: '04',
                title: 'Retailer Settles Loan',
                desc: 'Retailer bears the interest (0.05%/day) and repays total dues on or before Due Date.'
            }
        ]
    };

    /* ==========================================================================
       Formatters & Date Helpers
       ========================================================================== */
    function formatCurrency(num) {
        return '₹' + Math.round(num).toLocaleString('en-IN');
    }

    function parseInputNumber(str) {
        return parseFloat(str.replace(/,/g, '')) || 0;
    }

    // Standard date parsing (handles YYYY-MM-DD robustly with timezone correction)
    function parseUTCDate(dateStr) {
        const parts = dateStr.split('-');
        if (parts.length !== 3) return new Date();
        return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    }

    function formatDateShort(date) {
        const d = new Date(date);
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`; // DD/MM/YYYY format
    }

    function formatDateLong(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
    }

    function formatDateDDMMYYYY(date) {
        const d = new Date(date);
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}-${month}-${year}`; // DD-MM-YYYY format
    }

    function formatDateWithDay(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `<div class="date-display-wrapper">
                    <div class="date-display-first">${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}</div>
                    <div class="date-display-second">${days[date.getDay()]}</div>
                </div>`;
    }

    /* ==========================================================================
       Core Calculation Engine
       ========================================================================== */
    function runCalculations() {
        // 1. Validate Inputs first
        let hasErrors = false;

        // Amount check
        if (state.loanAmount < state.minLimit) {
            amountValidationMsg.textContent = `Minimum limit is ₹${state.minLimit.toLocaleString('en-IN')}`;
            loanAmountInput.parentElement.classList.add('error');
            hasErrors = true;
        } else if (state.loanAmount > state.maxLimit) {
            let limitName = '5 Lakh';
            if (state.maxLimit === 20000000) limitName = '2 Crore';
            else if (state.maxLimit === 5000000) limitName = '50 Lakh';
            else if (state.maxLimit === 50000000) limitName = '5 Crore';
            amountValidationMsg.textContent = `Maximum limit is ₹${(state.maxLimit).toLocaleString('en-IN')} (${limitName})`;
            loanAmountInput.parentElement.classList.add('error');
            hasErrors = true;
        } else {
            amountValidationMsg.textContent = '';
            loanAmountInput.parentElement.classList.remove('error');
        }

        // Tenure check
        if (state.tenureDays < 30 || state.tenureDays > 60) {
            tenureValidationMsg.textContent = 'Tenure days should be between 30 to 60';
            loanTenureInput.parentElement.classList.add('error');
            hasErrors = true;
        } else {
            tenureValidationMsg.textContent = '';
            loanTenureInput.parentElement.classList.remove('error');
        }

        const loanDate = parseUTCDate(state.loanDateStr);

        // 2. Compute Due Date = LoanDate + Tenure - 1 (inclusive of LoanDate)
        const dueDateTime = loanDate.getTime() + (state.tenureDays - 1) * 24 * 60 * 60 * 1000;
        const dueDate = new Date(dueDateTime);

        // Sync Due Date to UI (DD-MM-YYYY format)
        dueDateInputVal.value = formatDateDDMMYYYY(dueDate);
        if (dueDateFormatted) {
            dueDateFormatted.textContent = formatDateDDMMYYYY(dueDate);
        }
        timelineDueDate.textContent = formatDateDDMMYYYY(dueDate);

        // 3. Parse and Validate Repayment Date
        const repaymentDate = parseUTCDate(state.repaymentDateStr);

        if (repaymentDate.getTime() <= loanDate.getTime()) {
            repaymentValidationMsg.textContent = `Select valid date or date after loan date`;
            repaymentDateInput.parentElement.classList.add('error');
            hasErrors = true;
        } else {
            repaymentValidationMsg.textContent = '';
            repaymentDateInput.parentElement.classList.remove('error');
        }

        if (hasErrors) {
            daysCountDisplay.textContent = 'N/A';
            interestToPayDisplay.textContent = 'N/A';
            totalToPayDisplay.textContent = 'N/A';
            principalSubtext.textContent = 'N/A';
            interestSubtext.textContent = 'N/A';
            if (overdueBreakdownBox) overdueBreakdownBox.style.display = 'none';
            return;
        }

        // Calculate Days between Loan Date and Repayment Date
        const diffTime = repaymentDate.getTime() - loanDate.getTime();
        let daysCount = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (state.isInclusiveDays) {
            daysCount += 1;
        }

        // Handle negative days boundary case
        if (daysCount < 0) daysCount = 0;

        // 4. Compute Interest Dues
        const dailyRatePercent = state.interestRateAnnual / 365;

        let interestAmount = 0;
        let normalDays = daysCount;
        let extraDays = 0;

        // Split-interest calculation: normal rate up to due date, double rate for extra days past due date
        const repaymentDateCopy = new Date(Date.UTC(repaymentDate.getUTCFullYear(), repaymentDate.getUTCMonth(), repaymentDate.getUTCDate()));
        const dueDateCopy = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));

        if (repaymentDateCopy.getTime() > dueDateCopy.getTime()) {
            extraDays = Math.round((repaymentDateCopy.getTime() - dueDateCopy.getTime()) / (24 * 60 * 60 * 1000));
            normalDays = daysCount - extraDays;
            if (normalDays < 0) normalDays = 0;

            const normalInterest = state.loanAmount * (dailyRatePercent / 100) * normalDays;
            const extraInterest = state.loanAmount * ((dailyRatePercent * 2) / 100) * extraDays;
            interestAmount = normalInterest + extraInterest;
        } else {
            extraDays = 0;
            normalDays = daysCount;
            interestAmount = state.loanAmount * (dailyRatePercent / 100) * daysCount;
        }

        const totalToPay = state.loanAmount + interestAmount;

        // 5. Update Result Displays
        daysCountDisplay.innerHTML = `${daysCount.toFixed(2)} <span class="metric-unit">Days</span>`;
        interestToPayDisplay.textContent = formatCurrency(interestAmount);
        totalToPayDisplay.textContent = formatCurrency(totalToPay);

        principalSubtext.textContent = formatCurrency(state.loanAmount);

        if (extraDays > 0) {
            interestSubtext.innerHTML = `${formatCurrency(interestAmount)} <span class="overdue-penalty-indicator" style="color: var(--danger); font-size: 11px; font-weight: 700; margin-left: 4px;">(includes ${extraDays} extra days at 2x rate)</span>`;

            // Inject overdue warning breakdown details
            if (overdueBreakdownBox) {
                overdueBreakdownBox.style.display = 'block';
                overdueBreakdownBox.innerHTML = `
                    <div class="overdue-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span>Repayment Delayed by ${extraDays} Day${extraDays > 1 ? 's' : ''}</span>
                    </div>
                    <div class="overdue-rows">
                        <div class="overdue-row">
                            <div class="label">
                                <span>Standard Period Interest</span>
                                <span class="sub-label">${normalDays} Days @ ${state.interestRateAnnual}% p.a. (0.05%/day)</span>
                            </div>
                            <span class="val">${formatCurrency(state.loanAmount * (dailyRatePercent / 100) * normalDays)}</span>
                        </div>
                        <div class="overdue-row penalty-highlight">
                            <div class="label">
                                <span>Delayed Period Interest (2x Penalty)</span>
                                <span class="sub-label">${extraDays} Days @ ${(state.interestRateAnnual * 2).toFixed(2)}% p.a. (0.10%/day)</span>
                            </div>
                            <span class="val">${formatCurrency(state.loanAmount * ((dailyRatePercent * 2) / 100) * extraDays)}</span>
                        </div>
                    </div>
                `;
            }
        } else {
            interestSubtext.textContent = formatCurrency(interestAmount);
            if (overdueBreakdownBox) {
                overdueBreakdownBox.style.display = 'none';
                overdueBreakdownBox.innerHTML = '';
            }
        }

        // Update Timeline Values
        timelineLoanDate.textContent = formatDateLong(loanDate);
        timelineRepaymentDate.textContent = formatDateLong(repaymentDate);
        timelineElapsedDays.textContent = `${Math.round(daysCount)} Days`;

        // Manage Timeline Classes
        if (repaymentDate.getTime() > dueDate.getTime()) {
            timelineRepaymentStep.classList.add('overdue');
            timelineRepaymentStep.classList.remove('passed');
            timelineRepaymentStep.classList.add('current');
            timelineElapsedDays.style.backgroundColor = 'var(--danger)';
            timelineElapsedDays.style.boxShadow = '0 4px 8px var(--danger-glow)';
        } else {
            timelineRepaymentStep.classList.remove('overdue');
            timelineRepaymentStep.classList.add('passed');
            timelineElapsedDays.style.backgroundColor = 'var(--accent-primary)';
            timelineElapsedDays.style.boxShadow = '0 4px 8px var(--accent-glow)';
        }

        // Update Ratio Progress Bar
        const principalPct = totalToPay > 0 ? (state.loanAmount / totalToPay) * 100 : 100;
        const interestPct = totalToPay > 0 ? (interestAmount / totalToPay) * 100 : 0;

        if (ratioBarPrincipal && ratioBarInterest && ratioLabels) {
            ratioBarPrincipal.style.width = `${principalPct}%`;
            ratioBarInterest.style.width = `${interestPct}%`;
            ratioLabels.innerHTML = `
                <span>Principal (${principalPct.toFixed(1)}%)</span>
                <span>Interest (${interestPct.toFixed(1)}%)</span>
            `;
        }

    }

    /* ==========================================================================
       Render Transaction Steps Dynamic UI
       ========================================================================== */
    function renderFlowSteps() {
        const steps = flows[state.mode];
        flowStepsWrapper.innerHTML = '';

        steps.forEach((step, idx) => {
            const stepHtml = `
                <div class="flow-step-item" style="animation: fadeInUp 0.4s ease-out ${idx * 0.1}s forwards; opacity: 0; transform: translateY(15px);">
                    <span class="flow-step-number">${step.number}</span>
                    <h3 class="flow-step-title">${step.title}</h3>
                    <p class="flow-step-desc">${step.desc}</p>
                </div>
            `;
            flowStepsWrapper.insertAdjacentHTML('beforeend', stepHtml);
        });

        // Trigger animation
        const animatedItems = flowStepsWrapper.querySelectorAll('.flow-step-item');
        animatedItems.forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    }

    /* ==========================================================================
       Event Listeners & Form Control Bindings
       ========================================================================== */

    // Loan Amount Inputs Binding (Text Box & Slider Dual-Sync)
    loanAmountInput.addEventListener('focus', () => {
        const raw = parseInputNumber(loanAmountInput.value);
        if (raw > 0) loanAmountInput.value = raw;
    });

    loanAmountInput.addEventListener('blur', () => {
        let raw = parseInputNumber(loanAmountInput.value);

        if (raw < state.minLimit) raw = state.minLimit;
        if (raw > state.maxLimit) raw = state.maxLimit;

        state.loanAmount = raw;
        loanAmountInput.value = raw.toLocaleString('en-IN');
        loanAmountSlider.value = raw;

        runCalculations();
    });

    loanAmountInput.addEventListener('input', () => {
        const raw = parseInputNumber(loanAmountInput.value);
        if (raw > 0) {
            state.loanAmount = raw;
            if (raw >= state.minLimit && raw <= state.maxLimit) {
                loanAmountSlider.value = raw;
            }
            runCalculations();
        }
    });

    loanAmountSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        state.loanAmount = val;
        loanAmountInput.value = val.toLocaleString('en-IN');
        runCalculations();
    });

    // Dates Binding
    loanDateInput.addEventListener('input', (e) => {
        state.loanDateStr = e.target.value;
        const parsed = parseUTCDate(state.loanDateStr);
        if (loanDateFormatted) {
            loanDateFormatted.textContent = formatDateLong(parsed);
        }
        runCalculations();
    });

    loanTenureInput.addEventListener('input', (e) => {
        let rawVal = e.target.value;
        let val = parseInt(rawVal);
        if (isNaN(val)) {
            state.tenureDays = 60;
            runCalculations();
            return;
        }

        // Only clamp on input if the user has typed at least a 2-digit whole number
        if (rawVal.trim().length >= 2) {
            if (val < 30) {
                val = 30;
                loanTenureInput.value = 30;
                showToast('Tenure Limit', 'Tenure days should be between 30 to 60.');
            } else if (val > 60) {
                val = 60;
                loanTenureInput.value = 60;
                showToast('Tenure Limit', 'Tenure days should be between 30 to 60.');
            }
        }

        state.tenureDays = val;
        runCalculations();
    });

    loanTenureInput.addEventListener('blur', () => {
        let val = parseInt(loanTenureInput.value) || 60;
        if (val < 30) {
            val = 30;
            showToast('Tenure Limit', 'Tenure days should be between 30 to 60.');
        } else if (val > 60) {
            val = 60;
            showToast('Tenure Limit', 'Tenure days should be between 30 to 60.');
        }
        state.tenureDays = val;
        loanTenureInput.value = val;
        runCalculations();
    });

    repaymentDateInput.addEventListener('input', (e) => {
        state.repaymentDateStr = e.target.value;
        const parsed = parseUTCDate(state.repaymentDateStr);
        if (repaymentDateFormatted) {
            repaymentDateFormatted.textContent = formatDateLong(parsed);
        }
        runCalculations();
    });

    // Interest rate and advanced settings
    interestRateInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        state.interestRateAnnual = val;
        const dailyRate = val / 365;
        dailyRateDisplay.textContent = `${dailyRate.toFixed(4)}% / Day`;
        runCalculations();
    });

    inclusiveDaysCheckbox.addEventListener('change', (e) => {
        state.isInclusiveDays = e.target.checked;
        runCalculations();
    });

    // Themes / Mode selector toggle (Light Mode support)
    const themeBtn = document.getElementById('theme-mode-btn');
    const sunIcon = themeBtn.querySelector('.sun-icon');
    const moonIcon = themeBtn.querySelector('.moon-icon');

    themeBtn.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        const isLight = body.classList.contains('light-mode');

        if (isLight) {
            localStorage.setItem('theme', 'light');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
            showToast('Visual Style Updated', 'Switched to elegant Light Mode dashboard style.');
        } else {
            localStorage.setItem('theme', 'dark');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
            showToast('Visual Style Updated', 'Returned to ambient Dark Mode dashboard style.');
        }
    });

    /* ==========================================================================
       Locked Pages Handler (For Phase 2, 3, 4)
       ========================================================================== */
    const lockedNavs = document.querySelectorAll('.locked-nav');

    lockedNavs.forEach(nav => {
        nav.addEventListener('click', (e) => {
            e.preventDefault();
            const pageLabel = nav.querySelector('.nav-label').textContent;

            modalPageTitle.textContent = pageLabel;

            let pageDesc = "";
            if (nav.id === 'nav-page-3') {
                pageDesc = "Our proprietary risk assessment protocol. Evaluate credit ratings, historical payment patterns, cash coverage ratio, and fraud factors to approve Term Loans in real-time.";
            } else {
                pageDesc = "Automated settlements gateway. Direct payment APIs, partial repayments handling, interest adjustments, and deep-link accounting reconciliation workflows.";
            }

            lockedPageModal.querySelector('.modal-description').textContent = pageDesc;
            lockedPageModal.classList.add('active');
        });
    });

    window.closeLockedModal = function () {
        lockedPageModal.classList.remove('active');
    };

    lockedPageModal.addEventListener('click', (e) => {
        if (e.target === lockedPageModal) {
            closeLockedModal();
        }
    });



    /* ==========================================================================
       Expand/Collapse Advanced Settings Panel
       ========================================================================== */
    window.toggleAdvancedSettings = function () {
        advancedSettingsToggle.classList.toggle('expanded');
    };

    /* ==========================================================================
       Toast Notifications Dispatcher
       ========================================================================== */
    function showToast(title, desc) {
        // Prevent duplicate toasts from spamming the screen
        const existingToasts = Array.from(document.querySelectorAll('.toast-desc'));
        const isDuplicate = existingToasts.some(t => t.textContent === desc);
        if (isDuplicate) return;

        const id = 'toast-' + Math.random().toString(36).substr(2, 9);
        const toastHtml = `
            <div class="toast" id="${id}">
                <div class="toast-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <div class="toast-content">
                    <span class="toast-title">${title}</span>
                    <span class="toast-desc">${desc}</span>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = document.getElementById(id);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                toastEl.remove();
            }, 300);
        }, 4000);
    }

    /* ==========================================================================
       Proceed Action Trigger
       ========================================================================== */
    window.handleProceedAction = function () {
        showToast(
            'Application Initiated',
            `Page 2 Data Saved! Setting up credit checks for your SCF application.`
        );
    };

    /* ==========================================================================
       Initialization
       ========================================================================== */
    // Apply persistent theme from localStorage on page load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    } else {
        body.classList.remove('light-mode');
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
    }

    // Synchronize UI elements with state parameters on initial page load
    loanAmountInput.value = state.loanAmount.toLocaleString('en-IN');
    loanAmountSlider.value = state.loanAmount;
    loanDateInput.value = state.loanDateStr;
    loanTenureInput.value = state.tenureDays;
    repaymentDateInput.value = state.repaymentDateStr;

    // Set custom bounds displays
    minLimitDisplay.textContent = '₹1,00,000';
    maxLimitDisplay.textContent = '₹2,00,00,000';
    loanAmountSlider.min = 100000;
    loanAmountSlider.max = 20000000;

    // Set active badges
    proceedModeBadge.textContent = 'SCF';
    flowStructureLabel.textContent = 'SCF';

    const dateL = parseUTCDate(state.loanDateStr);
    const dateR = parseUTCDate(state.repaymentDateStr);
    if (loanDateFormatted) loanDateFormatted.textContent = formatDateLong(dateL);
    if (repaymentDateFormatted) repaymentDateFormatted.textContent = formatDateLong(dateR);

    renderFlowSteps();
    runCalculations();
});
