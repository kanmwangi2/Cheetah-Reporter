# Cheetah Reporter - IFRS Financial Statement Preparation App

A powerful, intuitive, and customizable web-based application for preparing IFRS-compliant financial statements.

## Features

### Core Features
- **Dual IFRS Standards**: Support for both Full IFRS and IFRS for SMEs
- **Trial Balance Management**: Import CSV files and map accounts to financial statements
- **Statement Generation**: Automatic generation of all four core financial statements
- **Dynamic Disclosure Engine**: Comprehensive disclosure checklists and custom notes
- **Report Preview & Export**: Live preview and PDF export functionality
- **Modern UI/UX**: Dark mode default with responsive design

### Advanced Features
- **Collaboration & User Roles**: Multi-user access with admin/editor/viewer roles
- **Audit Trail & Version History**: Comprehensive change logging
- **Commenting & Review Workflow**: Inline comments and review processes
- **Custom Report Templates**: Save and reuse report structures
- **Algorithmic Financial Analysis**: Rule-based validation and anomaly detection

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Firebase/Firestore
- **UI Components**: Radix UI + Custom components
- **Icons**: Lucide React
- **PDF Generation**: jsPDF + html2canvas
- **Data Import**: PapaParse

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

### Sample Data

A sample trial balance CSV file is provided in `public/sample-trial-balance.csv` for testing the import functionality.

## Usage

### 1. Create a New Project
- Click "Create New Financial Statement" from the dashboard
- Enter company details, reporting date, currency, and IFRS standard
- Click "Save & Continue"

### 2. Import Trial Balance
- Upload your trial balance CSV file
- Map CSV columns to required fields (Account Code, Account Name, Debit, Credit)
- System validates that debits equal credits
- Proceed to report editor

### 3. Generate Financial Statements
- Use the tabbed interface to view different statements:
  - Statement of Financial Position (SFP)
  - Profit & Loss / Other Comprehensive Income (P&L/OCI)
  - Statement of Changes in Equity (SOCE)
  - Statement of Cash Flows (SCF)
  - Notes & Disclosures

### 4. Preview and Export
- Preview the complete report in paginated format
- Export to PDF for final distribution
- Use "Roll Forward" to create next period's project

## Project Structure

```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── pages/             # Main application pages
│   └── Layout.tsx         # Main layout component
├── store/                 # Zustand state management
├── lib/                   # Utility functions
└── App.tsx               # Main application component
```

## Development Roadmap

### Phase 1: Core MVP ✅
- Basic React/Firebase application with authentication
- Trial balance import and mapping functionality  
- Financial statement generation (SFP, P&L, SOCE, SCF)
- Basic note editor and PDF export
- User collaboration and commenting system

### Phase 2: Enhanced Features (Next)
- Rule-based anomaly detection and validation
- Advanced reporting and analytics dashboard
- Mobile PWA and offline capabilities
- Template system and roll-forward functionality
- Audit trail and version history

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
