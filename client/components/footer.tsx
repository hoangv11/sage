import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t w-full">
      <div className="w-full px-12 py-12">
        <div className="mx-auto max-w-5xl flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <Image src="/sage-logo.svg" alt="Sage" width={48} height={48} />
            <span className="font-semibold text-lg">Sage</span>
          </div>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sage. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
