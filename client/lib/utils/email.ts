import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface Anomaly {
  amount: number;
  date: string;
  normal_range: [number, number];
  percent_deviation: number;
  transaction_id: string;
}

export async function sendAnomalyEmail(
  to: string, 
  highSpendingAnomalies: Anomaly[],
  lowSpendingAnomalies: Anomaly[]
) {
  const subject = `Spending Anomalies Detected`;
  const html = `
    <h2>Spending Anomaly Alert</h2>
    ${highSpendingAnomalies.length > 0 ? `
      <h3 style="color: #e11d48;">High Spending Anomalies</h3>
      <p>We've detected unusually high spending activity in your account:</p>
      ${highSpendingAnomalies.map(anomaly => `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e11d48; border-radius: 5px; background-color: #fff1f2;">
          <h4 style="color: #e11d48;">Transaction Details</h4>
          <ul>
            <li>Amount: $${anomaly.amount.toFixed(2)}</li>
            <li>Date: ${new Date(anomaly.date).toLocaleDateString()}</li>
            <li>Deviation: ${anomaly.percent_deviation.toFixed(2)}% above normal range</li>
            <li>Normal spending range: $${anomaly.normal_range[0].toFixed(2)} - $${anomaly.normal_range[1].toFixed(2)}</li>
          </ul>
        </div>
      `).join('')}
    ` : ''}
    
    ${lowSpendingAnomalies.length > 0 ? `
      <h3 style="color: #059669;">Low Spending Anomalies</h3>
      <p>We've detected unusually low spending activity in your account:</p>
      ${lowSpendingAnomalies.map(anomaly => `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #059669; border-radius: 5px; background-color: #ecfdf5;">
          <h4 style="color: #059669;">Transaction Details</h4>
          <ul>
            <li>Amount: $${anomaly.amount.toFixed(2)}</li>
            <li>Date: ${new Date(anomaly.date).toLocaleDateString()}</li>
            <li>Deviation: ${anomaly.percent_deviation.toFixed(2)}% below normal range</li>
            <li>Normal spending range: $${anomaly.normal_range[0].toFixed(2)} - $${anomaly.normal_range[1].toFixed(2)}</li>
          </ul>
        </div>
      `).join('')}
    ` : ''}
    
    <p>Please review these transactions and contact us if you don't recognize any of them.</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    console.log('Anomaly alert email sent successfully');
  } catch (error) {
    console.error('Failed to send anomaly alert email:', error);
    throw new Error('Failed to send anomaly alert email');
  }
}
