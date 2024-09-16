import Link from 'next/link';

interface FooterProps {}
export default function Footer() {
  return (
    <footer className="footer bg-neutral text-neutral-content p-10">
      <nav>
        <h6 className="footer-title">Services</h6>
        <Link
          className="link link-hover"
          href="https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh">
          Chrome Extension
        </Link>
      </nav>
    </footer>
  );
}
