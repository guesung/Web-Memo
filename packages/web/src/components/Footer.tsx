import { URL } from '@extension/shared/constants';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer bg-neutral text-neutral-content p-10">
      <nav>
        <h6 className="footer-title">Services</h6>
        <Link className="link link-hover" href={URL.chromeStore}>
          Chrome Extension
        </Link>
      </nav>
    </footer>
  );
}
