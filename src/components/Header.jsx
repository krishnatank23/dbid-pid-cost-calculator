import React from 'react';

export default function Header({ activePage }) {
  const getPageInfo = () => {
    switch (activePage) {
      case 'page1':
        return {
          titleMain: 'Distributor/Purchase Invoice ',
          titleAccent: 'Discounting',
          subtitle: 'Accelerate cash flow through strategic invoice financing models',
        };
      case 'page2':
        return {
          titleMain: 'Supply Chain ',
          titleAccent: 'Financing',
          subtitle: 'Optimize liquidity and working capital with tailored supply chain finance solutions',
        };
      case 'page3':
        return {
          titleMain: 'Distributor Term ',
          titleAccent: 'Loan (DBTL)',
          subtitle: 'Configure term-lending options, amortized interest, and repayment schedules',
        };
      default:
        return {
          titleMain: 'Wofi ',
          titleAccent: 'Platform',
          subtitle: 'Smart Invoice Discounting Platform',
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="flex justify-between items-center mb-10 max-[992px]:flex-col max-[992px]:items-start max-[992px]:gap-5">
      {/* Title block */}
      <div className="flex flex-col">
        <h1 className="font-heading font-extrabold text-3xl tracking-tight max-[1024px]:text-2xl leading-none">
          <span className="text-secondary">{pageInfo.titleMain}</span>
          <span className="text-primary">{pageInfo.titleAccent}</span>
        </h1>
        <p className="font-body text-sm font-medium text-gray-text mt-1.5">
          {pageInfo.subtitle}
        </p>
      </div>
    </header>
  );
}
