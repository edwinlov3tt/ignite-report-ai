import { Link } from 'react-router-dom'
import { Layers, FileText } from 'lucide-react'

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-links">
          <Link
            to="/schema-admin"
            className="footer-link"
          >
            <Layers className="footer-icon" />
            Schema Admin
          </Link>
          <span className="footer-separator">|</span>
          <a
            href="https://ignite.edwinlovett.com/report-ai/docs/"
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="footer-icon" />
            Documentation
          </a>
        </div>
        <div className="footer-copyright">
          © 2025 Campaign Performance Analyzer
        </div>
      </div>
    </footer>
  )
}
