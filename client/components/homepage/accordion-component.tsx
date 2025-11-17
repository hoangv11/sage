import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function AccordionComponent() {
  const faqs = [
    {
      question: "What is included in the starter kit?",
      answer: "Our starter kit includes authentication, payment processing, database integration, email functionality, and a beautiful UI built with shadcn/ui and Tailwind CSS.",
    },
    {
      question: "Do you offer refunds?",
      answer: "Yes, we offer a 30-day money-back guarantee. If you're not satisfied with the starter kit, contact us for a full refund.",
    },
    {
      question: "Can I use this for commercial projects?",
      answer: "Absolutely! Once you purchase the starter kit, you have the rights to use it in unlimited personal and commercial projects.",
    },
    {
      question: "Do you provide updates?",
      answer: "Yes, all purchases include lifetime updates. We regularly add new features and improvements to the starter kit.",
    },
    {
      question: "What kind of support do you offer?",
      answer: "We offer email support for all customers. Priority support with faster response times is available for premium plan subscribers.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
        <p className="text-muted-foreground">
          Find answers to common questions about our pricing and services
        </p>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-left">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
