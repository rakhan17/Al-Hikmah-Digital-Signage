import React from 'react';
import type { FinanceSummary } from '../types/signage';

interface RunningTextFooterProps {
  finances?: FinanceSummary;
  financeSummary?: FinanceSummary;
}

export const RunningTextFooter: React.FC<RunningTextFooterProps> = ({
  finances,
  financeSummary,
}) => {
  const fin = finances || financeSummary;

  const copyrightText = "© 2026 Al Hikmah Digital Signage │ Powered by Decablue Society │ Developed by Rakhan Ataya Prayetno. All Rights Reserved.";

  return (
    <footer className="tv-footer-wrapper">
      {/* 100% Dedicated Finance & Kas Masjid Marquee Ticker */}
      <div className="tv-footer-ticker-row">
        <div className="marquee-container">
          <div className="marquee-text">
            {fin ? (
              <>
                <span className="marquee-item">
                  <strong>SALDO KAS MASJID:</strong> &nbsp;&nbsp;&nbsp;Rp {fin.balance.toLocaleString('id-ID')}
                </span>

                {fin.monthlyIncome !== undefined && (
                  <span className="marquee-item">
                    <strong>PEMASUKAN BULAN INI (Total Rp {fin.monthlyIncome.toLocaleString('id-ID')}):</strong> &nbsp;&nbsp;&nbsp;
                    {fin.monthlyIncomes && fin.monthlyIncomes.length > 0 ? (
                      fin.monthlyIncomes.map((item, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span style={{ padding: '0 24px' }}></span>}
                          <span>{item.description}: &nbsp;&nbsp;&nbsp;Rp {item.totalAmount.toLocaleString('id-ID')}</span>
                        </React.Fragment>
                      ))
                    ) : (
                      'Belum ada rincian transaksi'
                    )}
                  </span>
                )}

                {fin.monthlyExpense !== undefined && (
                  <span className="marquee-item">
                    <strong>PENGELUARAN BULAN INI (Total Rp {fin.monthlyExpense.toLocaleString('id-ID')}):</strong> &nbsp;&nbsp;&nbsp;
                    {fin.monthlyExpenses && fin.monthlyExpenses.length > 0 ? (
                      fin.monthlyExpenses.map((item, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span style={{ padding: '0 24px' }}></span>}
                          <span>{item.description}: &nbsp;&nbsp;&nbsp;Rp {item.totalAmount.toLocaleString('id-ID')}</span>
                        </React.Fragment>
                      ))
                    ) : (
                      'Belum ada rincian transaksi'
                    )}
                  </span>
                )}

                <span className="marquee-item">
                  <strong>TOTAL PEMASUKAN KESELURUHAN:</strong> &nbsp;&nbsp;&nbsp;Rp {fin.totalIncome.toLocaleString('id-ID')}
                </span>

                <span className="marquee-item">
                  <strong>TOTAL PENGELUARAN KESELURUHAN:</strong> &nbsp;&nbsp;&nbsp;Rp {fin.totalExpense.toLocaleString('id-ID')}
                </span>
              </>
            ) : (
              <span className="marquee-item">
                Memuat Informasi Keuangan Kas Masjid...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Elegant Small Copyright Sub-bar Below Running Text */}
      <div className="tv-footer-copyright-subbar">
        {copyrightText}
      </div>
    </footer>
  );
};
