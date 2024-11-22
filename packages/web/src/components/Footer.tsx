import { URL_CHROME_STORE } from '@extension/shared/constants';
import Link from 'next/link';

interface FooterProps {}
export default function Footer() {
  return (
    <footer className="footer bg-neutral text-neutral-content p-10">
      <nav>
        <h6 className="footer-title">Services</h6>
        <Link className="link link-hover" href={URL_CHROME_STORE}>
          Chrome Extension
        </Link>
      </nav>
    </footer>
  );
}
