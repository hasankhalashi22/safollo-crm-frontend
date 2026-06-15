import { format } from 'date-fns';

export function exportAccountingPdf({ title, period, tableHtml, mdName, ceoName }) {
  const printWindow = window.open('', '_blank');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page { margin: 25px 30px 60px 30px; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #222; margin: 0; }
        .content { padding: 20px 30px; }
       .header { text-align: center; border-bottom: 2px solid #1A7A6E; padding-bottom: 12px; margin-bottom: 4px; }
        .logo { height: 55px; margin-bottom: 8px; }
        .header h1 { font-size: 18px; color: #1A7A6E; margin: 0 0 4px 0; }
        .header h2 { font-size: 14px; margin: 0 0 2px 0; }
        .header p { margin: 0; font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #1A7A6E; color: white; padding: 8px; text-align: left; font-size: 11px; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
        tr:nth-child(even) { background: #f9f9f9; }
        tfoot td { font-weight: bold; border-top: 2px solid #ccc; }
        .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
        .sign-box { text-align: center; width: 220px; }
        .sign-line { border-top: 1px solid #333; margin-bottom: 6px; }
        .sign-name { font-weight: bold; font-size: 12px; min-height: 16px; }
        .sign-title { font-size: 11px; color: #555; }
        .footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          font-size: 9px;
          color: #999;
          text-align: center;
          padding: 6px 0;
          border-top: 1px solid #eee;
        }
        @media print { .content { padding: 0 30px; } }
      </style>
    </head>
    <body>
      <div class="content">
       <div class="header">
          <img src="https://safollo-crm-frontend.vercel.app/logo.png" class="logo" alt="Safollo Academy" />
          <h1>Safollo Academy</h1>
          <h2>${title}</h2>
          <p>Period: ${period}</p>
        </div>

        ${tableHtml}

        <div class="signatures">
          <div class="sign-box">
            <div class="sign-line"></div>
            <div class="sign-name">${mdName || ''}</div>
            <div class="sign-title">Managing Director</div>
          </div>
          <div class="sign-box">
            <div class="sign-line"></div>
            <div class="sign-name">${ceoName || ''}</div>
            <div class="sign-title">Chief Executive Officer (CEO)</div>
          </div>
        </div>
      </div>

      <div class="footer">
        Generated online — ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}