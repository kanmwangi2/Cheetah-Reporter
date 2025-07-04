# IFRS Financial Statement Preparation App

## 1. Purpose

To provide accountants, auditors, and finance professionals with a powerful, intuitive, and customizable web-based application for preparing IFRS-compliant financial statements. The app aims to automate the tedious aspects of report generation, from data import to final output, while offering deep customization and collaboration to meet specific reporting needs for both Full IFRS and IFRS for SMEs.

## 2. Core Features

### Dual IFRS Standards
Select between "Full IFRS" or "IFRS for SMEs" at the project level, with corresponding disclosure checklists.

### Trial Balance Management
- Import trial balance (TB) from CSV files
- Intuitive interface to map TB accounts to financial statement line items
- Validate TB (debits must equal credits)

### Statement Generation
Automatically generate drafts of:
- Statement of Financial Position
- Statement of Profit or Loss and Other Comprehensive Income
- Statement of Changes in Equity
- Statement of Cash Flows (Indirect Method)

### Dynamic Disclosure Engine
- Select required disclosures from a comprehensive checklist
- Edit the text and tables within standard disclosures
- Create and insert fully custom notes with a rich text editor and table builder

### Report Preview & Export
- Live, paginated HTML preview that mirrors the final document
- One-click PDF export of the complete, professionally formatted financial statements

### Period-End Workflow
- Save and manage multiple reporting projects
- "Roll Forward" feature to carry closing balances from one period to the next as comparative figures

### Modern UI/UX
- Default dark mode for comfortable viewing
- Easy-to-use theme toggle for switching to light mode
- Fully responsive design for use on any device

## 3. Proposed Tech Stack

### Frontend Framework
**React** (using Vite for a fast development environment). Its component-based architecture is ideal for managing the complexity of the UI.

### Styling
**Tailwind CSS** for a utility-first, highly customizable design system. Complemented by **shadcn/ui** for pre-built, accessible components (like modals, buttons, inputs) and **Lucide React** for icons.

### State Management
**Zustand** - A simple, fast, and scalable state management solution perfect for managing global state like the current project data, trial balance, and UI settings (e.g., theme).

### Database / Backend
**Firebase (Firestore)** - For user authentication, collaborative features, and storing all project data, including trial balances, mappings, custom disclosures, and generated reports. This enables the "save" and "roll forward" features.

### Data Import
**PapaParse** library for robust in-browser CSV file parsing.

### PDF Generation
**jsPDF** and **html2canvas** - html2canvas will capture the styled HTML preview pane, and jsPDF will convert that capture into a multi-page PDF document, ensuring the PDF looks exactly like the preview.

## 4. App Architecture & Page Descriptions

The application will be a Single Page Application (SPA) with different views rendered based on the user's navigation.

### Page 1: Dashboard / Home
**Description:** The main landing page after login. It serves as the central hub for managing reporting projects.

**Features:**
- A grid or list view of all existing financial statement projects. Each item shows the company name, reporting period, and last modified date
- A prominent "Create New Financial Statement" button
- A search bar to find specific projects
- Theme toggle (moon/sun icon) in the header

**Data:** Fetches the list of projects from the Firestore database where the user is a collaborator.

### Page 2: Project Setup & Configuration
**Description:** A modal or dedicated page that appears when creating a new project.

**Features:**
- Input fields for: Company Name, Reporting Period End Date, Currency
- A crucial radio button selection: [ ] Full IFRS or [ ] IFRS for SMEs
- "Save & Continue" button

**Data:** Creates a new project document in Firestore with this initial configuration.

### Page 3: Data Import & Mapping
**Description:** A guided, multi-step interface for importing and preparing the trial balance.

**Features:**
- **Step 1: Upload** - A file dropzone for the trial balance CSV file
- **Step 2: Map Columns** - The user maps their CSV columns to Account Code, Account Name, Debit, Credit
- **Step 3: Map Accounts** - A two-panel view to assign imported accounts to the standard IFRS financial statement structure
- **Validation** - Real-time check to ensure the TB balances

**Data:** The parsed CSV data is held in the Zustand store. Once mapping is complete, the mapped structure is saved to the project document in Firestore.

### Page 4: Report Editor (Multi-tab Interface)
**Description:** The main workspace for building the report.

**Features:**
- **Tabs:** SFP, P&L/OCI, SOCE, SCF, Notes
- **Financial Statement Tabs:** Displays the respective statements with numbers populated from the mapped TB
- **Notes & Disclosures Tab:** A sidebar with a checklist of disclosures and a main editor for the selected note
- **Collaboration:** A "Share" button in the header to invite other users. An activity feed showing recent changes

### Page 5: Preview & Export
**Description:** A read-only, paginated preview of the final report.

**Features:**
- Renders the complete report as it will appear in the PDF
- "Export to PDF" button
- "Roll Forward to Next Period" button
- "View History / Audit Trail" button

## 5. Additional High-Impact Features

### Feature 1: Collaboration & User Roles
**Description:** Allow multiple users to access and work on the same financial statement project simultaneously.

**Implementation:**
- **Invite System:** An "Invite" button on the project dashboard allows the project owner to add collaborators via email
- **User Roles:**
  - **Admin:** Can manage users, edit all data, and delete the project
  - **Editor:** Can edit the financial statements and notes but cannot manage users
  - **Viewer:** Can only view the data and preview the report; cannot make any changes
- **Real-time Updates:** Use Firestore's real-time listeners to ensure that changes made by one user are instantly visible to all other collaborators

### Feature 2: Audit Trail & Version History
**Description:** A comprehensive log of all changes made to a project, providing accountability and a safety net.

**Implementation:**
- **Change Logging:** For every significant action (e.g., mapping an account, editing a note, changing a value), create a log entry in a sub-collection in Firestore. The log should capture userId, timestamp, actionType, and dataChanged (before and after values)
- **Version Snapshot:** Periodically, or on-demand, the user can save a "version" of the entire report
- **UI:** A dedicated "History" panel or modal that displays the audit trail in a human-readable format (e.g., "John Doe updated the PPE note at 4:15 PM"). It would also allow users to compare versions and restore a previous version if needed

### Feature 3: Commenting & Review Workflow
**Description:** A communication tool built directly into the report editor to streamline the review process.

**Implementation:**
- **Inline Comments:** Users can click on any line item, table cell, or paragraph to add a comment. The comment is anchored to that specific element
- **Comment Threads:** Comments support replies, creating threads for discussion
- **Status:** Comments can be marked as "Open" or "Resolved"
- **UI:** A sidebar lists all comments on the current report section. Clicking a comment scrolls the user to the relevant part of the document

### Feature 4: Custom Report Templates
**Description:** Allows users or firms to save the structure and customizations of a completed report as a template for future use.

**Implementation:**
- **Save as Template:** In the project dashboard, an option to "Create Template from this Project"
- **Template Data:** This saves the account mapping structure, selected disclosures, custom notes (with placeholder text/values), and formatting
- **New Project from Template:** When creating a new project, the user can select from their saved templates, which pre-configures the entire report structure, saving significant setup time

### Feature 5: Financial Analysis & Validation
**Description:** Use mathematical algorithms and business rules to provide reliable insights and validation.

**Implementation:**
- **Rule-Based Anomaly Detection:** Flag unusual account movements, ratio outliers, or data inconsistencies
- **Standards-Based Disclosure Engine:** Suggest IFRS disclosures based on account balances and thresholds
- **Ratio Analysis:** Calculate and display key financial ratios with trend analysis
- **Variance Analysis Tools:** Identify and highlight significant changes between periods
- **Template-Based Note Generation:** Auto-populate disclosure templates with relevant financial data

### Feature 6: Reporting & Analytics
**Description:** Comprehensive reporting capabilities beyond basic financial statements.

**Implementation:**
- **Multi-Period Comparisons:** Side-by-side comparison of multiple years of financial data
- **Variance Analysis:** Automated calculation and highlighting of significant variances between periods
- **Trend Analysis:** Visual charts showing key metrics trends over time
- **Executive Dashboard:** High-level KPI dashboard with drill-down capabilities
- **Custom Report Builder:** Interface to create custom financial reports and presentations

### Feature 7: Data Integration & Automation
**Description:** Streamline data collection and reduce manual entry through automated processes.

**Implementation:**
- **Pattern Recognition for Data Import:** Algorithm-based parsing to automatically detect and map common CSV formats
- **Multi-Currency Support:** Automatic currency conversion with exchange rates
- **Recurring Journal Entries:** Template and automate recurring adjustments and reclassifications
- **Data Validation Engine:** Business rules to automatically validate data integrity and flag inconsistencies
- **Bulk Import Tools:** Enhanced import capabilities with intelligent column mapping

### Feature 8: Regulatory Compliance
**Description:** Stay current with evolving IFRS standards and regulatory requirements.

**Implementation:**
- **Standards Update Notifications:** Automatic alerts when new IFRS standards are released
- **Compliance Checklist Engine:** Dynamic checklists that update based on applicable standards
- **Impact Assessment Tools:** Analyze how new standards affect existing financial statements

## 6. Advanced Business Features

### Consolidation Engine
A comprehensive module to handle group financial statements:
- Import multiple trial balances from subsidiaries
- Post consolidation adjustments (elimination of intercompany balances, goodwill)
- Generate consolidated financial statements with detailed consolidation worksheets
- Support for different consolidation methods (full consolidation, equity method)
- Multi-currency consolidation with translation adjustments

## 7. User Workflow Examples

### Scenario 1: Quarterly Reporting
1. **Smart Data Import:** Manager uploads trial balance, validation flags potential inconsistencies
2. **Automated Disclosure Suggestions:** System suggests relevant IFRS disclosures based on account balances
3. **Collaborative Review:** CFO reviews and provides feedback through comment system
4. **Real-time Analytics:** Executive dashboard shows ratio changes as adjustments are made

### Scenario 2: Year-End Consolidation
1. **Multi-Entity Setup:** Parent company creates project, invites subsidiary accountants as editors
2. **Parallel Processing:** Multiple subsidiaries work simultaneously on their statements
3. **Automated Consolidation:** System eliminates intercompany transactions and calculates goodwill
4. **Currency Translation:** Multi-currency support with exchange rate management
5. **Group Review:** Group CFO reviews consolidated statements with variance analysis
6. **Standards Compliance:** One-click generation of compliant financial statements

### Scenario 3: Template-Driven Efficiency
1. **Template Selection:** New client setup using industry-specific template
2. **Automated Mapping:** System suggests account mappings based on template structure
3. **Industry Standards:** System compares ratios to standard industry metrics
4. **Automated Disclosures:** Standard notes pre-populated based on trial balance data
5. **Quality Assurance:** Built-in validation rules catch common errors before review
6. **Client Review:** Secure client access to view draft statements and provide feedback


## 8. Implementation Guide

### Project Setup
Build a React application using Vite, Tailwind CSS, Zustand, and Firebase.

**Initial Setup Commands:**
```bash
npm create vite@latest cheetah-reporter -- --template react-ts
cd cheetah-reporter
npm install
npm install @tailwindcss/forms @tailwindcss/typography
npm install zustand firebase
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install lucide-react react-hook-form papaparse
npm install jspdf html2canvas
```

### Firebase/Firestore Data Model

#### `projects` collection:
```javascript
{
  companyName: string,
  reportingDate: timestamp,
  ifrsStandard: 'full' | 'sme',
  collaborators: { [userId: string]: 'admin' | 'editor' | 'viewer' },
  trialBalance: { rawData: object[], mappings: object },
  notes: { [noteId: string]: { content: string, order: number } },
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

#### Sub-collections within each project document:
- **`audit_trail`:** Documents with fields userId, timestamp, action, details
- **`comments`:** Documents with fields elementId, threadId, userId, text, status

#### `templates` collection:
Store user-generated templates for reuse across projects.

### Component Structure

**Core Components:**
- **`components/pages/`:** Dashboard, ProjectSetup, DataImport, ReportEditor, Preview
- **`components/features/`:** Financial statements, notes, comments, collaboration, templates
- **`components/ui/`:** Reusable UI components (buttons, inputs, modals, etc.)

**New Feature Components:**
- **`features/collaboration/`:** InviteUserModal, UserRolesManager
- **`features/review/`:** CommentSidebar, AuditTrailViewer
- **`features/data-import/`:** AccountMappingInterface

### State Management (Zustand)
- **`useProjectStore`:** Handle project data and real-time Firestore listeners
- **`useUIStore`:** Manage UI state (current view, sidebar, theme)
- **`useAuthStore`:** User authentication and profile management

### Core Implementation Logic

- **Real-time Listeners:** Use Firestore `onSnapshot` for live collaboration
- **Permissions:** Check user roles before rendering edit components
- **Commenting:** Store comments in Firestore sub-collections
- **Templates:** Strip transactional data when saving templates
- **Validation:** Implement business rules for financial data integrity

## 9. User Experience & Performance

### Core User Experience
- **Dark/Light Mode:** Full theme support with user preferences
- **Responsive Design:** Optimized for desktop, tablet, and mobile devices
- **Offline Capabilities:** Basic offline functionality for viewing and editing
- **Real-time Collaboration:** Live updates and collaborative editing

### Performance & Scalability
- **Intelligent Caching:** Cache frequently accessed financial data and calculations
- **Lazy Loading:** Load financial statement sections on-demand to improve initial page load
- **Background Processing:** Process large trial balance imports and PDF generation in the background
- **Real-time Sync:** Instant synchronization across all user sessions and devices
- **Database Optimization:** Efficient indexing and querying for large datasets

### Export & Data Portability
- **Multiple Export Formats:** PDF, Excel, CSV, and Word formats
- **Custom Report Layouts:** Configurable report templates and formatting
- **Data Export Tools:** Export trial balance, mappings, and financial data
- **Backup & Restore:** Complete project backup and restoration capabilities

## 10. Business Rules & Validation Engine

### Core Validation Framework
**Validation Algorithms:**
- **Balance Sheet Validation:** Ensure Assets = Liabilities + Equity with configurable tolerance levels
- **Cash Flow Reconciliation:** Automatic reconciliation between indirect cash flow method and balance sheet movements
- **Ratio Analysis Engine:** Pre-programmed financial ratios with trend analysis
- **Materiality Calculations:** Basic materiality threshold calculations based on established standards
- **Variance Detection:** Algorithms to identify significant period-over-period changes

### Data Validation Rules
- **Account Code Validation:** Ensure all accounts follow proper coding standards and hierarchies
- **Debit/Credit Balance Rules:** Validate that account types have appropriate balance types
- **Inter-Statement Consistency:** Cross-reference figures between financial statements for accuracy
- **IFRS Compliance Checks:** Built-in rules to ensure compliance with basic IFRS requirements
- **Currency Validation:** Ensure multi-currency transactions are properly converted and presented

### Smart Automation Features
- **Account Mapping:** Basic account matching for common account names
- **Template Application:** Apply saved templates to new projects
- **Standard Disclosures:** Pre-built disclosure templates with basic auto-population
- **Validation Alerts:** Highlight potential issues and inconsistencies