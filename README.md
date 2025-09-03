# Report.AI - AI-Powered Marketing Campaign Analysis Platform

## 🚀 Overview

Report.AI is a sophisticated web application that leverages artificial intelligence to analyze digital marketing campaign performance. It integrates with Lumina API for campaign data extraction and uses advanced AI models (Claude, GPT, Gemini) to generate comprehensive, actionable insights.

## ✨ Key Features

### 📊 Campaign Analysis
- **Automated Data Extraction**: Seamlessly fetches campaign data from Lumina API
- **Multi-Model AI Support**: Choose from Claude, GPT-5, or Gemini models for analysis
- **Tactic Detection**: Automatically identifies and categorizes marketing tactics
- **Performance Metrics**: Comprehensive analysis of campaign effectiveness

### 📝 Report Generation
- **Customizable Sections**: Define and manage report sections through Schema Admin
- **AI-Powered Insights**: Generate executive summaries, performance analysis, and recommendations
- **CSV Data Processing**: Upload and process campaign performance data
- **Benchmark Comparisons**: Compare campaign performance against industry standards

### 🛠️ Schema Administration
- **Visual Schema Management**: Intuitive interface for managing tactic hierarchies
- **Report Sections Manager**: Create custom report sections with AI instructions
- **AI Testing Interface**: Test and validate AI outputs before production use
- **Export/Import**: Full schema export and backup capabilities

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 with custom design system
- **Backend**: PHP 7.4+
- **Database**: MySQL (optional Supabase integration)
- **AI Models**: Anthropic Claude, OpenAI GPT-5, Google Gemini
- **APIs**: Lumina Campaign API, Multiple AI provider APIs

### Project Structure
```
report-ai/
├── index.html              # Main application entry point
├── script.js               # Core application logic
├── style.css               # Main stylesheet with design tokens
├── /docs                   # Documentation and guides
├── /context/
│   ├── /api/              # PHP API endpoints
│   │   ├── config.php     # Configuration utilities
│   │   ├── lumina.php     # Campaign data integration
│   │   ├── tactics.php    # Tactic detection engine
│   │   └── analyze.php    # AI analysis endpoint
│   ├── /creative-docs/    # Design system documentation
│   └── /schema/           # Tactic schemas and configurations
├── /schema-admin/          # Admin interface
│   ├── /sections-manager/ # Report sections configuration
│   └── /ai-testing/       # AI model testing interface
└── /uploads/              # CSV file storage
```

## 🚦 Getting Started

### Prerequisites
- PHP 7.4 or higher
- MySQL database (or Supabase account)
- API keys for AI providers (Anthropic, OpenAI, or Google)
- Web server (Apache/Nginx)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/edwinlov3tt/report-ai.git
cd report-ai
```

2. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys and database credentials
```

3. **Set up the database**
```bash
# Import the database schema
mysql -u your_user -p your_database < schema/database.sql
```

4. **Configure your web server**
```apache
# Apache .htaccess example
RewriteEngine On
RewriteRule ^api/(.*)$ context/api/$1 [L]
```

5. **Access the application**
- Main App: `http://localhost/report-ai/`
- Schema Admin: `http://localhost/report-ai/schema-admin/`
- Documentation: `http://localhost/report-ai/docs/`

## 📖 Usage Guide

### Basic Workflow

1. **Enter Campaign URL**
   - Navigate to the main application
   - Enter a Lumina campaign URL
   - Click "Generate Report"

2. **Configure Company Settings**
   - Set company name and context
   - Choose report tone and style
   - Select AI model and parameters

3. **Upload Performance Data** (Optional)
   - Upload CSV files with campaign metrics
   - System automatically routes files to appropriate tactics
   - Review and validate data mapping

4. **Generate Analysis**
   - Click "Generate Analysis"
   - AI processes all data and generates insights
   - Review comprehensive report with recommendations

### Schema Administration

Access the Schema Admin interface to:
- Manage product/subproduct hierarchies
- Configure report sections
- Test AI outputs
- Export/import schemas

## 🎨 Design System

The application follows a comprehensive design system with:
- **Primary Color**: #CF0E0F (Bold red for urgency and action)
- **Typography**: System font stack with clear hierarchy
- **Spacing**: 8px base grid system
- **Components**: Consistent buttons, cards, inputs, and modals

See `/context/creative-docs/ui-overview.md` for complete design specifications.

## 🔧 Configuration

### Environment Variables
```env
# AI Model Configuration
DEFAULT_AI_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=your-api-key
GOOGLE_AI_API_KEY=your-api-key
OPENAI_API_KEY=your-api-key

# Database Configuration
DB_HOST=localhost
DB_NAME=report_ai
DB_USER=your_user
DB_PASS=your_password
DB_PORT=3306

# Optional Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/lumina.php` | POST | Fetch campaign data |
| `/api/tactics.php` | POST | Detect campaign tactics |
| `/api/analyze.php` | POST | Generate AI analysis |
| `/api/sections.php` | GET/POST | Manage report sections |
| `/api/models.php` | GET | List available AI models |

## 🔒 Security

- All API keys stored in environment variables
- Input sanitization on all user inputs
- CORS configuration for API endpoints
- SQL injection prevention
- XSS protection

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Use the design system tokens for UI work
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Team

- **Lead Developer**: Edwin Lovett III
- **Project Repository**: [github.com/edwinlov3tt/report-ai](https://github.com/edwinlov3tt/report-ai)

## 📞 Support

For support, please contact the development team or open an issue on GitHub.

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- Schema administration interface
- AI testing capabilities
- Multi-model support
- Comprehensive design system

---

Built with ❤️ for marketing professionals who demand data-driven insights.# ignite-report-ai
