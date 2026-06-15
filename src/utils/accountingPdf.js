import { format } from 'date-fns';

export function exportAccountingPdf({ title, period, tableHtml }) {
  const printWindow = window.open('', '_blank');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Noto Sans Bengali', Arial, sans-serif; font-size: 12px; padding: 30px; color: #222; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1A7A6E; padding-bottom: 12px; margin-bottom: 4px; }
        .header-left h1 { font-size: 18px; color: #1A7A6E; margin: 0 0 4px 0; }
        .header-left h2 { font-size: 14px; margin: 0 0 2px 0; }
        .header-left p { margin: 0; font-size: 11px; color: #666; }
        .logo { height: 55px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #1A7A6E; color: white; padding: 8px; text-align: left; font-size: 11px; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
        tr:nth-child(even) { background: #f9f9f9; }
        tfoot td { font-weight: bold; border-top: 2px solid #ccc; }
        .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
        .sign-box { text-align: center; width: 220px; }
        .sign-line { border-top: 1px solid #333; margin-bottom: 6px; }
        .sign-name { font-weight: bold; font-size: 12px; }
        .sign-title { font-size: 11px; color: #555; }
        .footer { margin-top: 40px; padding-top: 8px; border-top: 1px solid #eee; font-size: 9px; color: #999; text-align: center; }
        @media print { body { padding: 15px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>সাফল্য একাডেমি</h1>
          <h2>${title}</h2>
          <p>পিরিয়ড: ${period}</p>
        </div>
        <img src="https://safollo-crm-frontend.vercel.app/logo.png" class="logo" alt="Safollo Academy" />
      </div>

      ${tableHtml}

      <div class="signatures">
        <div class="sign-box">
          <div class="sign-line"></div>
          <div class="sign-name">Md. Rubel Miah</div>
          <div class="sign-title">Managing Director</div>
        </div>
        <div class="sign-box">
          <div class="sign-line"></div>
          <div class="sign-name">Mahmud Hasan</div>
          <div class="sign-title">Chief Executive Officer (CEO)</div>
        </div>
      </div>

      <div class="footer">
        অনলাইনে তৈরি — ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}