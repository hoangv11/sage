import { NextResponse } from 'next/server';
import { sendAnomalyEmail } from '@/lib/utils/email';

export async function POST(request: Request) {
  try {
    const { to, highSpendingAnomalies, lowSpendingAnomalies } = await request.json();

    if (!to || !highSpendingAnomalies || !lowSpendingAnomalies) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await sendAnomalyEmail(to, highSpendingAnomalies, lowSpendingAnomalies);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
