'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import Link from 'next/link'

export default function FAQs() {
    const faqItems = [
        {
            id: 'item-1',
            question: 'How does Sage connect to my bank accounts?',
            answer: 'Sage uses Plaid, a secure and trusted financial data platform, to connect to your bank accounts. Your credentials are encrypted and never stored on our servers.',
        },
        {
            id: 'item-2',
            question: 'Is my financial data safe?',
            answer: 'Absolutely. We use bank-level encryption and security measures to protect your data. Your information is encrypted both in transit and at rest, and we never sell your data to third parties.',
        },
        {
            id: 'item-3',
            question: 'What makes Sage different from other budgeting apps?',
            answer: 'Sage combines AI-powered insights with real-time tracking and predictive analytics. Our chatbot learns your spending patterns and can answer "what-if" scenarios to help you make smarter financial decisions.',
        },
        {
            id: 'item-4',
            question: 'Can I try Sage for free?',
            answer: 'Yes! We offer a free trial so you can explore all of Sage\'s features. No credit card required to get started.',
        },
        {
            id: 'item-5',
            question: 'How does the anomaly detection work?',
            answer: 'Our AI analyzes your typical spending patterns and alerts you to unusual transactions that might indicate fraud or billing errors. You can customize sensitivity levels to match your preferences.',
        },
    ]

    return (
        <section id="faqs" className="py-16 md:py-24 scroll-mt-20">
            <div className="mx-auto max-w-7xl px-4 md:px-6">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">Frequently Asked Questions</h2>
                    <p className="text-muted-foreground mt-4 text-balance">Discover quick and comprehensive answers to common questions about Sage and how it can transform your financial life.</p>
                </div>

                <div className="mx-auto mt-12 max-w-3xl">
                    <Accordion
                        type="single"
                        collapsible
                        className="bg-transparent w-full rounded-2xl border px-8 py-3">
                        {faqItems.map((item) => (
                            <AccordionItem
                                key={item.id}
                                value={item.id}
                                className="border-dashed">
                                <AccordionTrigger className="cursor-pointer text-base hover:no-underline">{item.question}</AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-base">{item.answer}</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    <p className="text-muted-foreground mt-6 px-8">
                        Can&apos;t find what you&apos;re looking for? Contact our{' '}
                        <Link
                            href="#"
                            className="text-primary font-medium hover:underline">
                            customer support team
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}
