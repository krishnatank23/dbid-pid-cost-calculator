/* ==========================================================================
   LendFlow - Distributor Term Loan (DBTL) Calculator Core Script
   (app3.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Platform State Object
    const state = {
        loanAmount: 100000,         // Default ₹1,00,000
        disbursalDateStr: '2026-05-15', // YYYY-MM-DD
        tenureMonths: 6,            // Default 6 months
        emiDueDay: 8,               // Default 8th day of month
        roiAnnual: 13.00,           // Default 13.00% p.a.
        processingFeePct: 0.50,     // Default 0.50%
        minLimit: 100000,           // 1 Lakh min
        maxLimit: 20000000          // 2 Crore max
    };

    // DOM Elements Cache
    const body = document.body;
    const loanAmountInput = document.getElementById('loan-amount');
    const loanAmountSlider = document.getElementById('loan-amount-slider');
    const loanDateInput = document.getElementById('loan-date');
    const loanTenureInput = document.getElementById('loan-tenure');
    const emiDueDayInput = document.getElementById('emi-due-day');
    const interestRateInput = document.getElementById('interest-rate');
    const processingFeePctInput = document.getElementById('processing-fee-pct');
    const brokenDaysDisplay = document.getElementById('broken-days-display');

    // Outputs
    const emiAmountDisplay = document.getElementById('emi-amount-display');
    const monthlyPrincipalDisplay = document.getElementById('monthly-principal-display');
    const monthlyInterestDisplay = document.getElementById('monthly-interest-display');
    const totalInterestDisplay = document.getElementById('total-interest-display');
    const totalPfDisplay = document.getElementById('total-pf-display');
    const totalCostDisplay = document.getElementById('total-cost-display');
    const ratioBarPrincipal = document.getElementById('ratio-bar-principal');
    const ratioBarCost = document.getElementById('ratio-bar-cost');
    const repaymentScheduleBody = document.getElementById('repayment-schedule-body');

    // Modals & Toasts
    const lockedPageModal = document.getElementById('locked-page-modal');
    const modalPageTitle = document.getElementById('modal-page-title');
    const toastContainer = document.getElementById('toast-container');

    // Current Time Setup (Dynamic System Time & Day)
    const initDate = new Date();
    document.getElementById('current-time-display').innerHTML = formatDateWithDay(initDate);

    /* ==========================================================================
       Formatters & Date Helpers
       ========================================================================== */
    function formatCurrency(num) {
        return '₹' + Math.round(num).toLocaleString('en-IN');
    }

    function parseInputNumber(str) {
        return parseFloat(str.replace(/,/g, '')) || 0;
    }

    // Standard date parsing (timezone safe)
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
        return `${day}/${month}/${year}`;
    }

    function formatDateLong(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
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
       Core Repayment & Term Calculations
       ========================================================================== */
    function runCalculations() {
        // 1. Inputs validation
        let hasErrors = false;
        if (state.loanAmount < state.minLimit) {
            document.getElementById('amount-validation-msg').textContent = 'Minimum is ₹1,00,000';
            loanAmountInput.parentElement.classList.add('error');
            hasErrors = true;
        } else if (state.loanAmount > state.maxLimit) {
            document.getElementById('amount-validation-msg').textContent = `Maximum is ₹${state.maxLimit.toLocaleString('en-IN')}`;
            loanAmountInput.parentElement.classList.add('error');
            hasErrors = true;
        } else {
            document.getElementById('amount-validation-msg').textContent = '';
            loanAmountInput.parentElement.classList.remove('error');
        }

        if (hasErrors) return;

        const disbursalDate = parseUTCDate(state.disbursalDateStr);
        const disbursalYear = disbursalDate.getUTCFullYear();
        const disbursalMonth = disbursalDate.getUTCMonth();
        const disbursalDay = disbursalDate.getUTCDate();

        // 2. Generate Installment Dates Array
        const installments = [];
        
        // Month offset starting from the month after disbursal month
        for (let i = 1; i <= state.tenureMonths; i++) {
            // Target month
            let targetMonth = disbursalMonth + i;
            let targetYear = disbursalYear + Math.floor(targetMonth / 12);
            targetMonth = targetMonth % 12;

            // Handle date overflow for shorter months (e.g. February)
            const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
            let dueDay = state.emiDueDay;
            if (dueDay > daysInMonth) dueDay = daysInMonth;

            const emiDate = new Date(Date.UTC(targetYear, targetMonth, dueDay));
            installments.push(emiDate);
        }

        // 3. Compute Days and Split Interest
        // Last payment date represents the maturity date
        const lastEmiDate = installments[installments.length - 1];
        
        // Calculate Total Days between Disbursal and Maturity (Inclusive)
        const diffTime = lastEmiDate.getTime() - disbursalDate.getTime();
        const totalDaysInclusive = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Broken days calculation: Days between disbursal and first standard cycle start
        // Usually, a full cycle is 30 days. If first EMI period is shorter, broken days = (Disbursal Day - EMI Due Day)
        // For Disbursal May 15 and EMI Day 8:
        let brokenDays = disbursalDay - state.emiDueDay;
        if (brokenDays < 0) brokenDays = 0; // Simple representation matching ₹0 user broken period cost
        brokenDaysDisplay.value = brokenDays;

        // Processing Fees and GST components
        const pfBase = state.loanAmount * (state.processingFeePct / 100);
        const pfGst = pfBase * 0.18; // 18% GST on Processing Fees
        const pfTotal = pfBase + pfGst;

        // Interest calculation
        // Total Interest = Principal * ROI% * (TotalDaysInclusive / 365)
        const totalInterest = state.loanAmount * (state.roiAnnual / 100) * (totalDaysInclusive / 365);
        const totalFinanceCost = pfTotal + totalInterest;

        // Monthly repayments split
        // Monthly Principal = Principal / Tenure
        const monthlyPrincipal = state.loanAmount / state.tenureMonths;
        // Monthly Interest = Total Interest / Tenure (Flat monthly allocation matching sheet values)
        const monthlyInterest = totalInterest / state.tenureMonths;
        const monthlyEmiTotal = monthlyPrincipal + monthlyInterest;

        // 4. Update Summaries
        emiAmountDisplay.textContent = formatCurrency(monthlyEmiTotal);
        monthlyPrincipalDisplay.textContent = formatCurrency(monthlyPrincipal);
        monthlyInterestDisplay.textContent = formatCurrency(monthlyInterest);

        totalInterestDisplay.textContent = formatCurrency(totalInterest);
        totalPfDisplay.textContent = formatCurrency(pfTotal);
        totalCostDisplay.textContent = formatCurrency(totalFinanceCost);

        // Update Ratio Progress Bar
        const totalCostSum = state.loanAmount + totalInterest + pfTotal;
        const principalPct = (state.loanAmount / totalCostSum) * 100;
        const costPct = ((totalInterest + pfTotal) / totalCostSum) * 100;

        ratioBarPrincipal.style.width = `${principalPct}%`;
        ratioBarCost.style.width = `${costPct}%`;
        document.querySelector('.ratio-labels').innerHTML = `
            <span>Principal (${principalPct.toFixed(1)}%)</span>
            <span>Total Cost (${costPct.toFixed(1)}%)</span>
        `;

        // 5. Populate Detailed Repayment Schedule Table
        repaymentScheduleBody.innerHTML = '';

        // Row 0: Starting State
        const row0Html = `
            <tr>
                <td class="font-heading">0</td>
                <td>${formatDateShort(disbursalDate)}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td class="font-heading">${formatCurrency(state.loanAmount)}</td>
            </tr>
        `;
        repaymentScheduleBody.insertAdjacentHTML('beforeend', row0Html);

        let balancePrincipal = state.loanAmount;
        let cumulativePrincipal = 0;
        let cumulativeInterest = 0;
        let cumulativeTotal = 0;

        for (let j = 0; j < state.tenureMonths; j++) {
            const emiDate = installments[j];
            const emiNo = j + 1;

            // Calculate rounded breakdowns
            let currentPrincipalRepay = Math.round(monthlyPrincipal);
            let currentInterestRepay = Math.round(monthlyInterest);
            let currentEmiTotal = currentPrincipalRepay + currentInterestRepay;

            // Make sure the last installment clears exactly to zero (handles float rounding)
            if (emiNo === state.tenureMonths) {
                currentPrincipalRepay = balancePrincipal;
                currentEmiTotal = currentPrincipalRepay + currentInterestRepay;
                balancePrincipal = 0;
            } else {
                balancePrincipal -= currentPrincipalRepay;
            }

            cumulativePrincipal += currentPrincipalRepay;
            cumulativeInterest += currentInterestRepay;
            cumulativeTotal += currentEmiTotal;

            const rowHtml = `
                <tr>
                    <td class="font-heading">${emiNo}</td>
                    <td>${formatDateShort(emiDate)}</td>
                    <td>${formatCurrency(currentPrincipalRepay)}</td>
                    <td>${formatCurrency(currentInterestRepay)}</td>
                    <td>${formatCurrency(currentEmiTotal)}</td>
                    <td class="font-heading">${formatCurrency(balancePrincipal)}</td>
                </tr>
            `;
            repaymentScheduleBody.insertAdjacentHTML('beforeend', rowHtml);
        }

        // Summary Total Row
        const totalRowHtml = `
            <tr class="total-row">
                <td colspan="2">Total</td>
                <td>${formatCurrency(cumulativePrincipal)}</td>
                <td>${formatCurrency(cumulativeInterest)}</td>
                <td>${formatCurrency(cumulativeTotal)}</td>
                <td>-</td>
            </tr>
        `;
        repaymentScheduleBody.insertAdjacentHTML('beforeend', totalRowHtml);
    }

    /* ==========================================================================
       Event Listeners & Form Control Bindings
       ========================================================================== */
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

    loanDateInput.addEventListener('input', (e) => {
        state.disbursalDateStr = e.target.value;
        runCalculations();
    });

    loanTenureInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 60) {
            val = 60;
            loanTenureInput.value = 60;
            showToast('Tenure Cap', 'Maximum term tenure is capped at 60 months.');
        }
        state.tenureMonths = val;
        runCalculations();
    });

    emiDueDayInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 28) {
            val = 28;
            emiDueDayInput.value = 28;
            showToast('EMI Day Cap', 'EMI monthly payment date capped at 28th to prevent Leap Year discrepancies.');
        }
        state.emiDueDay = val;
        runCalculations();
    });

    interestRateInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        state.roiAnnual = val;
        runCalculations();
    });

    processingFeePctInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        state.processingFeePct = val;
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
       Toast Notifications Dispatcher
       ========================================================================== */
    function showToast(title, desc) {
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
    window.handleProceedAction = function() {
        showToast(
            'Term Loan Saved', 
            `Distributor Term Loan parameters captured! Proceeding to credit validation logs.`
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
    loanDateInput.value = state.disbursalDateStr;
    loanTenureInput.value = state.tenureMonths;
    emiDueDayInput.value = state.emiDueDay;
    interestRateInput.value = state.roiAnnual.toFixed(2);
    processingFeePctInput.value = state.processingFeePct.toFixed(2);

    runCalculations();
});
