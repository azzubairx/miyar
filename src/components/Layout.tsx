import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { CloseIcon, MenuIcon } from './Icons';
import { meta } from '../database';

const NAV = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/food', label: 'الغذاء' },
  { to: '/cosmetics', label: 'التجميل' },
  { to: '/knowledge', label: 'قاعدة المعرفة' },
  { to: '/methodology', label: 'المنهجية' },
  { to: '/sources', label: 'المصادر' },
  { to: '/about', label: 'عن المنصة' },
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
        <rect x="1" y="1" width="38" height="38" rx="6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 28V13l8 9 8-9v15" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        <circle cx="20" cy="31.5" r="1.6" fill="currentColor" />
      </svg>
    </span>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="مِعيار — الصفحة الرئيسية">
          <BrandMark />
          <span className="brand-text">
            <strong>مِعيار</strong>
            <small>تقييم مستقل · أدلة موثقة</small>
          </span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          <span>{open ? 'إغلاق' : 'القائمة'}</span>
        </button>

        <nav id="site-nav" className={`site-nav ${open ? 'is-open' : ''}`} aria-label="التنقل الرئيسي">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <BrandMark />
          <div>
            <strong>مِعيار</strong>
            <p>منصة عربية مستقلة تقرأ الملصق بالعلم، لا بالشعارات.</p>
          </div>
        </div>

        <div className="footer-col">
          <h3>المنصة</h3>
          <Link to="/food">تحليل غذائي</Link>
          <Link to="/cosmetics">تحليل تجميلي</Link>
          <Link to="/report">التقرير</Link>
          <Link to="/knowledge">قاعدة المعرفة</Link>
        </div>

        <div className="footer-col">
          <h3>الشفافية</h3>
          <Link to="/methodology">المنهجية</Link>
          <Link to="/sources">المصادر</Link>
          <Link to="/changelog">سجل التغييرات</Link>
          <Link to="/about">عن المنصة</Link>
        </div>

        <div className="footer-col footer-meta">
          <h3>الإصدار</h3>
          <p>قاعدة المعرفة {meta.version}</p>
          <p>آخر مراجعة: {meta.updated}</p>
          <p className="footer-note">
            لا تُغني هذه المنصة عن الاستشارة الطبية أو الغذائية، ولا تصدر حكمًا على سلامة منتج بعينه.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} مِعيار — محتوى عربي، منهجية مفتوحة.</span>
        <span>لا درجات تجميلية مركبة. لا أحكام بلا دليل.</span>
      </div>
    </footer>
  );
}

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        تجاوز إلى المحتوى
      </a>
      <Header />
      <main id="main" className="site-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
