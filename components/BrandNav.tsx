import Image from "next/image";

export function BrandNav({ context = "Private voice demo" }: { context?: string }) {
  return (
    <nav className="brand-nav motion-reveal" aria-label="BoroTech">
      <a className="brand-lockup" href="https://borotechsolution.com/" target="_blank" rel="noreferrer">
        <Image className="brand-logo" src="/borotech-logo.svg" alt="BoroTech Solution" width={134} height={54} />
        <span className="brand-link-label">BoroTech workspace</span>
      </a>
      <div className="brand-nav-right">
        <span className="nav-copy">
          <span className="nav-copy-kicker">Secure area</span>
          {context}
        </span>
        <span className="brand-dot" aria-hidden="true" />
      </div>
    </nav>
  );
}
