import React, { useState, useEffect } from 'react';

// Help functions
const formatCurrency = (num) => {
  return '₹' + Math.round(num).toLocaleString('en-IN');
};

const parseUTCDate = (dateStr) => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date();
  return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
};

const formatDateLong = (date) => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateShort = formatDateLong;

export default function DbidPidCalculator({ triggerToast }) {
  // State variables
  const [mode, setMode] = useState('dbid'); // 'dbid' or 'pid'
  const [loanAmount, setLoanAmount] = useState(2500000);
  const [loanAmountText, setLoanAmountText] = useState('25,00,000');
  const [loanDateStr, setLoanDateStr] = useState('2026-05-19');
  const [tenureDays, setTenureDays] = useState(60);
  const [repaymentDateStr, setRepaymentDateStr] = useState('2026-07-10');
  const [interestRateAnnual, setInterestRateAnnual] = useState(18.25);
  const [isInclusiveDays, setIsInclusiveDays] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Limits
  const minLimit = mode === 'dbid' ? 2500000 : 100000;
  const maxLimit = 20000000; // 2 Crore

  // Validation errors derived from state
  const amountError = loanAmount < minLimit
    ? `Minimum limit is ${formatCurrency(minLimit)}`
    : loanAmount > maxLimit
      ? `Maximum limit is ${formatCurrency(maxLimit)}`
      : '';

  const tenureError = (tenureDays < 30 || tenureDays > 60)
    ? 'Tenure days should be between 30 to 60'
    : '';

  const loanDate = parseUTCDate(loanDateStr);
  const repaymentDate = parseUTCDate(repaymentDateStr);
  const repaymentError = repaymentDate.getTime() < loanDate.getTime()
    ? 'Repayment date cannot be before loan date'
    : '';

  const hasErrors = amountError || tenureError || repaymentError;

  // Handle Mode Change
  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);

    // Clamp amount inside new limit
    let targetMin = newMode === 'dbid' ? 2500000 : 100000;
    let clampedAmount = loanAmount;
    if (clampedAmount < targetMin) clampedAmount = targetMin;
    if (clampedAmount > maxLimit) clampedAmount = maxLimit;

    setLoanAmount(clampedAmount);
    setLoanAmountText(clampedAmount.toLocaleString('en-IN'));
    triggerToast('Financing Program Changed', `Switched calculation framework to ${newMode.toUpperCase()} successfully.`);
  };

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

  // Perform Calculations
  const calcResults = () => {
    const loanDateVal = parseUTCDate(loanDateStr);
    const dueDateTime = loanDateVal.getTime() + (tenureDays - 1) * 24 * 60 * 60 * 1000;
    const dueDate = new Date(dueDateTime);

    if (hasErrors) {
      return {
        hasErrors: true,
        dueDateStr: formatDateLong(dueDate),
        daysCount: 0,
        interestAmount: 0,
        totalToPay: 0,
        extraDays: 0,
        normalDays: 0,
        normalInterest: 0,
        extraInterest: 0,
        isOverdue: false
      };
    }

    const repaymentDateVal = parseUTCDate(repaymentDateStr);

    // Days count
    const diffTime = repaymentDateVal.getTime() - loanDateVal.getTime();
    let daysCount = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (isInclusiveDays) {
      daysCount += 1;
    }
    if (daysCount < 0) daysCount = 0;

    // Split interest
    const dailyRatePercent = interestRateAnnual / 365;
    let interestAmount = 0;
    let normalDays = daysCount;
    let extraDays = 0;

    const repaymentDateCopy = new Date(Date.UTC(repaymentDateVal.getUTCFullYear(), repaymentDateVal.getUTCMonth(), repaymentDateVal.getUTCDate()));
    const dueDateCopy = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));

    if (repaymentDateCopy.getTime() > dueDateCopy.getTime()) {
      extraDays = Math.round((repaymentDateCopy.getTime() - dueDateCopy.getTime()) / (24 * 60 * 60 * 1000));
      normalDays = daysCount - extraDays;
      if (normalDays < 0) normalDays = 0;

      const normalInterest = loanAmount * (dailyRatePercent / 100) * normalDays;
      const extraInterest = loanAmount * ((dailyRatePercent * 2) / 100) * extraDays;
      interestAmount = normalInterest + extraInterest;
    } else {
      extraDays = 0;
      normalDays = daysCount;
      interestAmount = loanAmount * (dailyRatePercent / 100) * daysCount;
    }

    const totalToPay = loanAmount + interestAmount;
    const isOverdue = repaymentDateCopy.getTime() > dueDateCopy.getTime();

    return {
      hasErrors: false,
      dueDateStr: formatDateLong(dueDate),
      daysCount,
      interestAmount,
      totalToPay,
      extraDays,
      normalDays,
      normalInterest: loanAmount * (dailyRatePercent / 100) * normalDays,
      extraInterest: loanAmount * ((dailyRatePercent * 2) / 100) * extraDays,
      isOverdue
    };
  };

  const results = calcResults();

  // Handle Proceed Action
  const handleProceed = () => {
    triggerToast(
      'Application Initiated',
      `Page 1 Data Saved! Setting up invoice uploads for your ${mode.toUpperCase()} application.`
    );
  };

  // Flow operational steps
  const dbidFlowSteps = [
    { number: '01', title: 'Distributor Sales Invoice', desc: 'Distributor delivers goods to retailer and provides sale invoices to the Wofi system.' },
    { number: '02', title: 'Invoice Authenticated', desc: 'Wofi dynamically verifies the sale invoices. No heavy collaterals required.' },
    { number: '03', title: 'Funds Disbursed', desc: 'Loan amount is disbursed directly to the Distributor within hours to clear working capital blocks.' },
    { number: '04', title: 'Distributor Settles Loan', desc: 'Distributor bears the interest (0.05%/day) and repays total dues on or before Due Date.' }
  ];

  const pidFlowSteps = [
    { number: '01', title: 'Sales Invoice', desc: 'Retailer purchases brand stock and provides sales invoices to the Wofi platform.' },
    { number: '02', title: 'Invoice Authenticated', desc: 'Wofi dynamically verifies the invoices.' },
    { number: '03', title: 'Funds Disbursed', desc: 'Loan amount is disbursed directly to the distributor account.' },
    { number: '04', title: 'Retailer Settles Loan', desc: 'Retailer bears the interest (0.05%/day) and repays total dues on or before Due Date.' }
  ];

  const currentFlowSteps = mode === 'dbid' ? dbidFlowSteps : pidFlowSteps;

  // Percentage splits for ratio bar
  const principalPct = results.totalToPay > 0 ? (loanAmount / results.totalToPay) * 100 : 100;
  const interestPct = results.totalToPay > 0 ? (results.interestAmount / results.totalToPay) * 100 : 0;

  return (
    <div className="grid grid-cols-12 gap-[30px] max-[1200px]:gap-5">

      {/* ROW 1: Choice Selector */}
      <section className="bg-dark border border-[#ACACAC33] rounded-[24px] p-[30px] pb-[35px] backdrop-blur-[16px] transition-all duration-[400ms] hover:border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden col-span-12">
        <div className="mb-6">
          <h2 className="font-heading font-normal text-[40px] leading-[1.25] tracking-[-0.5px] text-white max-[1024px]:text-[28px]">Select Financing Structure</h2>
        </div>
        <div className="grid grid-cols-2 gap-6 max-[992px]:grid-cols-1">
          {/* DBID Mode Box */}
          <div
            onClick={() => handleModeChange('dbid')}
            className={`border border-[#ACACAC33] bg-white/[0.015] rounded-[24px] p-6 px-7 cursor-pointer relative transition-all duration-[400ms] hover:bg-white/[0.03] hover:border-white/[0.12] hover:-translate-y-0.5 ${mode === 'dbid' ? 'bg-secondary/[0.05] border-secondary shadow-[0_0_30px_rgba(16,104,178,0.15)]' : ''
              }`}
          >
            <div className="flex items-center gap-3.5 mb-5">
              <div className={`font-heading font-extrabold text-sm rounded-[30px] uppercase inline-flex items-center justify-center tracking-[0.5px] transition-all duration-300 ${mode === 'dbid'
                ? 'bg-primary text-black shadow-[0_0_20px_#FFCB05] p-1.5 px-4'
                : 'bg-[#211C0B] border border-[rgba(255,203,5,0.4)] text-primary shadow-none p-[5px] px-[15px] opacity-75'
                }`}>DBID</div>
              <span className={`font-bold text-[15px] transition-colors duration-200 ${mode === 'dbid' ? 'text-white' : 'text-gray-text'}`}>
                Distributor Invoice Discounting
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/[0.04] pt-[18px]">
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] text-gray-light uppercase tracking-[0.3px]">Borrower</span>
                <span className={`text-[13.5px] font-semibold transition-colors duration-200 ${mode === 'dbid' ? 'text-secondary' : 'text-gray-text'}`}>Distributor</span>
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] text-gray-light uppercase tracking-[0.3px]">Interest Bearer/Invoice Submitted By</span>
                <span className={`text-[13.5px] font-semibold transition-colors duration-200 ${mode === 'dbid' ? 'text-white' : 'text-gray-text'}`}>Distributor</span>
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] text-gray-light uppercase tracking-[0.3px]">Invoice Details</span>
                <span className={`text-[13.5px] font-semibold transition-colors duration-200 ${mode === 'dbid' ? 'text-white' : 'text-gray-text'}`}>Retailer Invoice (Sales Invoice)</span>
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] text-gray-light uppercase tracking-[0.3px]">Loan Disbursed To</span>
                <span className={`text-[13.5px] font-semibold transition-colors duration-200 ${mode === 'dbid' ? 'text-white' : 'text-gray-text'}`}>Distributor Account</span>
              </div>
            </div>
            <div className={`absolute top-6 right-7 w-2.5 h-2.5 rounded-full border-2 transition-all duration-[400ms] ${mode === 'dbid' ? 'bg-secondary border-secondary shadow-[0_0_10px_rgba(16,104,178,0.5)] scale-120' : 'bg-transparent border-gray-light'
              }`} />
          </div>

          {/* PID Mode Box */}
          <div
            onClick={() => handleModeChange('pid')}
            className={`border border-[#ACACAC33] bg-white/[0.015] rounded-[24px] p-6 px-7 cursor-pointer relative transition-all duration-[400ms] hover:bg-white/[0.03] hover:border-white/[0.12] hover:-translate-y-0.5 ${mode === 'pid' ? 'bg-secondary/[0.05] border-secondary shadow-[0_0_30px_rgba(16,104,178,0.15)]' : ''
              }`}
          >
            <div className="flex items-center gap-3.5 mb-5">
              <div className={`font-heading font-extrabold text-sm rounded-[30px] uppercase inline-flex items-center justify-center tracking-[0.5px] transition-all duration-300 ${mode === 'pid'
                ? 'bg-primary text-black shadow-[0_0_20px_#FFCB05] p-1.5 px-4'
                : 'bg-[#211C0B] border border-[rgba(255,203,5,0.4)] text-primary shadow-none p-[5px] px-[15px] opacity-75'
                }`}>PID</div>
              <span className={`font-bold text-[15px] transition-colors duration-200 ${mode === 'pid' ? 'text-white' : 'text-gray-text'}`}>
                Purchase Invoice Discounting
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/[0.04] pt-[18px]">
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] text-gray-light uppercase tracking-[0.3px]">Borrower</span>
                <span className={`text-[13.5px] font-semibold transition-colors duration-200 ${mode === 'pid' ? 'text-secondary' : 'text-gray-text'}`}>Retailer</span>
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] text-gray-light uppercase tracking-[0.3px]">Interest Bearer/Invoice Submitted By</span>
                <span className={`text-[13.5px] font-semibold transition-colors duration-200 ${mode === 'pid' ? 'text-white' : 'text-gray-text'}`}>Retailer</span>
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] text-gray-light uppercase tracking-[0.3px]">Invoice Details</span>
                <span className={`text-[13.5px] font-semibold transition-colors duration-200 ${mode === 'pid' ? 'text-white' : 'text-gray-text'}`}>Sales Invoice</span>
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] text-gray-light uppercase tracking-[0.3px]">Loan Disbursed To</span>
                <span className={`text-[13.5px] font-semibold transition-colors duration-200 ${mode === 'pid' ? 'text-white' : 'text-gray-text'}`}>Retailer/Seller Account</span>
              </div>
            </div>
            <div className={`absolute top-6 right-7 w-2.5 h-2.5 rounded-full border-2 transition-all duration-[400ms] ${mode === 'pid' ? 'bg-secondary border-secondary shadow-[0_0_10px_rgba(16,104,178,0.5)] scale-120' : 'bg-transparent border-gray-light'
              }`} />
          </div>
        </div>
      </section>

      {/* ROW 2: Input Parameters Form (Left Card) */}
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
              <h2 className="font-heading font-normal text-[40px] leading-[1.25] tracking-[-0.5px] text-white max-[1024px]:text-[28px] !text-2xl mb-0.5">Loan Parameters</h2>
              <p className="text-sm font-medium text-gray-text">Configure the invoice discounting transaction values</p>
            </div>
          </div>
        </div>

        <form className="flex flex-col gap-[22px]" onSubmit={(e) => e.preventDefault()}>
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
              Allowed Range: <strong className="text-white">{formatCurrency(minLimit)}</strong> to <strong className="text-white">₹2,00,00,000</strong> (2 Crore)
            </div>
          </div>

          {/* Amount Field */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="loan-amount" className="font-semibold text-[13.5px] text-gray-text">Loan Amount (₹)</label>
              {amountError && <span className="text-[11.5px] text-red-500 font-medium">{amountError}</span>}
            </div>
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-text pointer-events-none">₹</span>
              <input
                type="text"
                id="loan-amount"
                className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 pl-8 text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_12px_rgba(255,203,5,0.2)] focus:bg-black/35"
                value={loanAmountText}
                onFocus={handleAmountFocus}
                onBlur={handleAmountBlur}
                onChange={handleAmountTextChange}
                autoComplete="off"
              />
            </div>
            {/* Slider */}
            <div className="mt-2 flex flex-col gap-1.5">
              <input
                type="range"
                min={minLimit}
                max={maxLimit}
                step="100000"
                value={loanAmount}
                onChange={handleSliderChange}
                className="styled-slider w-full h-[6px] rounded-[3px] bg-white/[0.06] outline-none cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-light">
                <span>{mode === 'dbid' ? '25 Lakh' : '1 Lakh'}</span>
                <span>1 Crore</span>
                <span>2 Crore</span>
              </div>
            </div>
          </div>

          {/* Loan Date & Tenure Row */}
          <div className="grid grid-cols-2 gap-5 max-[600px]:grid-cols-1">
            <div className="flex flex-col gap-2">
              <label htmlFor="loan-date" className="font-semibold text-[13.5px] text-gray-text">Loan Date</label>
              <div className="relative w-full">
                <input
                  type="date"
                  id="loan-date"
                  className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35"
                  value={loanDateStr}
                  onChange={(e) => setLoanDateStr(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="loan-tenure" className="font-semibold text-[13.5px] text-gray-text">Tenure (Days)</label>
                {tenureError && <span className="text-[11.5px] text-red-500 font-medium">{tenureError}</span>}
              </div>
              <div className="relative w-full">
                <input
                  type="number"
                  id="loan-tenure"
                  className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 pr-[60px] text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35"
                  min="30"
                  max="60"
                  value={tenureDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setTenureDays(isNaN(val) ? '' : val);
                  }}
                  onBlur={() => {
                    let val = parseInt(tenureDays) || 60;
                    if (val < 30) {
                      val = 30;
                      triggerToast('Tenure Limit', 'Tenure days should be between 30 to 60.');
                    } else if (val > 60) {
                      val = 60;
                      triggerToast('Tenure Limit', 'Tenure days should be between 30 to 60.');
                    }
                    setTenureDays(val);
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-text pointer-events-none">Days</span>
              </div>
            </div>
          </div>

          {/* Due Date & Repayment Date Row */}
          <div className="grid grid-cols-2 gap-5 max-[600px]:grid-cols-1">
            <div className="flex flex-col gap-2 relative">
              <label className="font-semibold text-[13.5px] text-gray-text">Due Date</label>
              <div className="relative w-full">
                <input
                  type="text"
                  className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35 !bg-white/[0.01] !border-white/[0.04] text-gray-text cursor-not-allowed select-none"
                  readOnly
                  value={results.dueDateStr}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-white/[0.04] border border-white/[0.05] text-gray-light text-[10px] font-bold p-0.5 px-2 rounded uppercase">Auto</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="repayment-date" className="font-semibold text-[13.5px] text-gray-text">Repayment Date</label>
                {repaymentError && <span className="text-[11.5px] text-red-500 font-medium">{repaymentError}</span>}
              </div>
              <div className="relative w-full">
                <input
                  type="date"
                  id="repayment-date"
                  className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35"
                  value={repaymentDateStr}
                  onChange={(e) => setRepaymentDateStr(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Advanced Interest Parameters Section */}
          <div className="border-t border-[#ACACAC33] pt-4 flex flex-col gap-4">
            <button
              type="button"
              className="background-none border-none text-gray-text font-body text-xs font-semibold cursor-pointer flex justify-between items-center py-1.5 outline-none transition-colors duration-200 hover:text-white"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span>Advanced Interest Parameters</span>
              <svg
                className="transition-transform duration-[400ms]"
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-4 pt-1 animate-slide-down-fade">
                {/* Interest Rate Selector */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="interest-rate" className="font-semibold text-[13.5px] text-gray-text">Interest Rate (% p.a.)</label>
                    <span className="font-body font-medium text-xs text-secondary border border-secondary bg-secondary/[0.05] rounded-[30px] p-0.5 px-3 uppercase">
                      {(interestRateAnnual / 365).toFixed(4)}% / Day
                    </span>
                  </div>
                  <div className="relative w-full">
                    <input
                      type="number"
                      id="interest-rate"
                      className="w-full h-12 bg-black/20 border border-[#ACACAC33] rounded-2xl p-4 pr-[60px] text-white font-body text-base font-semibold outline-none transition-all duration-200 focus:border-secondary focus:shadow-[0_0_12px_rgba(16,104,178,0.2)] focus:bg-black/35"
                      min="1"
                      max="100"
                      step="0.05"
                      value={interestRateAnnual}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setInterestRateAnnual(val);
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-text pointer-events-none">%</span>
                  </div>
                </div>

                {/* Inclusive Days Toggle Switch */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-3 py-2.5">
                    <label className="relative inline-block w-[38px] h-5 flex-shrink-0 mt-[3px]">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0 peer"
                        checked={isInclusiveDays}
                        onChange={(e) => setIsInclusiveDays(e.target.checked)}
                      />
                      <span className="absolute cursor-pointer inset-0 rounded-[34px] border border-[#ACACAC33] bg-white/[0.08] transition-all duration-300 peer-checked:bg-secondary peer-checked:border-transparent before:absolute before:content-[''] before:h-3 before:w-3 before:left-[3px] before:bottom-[3px] before:rounded-full before:bg-gray-text before:transition-all before:duration-300 peer-checked:before:translate-x-[18px] peer-checked:before:bg-white" />
                    </label>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">Inclusive Days Calculation</span>
                      <span className="text-[11.5px] text-gray-light">Calculate days as (End - Start + 1)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </section>

      {/* ROW 2: Calculation Live Results & Breakdown (Right Card) */}
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
          {/* Summary Hero Display */}
          <div className="flex flex-col items-center text-center bg-black/20 border border-[#ACACAC33] rounded-[24px] p-6">
            <span className="text-xs font-bold text-gray-light uppercase tracking-[0.8px] mb-1.5">Total Amount to be Paid</span>
            <div className="font-heading text-[40px] font-extrabold text-white tracking-[-1px] mb-1.5 drop-shadow-[0_0_30px_rgba(16,104,178,0.35)]">
              {results.hasErrors ? 'N/A' : formatCurrency(results.totalToPay)}
            </div>
            <div className="text-xs text-gray-text">
              Principal <strong className="text-white">{results.hasErrors ? 'N/A' : formatCurrency(loanAmount)}</strong> + Interest <strong className="text-white">{results.hasErrors ? 'N/A' : formatCurrency(results.interestAmount)}</strong>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-[18px] max-[600px]:grid-cols-1">
            <div className="bg-white/[0.02] border border-[#ACACAC33] rounded-2xl p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-2xl bg-white/[0.03] text-gray-text flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-light font-medium">Interest Period</span>
                <span className="text-base font-bold text-white">
                  {results.hasErrors ? 'N/A' : `${results.daysCount.toFixed(2)} `}
                  {!results.hasErrors && <span className="text-[11px] text-gray-light font-medium">Days</span>}
                </span>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-[#ACACAC33] rounded-2xl p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-2xl bg-white/[0.03] text-gray-text flex items-center justify-center font-bold text-lg text-secondary">
                ₹
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-light font-medium">Interest Charge</span>
                <span className="text-base font-bold text-secondary transition-colors duration-500">
                  {results.hasErrors ? 'N/A' : formatCurrency(results.interestAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Milestone Timeline */}
          <div className="flex justify-between relative p-2.5 mt-2.5">
            <div className="absolute top-[18px] left-[8%] right-[8%] h-[2px] bg-white/[0.05] z-[1]" />

            {/* Step 1 */}
            <div className={`flex flex-col items-center text-center relative z-[2] w-[30%] ${results.hasErrors ? '' : 'passed'}`}>
              <div className={`w-4 h-4 rounded-full bg-[#171717] border-3 border-white/[0.1] mb-3 transition-all duration-500 ${!results.hasErrors ? 'bg-secondary border-secondary shadow-[0_0_12px_rgba(16,104,178,0.4)]' : ''
                }`} />
              <span className={`text-[11px] font-bold text-gray-light uppercase tracking-[0.3px] mb-0.5 ${!results.hasErrors ? '!text-secondary' : ''}`}>Loan Date</span>
              <span className={`text-xs font-semibold text-gray-text ${!results.hasErrors ? '!text-white' : ''}`}>{formatDateShort(parseUTCDate(loanDateStr))}</span>
            </div>

            {/* Step 2 */}
            <div className={`flex flex-col items-center text-center relative z-[2] w-[30%] ${results.hasErrors ? '' : 'current'}`}>
              <div className={`w-4 h-4 rounded-full bg-[#171717] border-3 border-white/[0.1] mb-3 transition-all duration-500 ${!results.hasErrors ? '!bg-white border-primary shadow-[0_0_15px_rgba(255,203,5,0.6)] scale-120' : ''
                }`} />
              <span className={`text-[11px] font-bold text-gray-light uppercase tracking-[0.3px] mb-0.5 ${!results.hasErrors ? '!text-primary' : ''}`}>Repayment</span>
              <span className={`text-xs font-semibold text-gray-text ${!results.hasErrors ? '!text-white' : ''}`}>{formatDateShort(parseUTCDate(repaymentDateStr))}</span>
              {!results.hasErrors && (
                <span className="absolute top-[-24px] bg-primary text-black text-[10px] font-extrabold p-0.5 px-2 rounded-[30px] shadow-[0_4px_10px_rgba(255,203,5,0.25)] whitespace-nowrap transition-all duration-500">{results.daysCount} Days</span>
              )}
            </div>

            {/* Step 3 */}
            <div className={`flex flex-col items-center text-center relative z-[2] w-[30%] ${results.hasErrors ? '' : 'due'}`}>
              <div className="w-4 h-4 rounded-full bg-[#171717] border-3 border-white/[0.1] mb-3 transition-all duration-500 border-white/[0.2]" />
              <span className="text-[11px] font-bold text-gray-light uppercase tracking-[0.3px] mb-0.5">Due Date</span>
              <span className="text-xs font-semibold text-gray-text">{results.dueDateStr}</span>
            </div>
          </div>

          {/* Overdue Split Breakdown Banner */}
          {!results.hasErrors && results.extraDays > 0 && (
            <div className="bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.15)] rounded-2xl p-[18px] my-[22px] shadow-[0_4px_20px_rgba(239,68,68,0.04)] animate-fade-in-up">
              <div className="flex items-center gap-2.5 text-red-500 font-bold text-sm mb-3 uppercase tracking-[0.5px]">
                <svg className="text-red-500 animate-pulse-danger" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Repayment Delayed by {results.extraDays} Day{results.extraDays > 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-col gap-2.5 border-t border-[rgba(239,68,68,0.15)] pt-3">
                <div className="flex justify-between text-sm text-gray-text">
                  <div className="flex flex-col gap-0.5">
                    <span>Standard Period Interest</span>
                    <small className="text-[11px] text-gray-light">{results.normalDays} Days @ {interestRateAnnual}% p.a. (0.05%/day)</small>
                  </div>
                  <span className="font-bold text-white">{formatCurrency(results.normalInterest)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-text">
                  <div className="flex flex-col gap-0.5">
                    <span>Delayed Period Interest (Overdue)</span>
                    <small className="text-[11px] text-gray-light">{results.extraDays} Days @ {(interestRateAnnual * 2).toFixed(2)}% p.a. (0.10%/day)</small>
                  </div>
                  <span className="font-bold text-white !text-red-500">{formatCurrency(results.extraInterest)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            id="proceed-button"
            onClick={handleProceed}
            className={`h-12 px-6 rounded-[30px] border-none font-body text-sm font-bold inline-flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 outline-none w-full ${mode === 'dbid' || mode === 'pid'
              ? 'bg-secondary text-white shadow-[0_0_30px_rgba(16,104,178,0.5)] hover:bg-primary hover:text-black hover:shadow-[0_0_30px_rgba(255,203,5,0.6)]'
              : 'bg-primary text-black shadow-[0_0_30px_rgba(255,203,5,0.5)] hover:bg-secondary hover:text-white hover:shadow-[0_0_30px_rgba(16,104,178,0.6)]'
              }`}
          >
            <span>Proceed with {mode.toUpperCase()} Application</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </section>

      {/* ROW 3: Flow Steps Visualizer */}
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
              <p className="text-sm font-medium text-gray-text">Understanding how funds and invoices move under the <span className="font-bold text-secondary">{mode.toUpperCase()}</span> program</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-5 mt-2.5 relative max-[1200px]:grid-cols-2 max-[600px]:grid-cols-1">
          {currentFlowSteps.map((step, idx) => {
            const isLast = idx === currentFlowSteps.length - 1;
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
