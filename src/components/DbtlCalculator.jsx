import React, { useState } from 'react';

// Helpers
const formatCurrency = (num) => {
  return '₹' + Math.round(num).toLocaleString('en-IN');
};

const parseUTCDate = (dateStr) => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date();
  return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
};

const formatDateShort = (date) => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

export default function DbtlCalculator({ triggerToast }) {
  // State variables
  const [loanAmount, setLoanAmount] = useState(2500000);
  const [loanAmountText, setLoanAmountText] = useState('25,00,000');
  const [disbursalDateStr, setDisbursalDateStr] = useState('2026-05-15');
  const [tenureMonths, setTenureMonths] = useState(6);
  const [emiDueDay, setEmiDueDay] = useState(8);
  const [roiAnnual, setRoiAnnual] = useState(12.00);

  // Limits
  const minLimit = 2500000;   // 25 Lakh
  const maxLimit = 20000000;  // 2 Crore

  // Validation errors derived from state
  const amountError = loanAmount < minLimit
    ? `Minimum limit is ${formatCurrency(minLimit)}`
    : loanAmount > maxLimit
      ? `Maximum limit is ${formatCurrency(maxLimit)}`
      : '';

  const roiError = roiAnnual < 12
    ? 'Minimum ROI is 12% p.a.'
    : '';

  const hasErrors = amountError || roiError;

  // Dual Sync Text Box focus
  const handleAmountFocus = () => {
    setLoanAmountText(loanAmount.toString());
  };

  // Dual Sync Text Box blur
  const handleAmountBlur = () => {
    let raw = parseFloat(loanAmountText.replace(/,/g, '')) || minLimit;
    if (raw < minLimit) raw = minLimit;
    if (raw > maxLimit) raw = maxLimit;
    setLoanAmount(raw);
    setLoanAmountText(raw.toLocaleString('en-IN'));
  };

  // Dual Sync Text Box change
  const handleAmountTextChange = (e) => {
    const cleanStr = e.target.value.replace(/[^0-9]/g, '');
    setLoanAmountText(cleanStr);
    const raw = parseFloat(cleanStr) || 0;
    if (raw > 0) {
      setLoanAmount(raw);
    }
  };

  // Slider change
  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value);
    setLoanAmount(val);
    setLoanAmountText(val.toLocaleString('en-IN'));
  };

  // Calculations engine matching app3.js
  const calcResults = () => {
    if (hasErrors) {
      return {
        hasErrors: true,
        brokenDays: 0,
        emiAmount: 0,
        monthlyPrincipal: 0,
        monthlyInterest: 0,
        totalInterest: 0,
        totalCost: 0,
        installments: []
      };
    }

    const disbursalDate = parseUTCDate(disbursalDateStr);
    const disbursalYear = disbursalDate.getUTCFullYear();
    const disbursalMonth = disbursalDate.getUTCMonth();
    const disbursalDay = disbursalDate.getUTCDate();

    // 2. Generate Installment Dates Array
    const installments = [];
    const startOffset = disbursalDay >= 21 ? 2 : 1;

    for (let i = startOffset; i < startOffset + tenureMonths; i++) {
      let targetMonth = disbursalMonth + i;
      let targetYear = disbursalYear + Math.floor(targetMonth / 12);
      targetMonth = targetMonth % 12;

      const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
      let dueDay = emiDueDay;
      if (disbursalDay === 31) {
        dueDay = 31;
      }
      if (dueDay > daysInMonth) dueDay = daysInMonth;

      const emiDate = new Date(Date.UTC(targetYear, targetMonth, dueDay));
      installments.push(emiDate);
    }

    const lastEmiDate = installments[installments.length - 1];
    const diffTime = lastEmiDate.getTime() - disbursalDate.getTime();
    const totalDaysInclusive = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Broken days
    let brokenDays = 0;
    const firstEmiDate = installments[0];

    if (disbursalDay === 31) {
      brokenDays = 0;
    } else if (disbursalDay >= 21) {
      let cycleMonth = firstEmiDate.getUTCMonth() - 1;
      let cycleYear = firstEmiDate.getUTCFullYear();
      if (cycleMonth < 0) {
        cycleMonth = 11;
        cycleYear--;
      }
      const daysInCycleMonth = new Date(Date.UTC(cycleYear, cycleMonth + 1, 0)).getUTCDate();
      let cycleDueDay = emiDueDay;
      if (cycleDueDay > daysInCycleMonth) cycleDueDay = daysInCycleMonth;

      const firstCycleStartDate = new Date(Date.UTC(cycleYear, cycleMonth, cycleDueDay));
      const diffTimeCycle = firstCycleStartDate.getTime() - disbursalDate.getTime();
      brokenDays = Math.round(diffTimeCycle / (1000 * 60 * 60 * 24)) + 1;
    } else {
      brokenDays = Math.abs(disbursalDay - emiDueDay);
    }

    if (brokenDays < 0) brokenDays = 0;

    // Financial calculations
    const totalInterest = loanAmount * (roiAnnual / 100) * (totalDaysInclusive / 365);
    const brokenPeriodInterest = loanAmount * (roiAnnual / 100) * (brokenDays / 365);
    const regularTotalInterest = totalInterest - brokenPeriodInterest;
    const monthlyInterest = regularTotalInterest / tenureMonths;
    const monthlyPrincipal = loanAmount / tenureMonths;
    const emiAmount = monthlyPrincipal + monthlyInterest;

    return {
      hasErrors: false,
      brokenDays,
      brokenPeriodInterest,
      emiAmount,
      monthlyPrincipal,
      monthlyInterest,
      totalInterest,
      totalCost: loanAmount + totalInterest,
      installments
    };
  };

  const results = calcResults();

  // Handle Proceed Action
  const handleProceed = () => {
    triggerToast(
      'Term Loan Saved',
      'Distributor Term Loan parameters captured! Proceeding to credit validation logs.'
    );
  };

  // Flow operational steps
  const dbtlFlowSteps = [
    { number: '01', title: 'Loan Appraisal', desc: 'Distributor submits corporate profiles and business ledgers to evaluate overall credit risk.' },
    { number: '02', title: 'Set Custom Terms', desc: 'Wofi configures terms and the exact monthly EMI cycle due day.' },
    { number: '03', title: 'Funds Disbursed', desc: 'The approved principal amount is disbursed directly into the Distributor\'s account within hours.' },
    { number: '04', title: 'Repayment Monthly EMI', desc: 'Distributor repays the term loan via structured monthly EMIs (Principal + Interest).' }
  ];

  // Percentage splits for ratio bar
  const totalRepayAmount = results.hasErrors ? minLimit : results.totalCost;
  const principalPct = (loanAmount / totalRepayAmount) * 100;
  const interestPct = (results.totalInterest / totalRepayAmount) * 100;

  // Build schedule ledger rows
  const generateScheduleRows = () => {
    if (results.hasErrors) return null;

    const rows = [];
    // Broken period interest row (EMI 0)
    const emiZeroDate = results.installments[0];
    rows.push({
      emiNo: '0',
      dateStr: formatDateShort(emiZeroDate),
      principal: '-',
      interest: formatCurrency(results.brokenPeriodInterest),
      emi: formatCurrency(results.brokenPeriodInterest),
      balance: formatCurrency(loanAmount)
    });

    let balancePrincipal = loanAmount;
    let cumulativeInterest = Math.round(results.brokenPeriodInterest);

    for (let j = 0; j < tenureMonths; j++) {
      const emiDate = results.installments[j];
      const emiNo = j + 1;

      let currentPrincipalRepay = Math.round(results.monthlyPrincipal);
      let currentInterestRepay = Math.round(results.monthlyInterest);
      let currentEmiTotal = currentPrincipalRepay + currentInterestRepay;

      // Final row float rounding cleaning
      if (emiNo === parseInt(tenureMonths)) {
        currentPrincipalRepay = balancePrincipal;
        currentInterestRepay = Math.round(results.totalInterest) - cumulativeInterest;
        currentEmiTotal = currentPrincipalRepay + currentInterestRepay;
        balancePrincipal = 0;
      } else {
        balancePrincipal -= currentPrincipalRepay;
      }

      cumulativeInterest += currentInterestRepay;

      rows.push({
        emiNo: emiNo.toString(),
        dateStr: formatDateShort(emiDate),
        principal: formatCurrency(currentPrincipalRepay),
        interest: formatCurrency(currentInterestRepay),
        emi: formatCurrency(currentEmiTotal),
        balance: formatCurrency(balancePrincipal)
      });
    }

    return rows;
  };

  const scheduleRows = generateScheduleRows();

  return (
    <div className="grid grid-cols-12 gap-[30px] max-[1200px]:gap-5">

      {/* ROW 1: Active Financing Structure (Rectangular Grid) */}
      <section className="bg-dark border border-[#ACACAC33] rounded-[24px] p-[24px] backdrop-blur-[16px] transition-all duration-[400ms] hover:border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden bg-gradient-to-br from-white/[0.03] to-white/[0.01] col-span-12">
        <div className="grid grid-cols-[1fr_2fr] gap-[30px] items-center max-[992px]:grid-cols-1 max-[992px]:gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-primary text-black font-extrabold font-heading text-sm rounded-[30px] border-none shadow-[0_0_20px_#FFCB05] uppercase p-1.5 px-4 inline-flex items-center justify-center tracking-[0.5px]">DBTL</div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white mb-1">
                Distributor Term Loan (DBTL)
              </h2>
              <p className="text-xs text-gray-text m-0"></p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-5 border-l border-[#ACACAC33] pl-[30px] max-[992px]:grid-cols-2 max-[992px]:border-l-0 max-[992px]:pl-0 max-[992px]:pt-5 max-[992px]:border-t max-[992px]:border-[#ACACAC33] max-[576px]:grid-cols-1">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-heading uppercase tracking-[0.05em] text-gray-light">Borrower</span>
              <span className="text-sm font-bold text-secondary leading-[1.4]">
                Distributor
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-heading uppercase tracking-[0.05em] text-gray-light">Interest Bearer/Invoice Submitted By</span>
              <span className="text-sm font-semibold text-white leading-[1.4]">Distributor</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-heading uppercase tracking-[0.05em] text-gray-light">Repayment Schedule</span>
              <span className="text-sm font-semibold text-white leading-[1.4]">Fixed Monthly EMIs (Max 6 EMIs)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ROW 2: Left Side - Loan Parameters Input Form */}
      <section className="bg-dark border border-[#ACACAC33] rounded-[24px] p-[30px] backdrop-blur-[16px] transition-all duration-[400ms] hover:border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden col-span-12 lg:col-span-6">
        <div className="mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.03] text-secondary flex items-center justify-center transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div>
              <h2 className="font-heading font-normal text-[40px] leading-[1.25] tracking-[-0.5px] text-white max-[1024px]:text-[28px] !text-2xl mb-0.5">Term Loan Parameters</h2>
              <p className="text-sm font-medium text-gray-text">Configure principal amount, dates, rate & tenure settings</p>
            </div>
          </div>
        </div>

        <form className="flex flex-col gap-[22px]" id="loan-form" onSubmit={(e) => e.preventDefault()}>
          {/* Limit Info Alert */}
          <div className="flex items-center gap-3 p-3 px-4 border border-[rgba(255,203,5,0.1)] border-l-[3px] border-l-primary rounded-2xl bg-primary/[0.03] text-[12.5px] text-gray-text transition-all duration-[400ms]">
            <div className="text-primary flex items-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              Allowed Range: <strong className="text-white">{formatCurrency(minLimit)}</strong> to <strong className="text-white">{formatCurrency(maxLimit)}</strong> (2 Crore)
            </div>
          </div>

          {/* Loan Amount Field */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="loan-amount" className="font-semibold text-[13.5px] text-gray-text">Loan Amount (₹)</label>
              {amountError && <span className="text-[11.5px] text-red-500 font-medium" id="amount-validation-msg">{amountError}</span>}
            </div>
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-text pointer-events-none">₹</span>
              <input
                type="text"
                id="loan-amount"
                className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 pl-8 text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35"
                value={loanAmountText}
                onFocus={handleAmountFocus}
                onBlur={handleAmountBlur}
                onChange={handleAmountTextChange}
                autoComplete="off"
              />
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              <input
                type="range"
                id="loan-amount-slider"
                min={minLimit}
                max={maxLimit}
                step="100000"
                value={loanAmount}
                onChange={handleSliderChange}
                className="styled-slider w-full h-[6px] rounded-[3px] bg-white/[0.06] outline-none cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-light">
                <span>25 Lakh</span>
                <span>1 Crore</span>
                <span>2 Crore</span>
              </div>
            </div>
          </div>

          {/* Grid for Disbursal Date & Tenure */}
          <div className="grid grid-cols-2 gap-5 max-[600px]:grid-cols-1">
            {/* Disbursal Date Field */}
            <div className="flex flex-col gap-2">
              <label htmlFor="loan-date" className="font-semibold text-[13.5px] text-gray-text">Date of Disbursal</label>
              <div className="relative w-full">
                <input
                  type="date"
                  id="loan-date"
                  className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35"
                  value={disbursalDateStr}
                  onChange={(e) => setDisbursalDateStr(e.target.value)}
                />
              </div>
            </div>

            {/* Tenure Field */}
            <div className="flex flex-col gap-2">
              <label htmlFor="loan-tenure" className="font-semibold text-[13.5px] text-gray-text">Tenure (Months)</label>
              <div className="relative w-full select-input">
                <select
                  id="loan-tenure"
                  className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35 cursor-pointer"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(parseInt(e.target.value))}
                >
                  <option value={3} className="bg-black text-white">3 Months</option>
                  <option value={6} className="bg-black text-white">6 Months</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid for EMI Date & ROI */}
          <div className="grid grid-cols-2 gap-5 max-[600px]:grid-cols-1">
            {/* EMI Date Day of Month */}
            <div className="flex flex-col gap-2">
              <label htmlFor="emi-due-day" className="font-semibold text-[13.5px] text-gray-text">EMI Date (Day of Month)</label>
              <div className="relative w-full">
                <input
                  type="number"
                  id="emi-due-day"
                  className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 pr-[60px] text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35"
                  min="1"
                  max="28"
                  value={emiDueDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setEmiDueDay(isNaN(val) ? '' : val);
                  }}
                  onBlur={() => {
                    let val = parseInt(emiDueDay) || 8;
                    if (val < 1) val = 1;
                    if (val > 28) {
                      val = 28;
                      triggerToast('EMI Day Cap', 'EMI monthly payment date capped at 28th to prevent Leap Year discrepancies.');
                    }
                    setEmiDueDay(val);
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-text pointer-events-none">Day</span>
              </div>
            </div>

            {/* Annual Rate of Interest (ROI) */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="interest-rate" className="font-semibold text-[13.5px] text-gray-text">Annual ROI (Min 12% p.a.)</label>
                {roiError && <span className="text-[11.5px] text-red-500 font-medium" id="roi-validation-msg">{roiError}</span>}
              </div>
              <div className="relative w-full">
                <input
                  type="number"
                  id="interest-rate"
                  className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 pr-[60px] text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35"
                  min="12"
                  max="50"
                  step="0.05"
                  value={roiAnnual}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setRoiAnnual(val);
                  }}
                  onBlur={() => {
                    let val = parseFloat(roiAnnual) || 12.00;
                    if (val < 12) {
                      val = 12.00;
                      triggerToast('ROI Limit', 'Minimum interest rate is 12% p.a.');
                    }
                    setRoiAnnual(val);
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-text pointer-events-none">%</span>
              </div>
            </div>
          </div>

          {/* Grid for Broken Days */}
          <div className="grid grid-cols-2 gap-5 max-[600px]:grid-cols-1">
            <div className="flex flex-col gap-2 relative">
              <label className="font-semibold text-[13.5px] text-gray-text">Broken Days</label>
              <div className="relative w-full">
                <input
                  type="text"
                  id="broken-days-display"
                  className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35 !bg-white/[0.01] text-gray-text cursor-not-allowed select-none"
                  readOnly
                  value={results.brokenDays}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-white/[0.04] border border-white/[0.05] text-gray-light text-[10px] font-bold p-0.5 px-2 rounded uppercase">Auto</span>
              </div>
            </div>
          </div>
        </form>
      </section>

      {/* ROW 2: Term Loan Live Summary Details */}
      <section className="bg-dark border border-[#ACACAC33] rounded-[24px] p-[30px] backdrop-blur-[16px] transition-all duration-[400ms] hover:border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden bg-[radial-gradient(circle_at_100%_0%,rgba(16,104,178,0.08)_0%,#171717_70%)] col-span-12 lg:col-span-6">
        <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-[radial-gradient(circle,rgba(16,104,178,0.35)_0%,transparent_70%)] opacity-45 pointer-events-none z-[1] transition-all duration-500" />
        <div className="mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.03] text-secondary flex items-center justify-center transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <h2 className="font-heading font-normal text-[40px] leading-[1.25] tracking-[-0.5px] text-white max-[1024px]:text-[28px] !text-2xl mb-0.5">Financing Summary</h2>
              <p className="text-sm font-medium text-gray-text">Real-time breakdown of costs and settlement dates</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[30px] relative z-[2]">
          {/* Primary Large Display */}
          <div className="flex flex-col items-center text-center bg-black/20 border border-[#ACACAC33] rounded-[24px] p-6">
            <span className="text-xs font-bold text-gray-light uppercase tracking-[0.8px] mb-1.5">Monthly EMI Amount</span>
            <div className="font-heading text-[40px] font-extrabold text-white tracking-[-1px] mb-1.5 drop-shadow-[0_0_30px_rgba(16,104,178,0.35)]" id="emi-amount-display">
              {results.hasErrors ? 'N/A' : formatCurrency(results.emiAmount)}
            </div>
            <div className="text-xs text-gray-text">
              Monthly Principal <strong className="text-white" id="monthly-principal-display">{results.hasErrors ? 'N/A' : formatCurrency(results.monthlyPrincipal)}</strong> + Interest <strong className="text-white" id="monthly-interest-display">{results.hasErrors ? 'N/A' : formatCurrency(results.monthlyInterest)}</strong>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-[18px] max-[600px]:grid-cols-1">
            <div className="bg-white/[0.02] border border-[#ACACAC33] rounded-2xl p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-2xl bg-white/[0.03] text-gray-text flex items-center justify-center font-bold text-lg text-secondary">
                ₹
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-light font-medium">Interest (Total)</span>
                <span className="text-base font-bold text-secondary transition-colors duration-500" id="total-interest-display">
                  {results.hasErrors ? 'N/A' : formatCurrency(results.totalInterest)}
                </span>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-[#ACACAC33] rounded-2xl p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-2xl bg-white/[0.03] text-gray-text flex items-center justify-center font-bold text-lg text-primary">
                ₹
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-light font-medium">Total Repayment</span>
                <span className="text-base font-bold text-white" id="total-cost-display">
                  {results.hasErrors ? 'N/A' : formatCurrency(results.totalCost)}
                </span>
                <span className="text-[10px] text-gray-light">Principal + Interest</span>
              </div>
            </div>
          </div>

          {/* Proceed Button */}
          <button
            className="h-12 px-6 rounded-[30px] border-none font-body text-sm font-bold inline-flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 outline-none bg-primary text-black shadow-[0_0_30px_rgba(255,203,5,0.5)] hover:bg-secondary hover:text-white hover:shadow-[0_0_30px_rgba(16,104,178,0.6)] w-full mt-3.5"
            id="proceed-button"
            onClick={handleProceed}
          >
            <span>Acknowledge & Save Term Loan</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </section>

      {/* ROW 3: Detailed Monthly Repayment Schedule Table */}
      <section className="bg-dark border border-[#ACACAC33] rounded-[24px] p-[30px] backdrop-blur-[16px] transition-all duration-[400ms] hover:border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden col-span-12">
        <div className="mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.03] text-secondary flex items-center justify-center transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h2 className="font-heading font-normal text-[40px] leading-[1.25] tracking-[-0.5px] text-white max-[1024px]:text-[28px] !text-2xl mb-0.5">Detailed Monthly Repayment Schedule</h2>
              <p className="text-sm font-medium text-gray-text">
                Complete ledger of monthly equal installments, amortized interest, and remaining principal balances
              </p>
            </div>
          </div>
        </div>

        <div>
          {results.hasErrors ? (
            <div className="text-center text-red-500 font-bold py-8">
              Please enter valid inputs to generate the schedule.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-2xl border border-[#ACACAC33] bg-[#121623]/40 mt-3.5 mb-5">
              <table className="w-full border-collapse text-left text-[13.5px]">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="p-2.5 px-3.5 border-b border-[#ACACAC15] font-heading font-semibold text-white uppercase text-[10.5px] tracking-wider">EMI No</th>
                    <th className="p-2.5 px-3.5 border-b border-[#ACACAC15] font-heading font-semibold text-white uppercase text-[10.5px] tracking-wider">EMI Date</th>
                    <th className="p-2.5 px-3.5 border-b border-[#ACACAC15] font-heading font-semibold text-white uppercase text-[10.5px] tracking-wider">Principal Repayment</th>
                    <th className="p-2.5 px-3.5 border-b border-[#ACACAC15] font-heading font-semibold text-white uppercase text-[10.5px] tracking-wider">Interest Repayment</th>
                    <th className="p-2.5 px-3.5 border-b border-[#ACACAC15] font-heading font-semibold text-white uppercase text-[10.5px] tracking-wider">Total EMI Installment</th>
                    <th className="p-2.5 px-3.5 border-b border-[#ACACAC15] font-heading font-semibold text-white uppercase text-[10.5px] tracking-wider">Balance Principal Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleRows &&
                    scheduleRows.map((row) => (
                      <tr
                        key={row.emiNo}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="p-2.5 px-3.5 border-b border-[#ACACAC15] text-gray-text font-body font-heading font-bold">{row.emiNo}</td>
                        <td className="p-2.5 px-3.5 border-b border-[#ACACAC15] text-gray-text font-body">{row.dateStr}</td>
                        <td className="p-2.5 px-3.5 border-b border-[#ACACAC15] text-gray-text font-body">{row.principal}</td>
                        <td className="p-2.5 px-3.5 border-b border-[#ACACAC15] text-gray-text font-body">{row.interest}</td>
                        <td className="p-2.5 px-3.5 border-b border-[#ACACAC15] text-gray-text font-body font-extrabold">{row.emi}</td>
                        <td className="p-2.5 px-3.5 border-b border-[#ACACAC15] text-gray-text font-body font-heading font-bold !text-white">{row.balance}</td>
                      </tr>
                    ))}
                  {/* Total row summaries */}
                  <tr className="bg-[rgba(245,158,11,0.05)] border-t-2 border-secondary font-bold text-white">
                    <td colSpan="2" className="p-2.5 px-3.5 border-b border-[#ACACAC15] font-bold">Total</td>
                    <td className="p-2.5 px-3.5 border-b border-[#ACACAC15]">{formatCurrency(loanAmount)}</td>
                    <td className="p-2.5 px-3.5 border-b border-[#ACACAC15]">{formatCurrency(results.totalInterest)}</td>
                    <td className="p-2.5 px-3.5 border-b border-[#ACACAC15] font-extrabold">{formatCurrency(results.totalCost)}</td>
                    <td className="p-2.5 px-3.5 border-b border-[#ACACAC15]">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ROW 4: Financing Operational Flow */}
      <section className="bg-dark border border-[#ACACAC33] rounded-[24px] p-[30px] pb-10 backdrop-blur-[16px] transition-all duration-[400ms] hover:border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden col-span-12">
        <div className="mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.03] text-secondary flex items-center justify-center transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <div>
              <h2 className="font-heading font-normal text-[40px] leading-[1.25] tracking-[-0.5px] text-white max-[1024px]:text-[28px] !text-2xl mb-0.5">Financing Operational Flow</h2>
              <p className="text-sm font-medium text-gray-text">Understanding how funds and repayments move under the <span className="font-bold text-primary">DBTL</span> program</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-5 mt-2.5 relative max-[1200px]:grid-cols-2 max-[600px]:grid-cols-1" id="flow-steps-wrapper">
          {dbtlFlowSteps.map((step, idx) => {
            const isLast = idx === dbtlFlowSteps.length - 1;
            return (
              <div
                key={step.number}
                className={`bg-[#171717] border border-[#ACACAC15] rounded-2xl p-6 relative flex flex-col gap-3 transition-all duration-[400ms] shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:bg-[#1a1a1a] hover:border-secondary hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(16,104,178,0.35)] group ${!isLast ? 'after:hidden lg:after:block after:content-[\'\'] after:absolute after:top-10 after:right-[-15px] after:w-[30px] after:h-[1px] after:border-t after:border-dashed after:border-[#ACACAC33] after:z-10 after:pointer-events-none' : ''
                  }`}
              >
                <span className="w-9 h-9 rounded-full bg-white/[0.03] border border-[#ACACAC33] text-primary font-heading text-sm font-extrabold flex items-center justify-center transition-all duration-500 group-hover:bg-secondary group-hover:text-black group-hover:border-transparent group-hover:shadow-[0_0_15px_rgba(16,104,178,0.5)] group-hover:scale-110 group-hover:rotate-[360deg]">
                  {step.number}
                </span>
                <h3 className="font-heading text-sm font-bold text-white transition-colors duration-200 group-hover:text-primary">
                  {step.title}
                </h3>
                <p className="text-xs text-gray-text leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
