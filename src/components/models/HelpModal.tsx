import { useState } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

const TABS = ['Overview', 'Getting Started', 'Budgeting', 'Versions', 'Sharing'] as const;
type Tab = (typeof TABS)[number];

export function HelpModal({ onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-[90vw] max-w-4xl mx-4 h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-0 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Help &amp; Guide</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === 'Overview' && <OverviewTab />}
          {activeTab === 'Getting Started' && <GettingStartedTab />}
          {activeTab === 'Budgeting' && <BudgetingTab />}
          {activeTab === 'Versions' && <VersionsTab />}
          {activeTab === 'Sharing' && <SharingTab />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-900 mb-3">{children}</h3>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-semibold text-gray-800 mt-5 mb-2">{children}</h4>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed mb-3">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-outside ml-5 text-sm text-gray-600 leading-relaxed mb-3 space-y-1">{children}</ul>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 mb-4">
      <span className="font-semibold">Tip: </span>{children}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function OverviewTab() {
  return (
    <div>
      <SectionHeading>What is Cloud Budgetter?</SectionHeading>
      <P>
        Cloud Budgetter is a planning tool for forecasting and managing cloud
        and platform-as-a-service (PaaS) spending. It helps finance teams,
        cloud architects, and budget owners build detailed 12-month cost
        projections for every service in their environment.
      </P>

      <SubHeading>Key capabilities</SubHeading>
      <Ul>
        <li>
          <strong>Service catalogue</strong> &mdash; define every cloud service
          with its unit type, unit cost, default efficiency, overhead, and
          discount eligibility.
        </li>
        <li>
          <strong>Monthly budget grid</strong> &mdash; enter consumption
          figures for each service across 12 months, with automatic propagation
          from month 1 and per-month overrides.
        </li>
        <li>
          <strong>Cost summary</strong> &mdash; view annual totals, monthly
          breakdowns, and a stacked bar chart so you can see where your spend
          is going at a glance.
        </li>
        <li>
          <strong>Multiple models</strong> &mdash; maintain several independent
          budget models (e.g. "Q3 Forecast", "2026 Plan") and switch between
          them instantly.
        </li>
        <li>
          <strong>Versions</strong> &mdash; save point-in-time snapshots of
          your budget, compare any two versions side by side, and restore
          earlier states if needed.
        </li>
        <li>
          <strong>Export &amp; Import</strong> &mdash; share budget models with
          colleagues as zip files. When importing, the app detects conflicts
          and lets you merge, replace, or create a copy.
        </li>
      </Ul>

      <SubHeading>Who is it for?</SubHeading>
      <P>
        Anyone responsible for cloud cost planning: finance and accounting
        teams, engineering leads building capacity plans, or managers preparing
        quarterly budget reviews. The interface is designed to feel familiar
        to spreadsheet users while adding version control and collaboration
        features that spreadsheets lack.
      </P>
    </div>
  );
}

function GettingStartedTab() {
  return (
    <div>
      <SectionHeading>Getting Started</SectionHeading>

      <SubHeading>1. Create or select a model</SubHeading>
      <P>
        A <strong>model</strong> is a self-contained budget workspace. When
        you first open the app a "Default Budget" model is created for you.
        Use the model dropdown in the top-right corner to create additional
        models, rename them, duplicate, or delete.
      </P>
      <Tip>
        Create separate models for different scenarios &mdash; for example
        "Baseline 2026" and "Growth Scenario" &mdash; so you can compare
        plans without overwriting your numbers.
      </Tip>

      <SubHeading>2. Add your services</SubHeading>
      <P>
        Switch to the <strong>Services</strong> tab and click
        "Add Service". For each cloud service enter:
      </P>
      <Ul>
        <li><strong>Name</strong> &mdash; a recognisable label (e.g. "AWS EC2", "Azure SQL").</li>
        <li><strong>Unit type</strong> &mdash; what you measure consumption in (instances, GB, requests, etc.).</li>
        <li><strong>Unit cost</strong> &mdash; price per unit.</li>
        <li><strong>Default efficiency %</strong> &mdash; a multiplier applied to raw consumption (use 100 for no adjustment).</li>
        <li><strong>Default overhead %</strong> &mdash; additional cost factor for support, networking, etc.</li>
        <li><strong>Discount eligible</strong> &mdash; whether committed-use or enterprise discounts apply.</li>
      </Ul>

      <SubHeading>3. Configure the budget period</SubHeading>
      <P>
        On the <strong>Budget</strong> tab, set the start month and year at
        the top. This defines the 12-month window your budget covers.
      </P>

      <SubHeading>4. Enter monthly consumption</SubHeading>
      <P>
        Select a service and fill in consumption for each month. The value
        you enter in month 1 automatically propagates to all other months
        unless you override them individually.
      </P>
      <Ul>
        <li>
          A blue <strong>"A"</strong> indicator means the value is
          auto-inherited from month 1.
        </li>
        <li>
          An amber <strong>"C"</strong> indicator means you have set a custom
          override for that month.
        </li>
        <li>
          You can also override efficiency, overhead, and discount on a
          per-month basis the same way.
        </li>
      </Ul>

      <SubHeading>5. Review the summary</SubHeading>
      <P>
        The <strong>Summary</strong> tab has two sub-views:
      </P>
      <Ul>
        <li>
          <strong>Overview</strong> &mdash; annual totals and percentage
          breakdown per service.
        </li>
        <li>
          <strong>By Month</strong> &mdash; a stacked bar chart and detailed
          month-by-month table showing calculated costs.
        </li>
      </Ul>
    </div>
  );
}

function BudgetingTab() {
  return (
    <div>
      <SectionHeading>Working with the Budget Grid</SectionHeading>

      <SubHeading>How costs are calculated</SubHeading>
      <P>
        For each service and each month the cost is computed as:
      </P>
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono text-gray-700 mb-4">
        cost = consumption &times; unit_cost &times; (efficiency / 100) &times; (1 + overhead / 100) &times; (1 &minus; discount / 100)
      </div>
      <P>
        The discount factor is only applied when the service is marked as
        discount-eligible.
      </P>

      <SubHeading>Month 1 propagation</SubHeading>
      <P>
        The value you enter in month 1 for any field (consumption, efficiency,
        overhead, discount) is automatically copied to months 2-12. This
        makes it fast to set a flat baseline. If you need a different value in
        a specific month, just edit that cell &mdash; it becomes a custom
        override and stops inheriting from month 1.
      </P>
      <Tip>
        To reset an overridden month back to the month-1 value, clear the
        override using the reset control on the cell.
      </Tip>

      <SubHeading>Managing services</SubHeading>
      <P>
        You can edit or delete services at any time from the Services tab.
        Deleting a service removes all its budget data. If you want to keep
        the data for reference, consider saving a version first.
      </P>

      <SubHeading>Reading the summary</SubHeading>
      <P>
        The Overview sub-tab shows each service's annual cost and its
        percentage of the total budget. The By Month sub-tab adds a stacked
        bar chart so you can visually spot trends (seasonal spikes, step-ups
        from new services, etc.) and a detailed table with per-month figures.
      </P>
    </div>
  );
}

function VersionsTab() {
  return (
    <div>
      <SectionHeading>Versions</SectionHeading>
      <P>
        Versions are point-in-time snapshots of your budget data. They let
        you checkpoint your work, compare changes over time, and roll back to
        a previous state if something goes wrong.
      </P>

      <SubHeading>Saving a version</SubHeading>
      <P>
        Open the model dropdown, expand the <strong>Versions</strong> section,
        and click <strong>+ Save Version</strong>. Give it a descriptive label
        (e.g. "Before headcount increase" or "Q2 review draft"). The app
        stores a complete copy of all services, budget entries, and
        configuration at that moment.
      </P>

      <SubHeading>Include in export</SubHeading>
      <P>
        Each version has an "Include in export" option. When checked, the
        version will be included when you export the model as a zip file.
        Unchecked versions are local-only &mdash; they stay on your machine
        and are not shared with others. This lets you keep personal
        work-in-progress snapshots private while sharing finished milestones.
      </P>
      <Ul>
        <li>By default, new versions are <strong>not</strong> included in export.</li>
        <li>
          Toggle the share icon next to any version to change its export
          status at any time.
        </li>
        <li>
          When saving a version you can also check the "Include in export"
          box to mark it as shared immediately.
        </li>
      </Ul>
      <Tip>
        A good practice: save frequent local versions as you work, and
        only mark key milestones as shared before exporting.
      </Tip>

      <SubHeading>Restoring a version</SubHeading>
      <P>
        Click <strong>Restore</strong> next to any version to replace your
        current working data with that snapshot. A confirmation dialog
        prevents accidental overwrites. Your current unsaved changes will be
        lost, so save a version first if you want to keep them.
      </P>

      <SubHeading>Comparing versions</SubHeading>
      <P>
        When you have at least one saved version, a <strong>Compare</strong> button
        appears. Click it to open the comparison view where you can pick any
        two snapshots (or "Current" working data) and see:
      </P>
      <Ul>
        <li>Grand total cost difference.</li>
        <li>Per-service cost deltas and status (added, removed, changed).</li>
        <li>Field-by-field, month-by-month breakdowns of exactly what changed.</li>
      </Ul>

      <SubHeading>Deleting versions</SubHeading>
      <P>
        Click the &times; icon next to a version to delete it. Deleted
        versions cannot be recovered.
      </P>
    </div>
  );
}

function SharingTab() {
  return (
    <div>
      <SectionHeading>Sharing &amp; Collaboration</SectionHeading>
      <P>
        Cloud Budgetter stores all data locally in your browser. To share a
        budget with colleagues you export it as a zip file and send it to
        them (via email, Slack, shared drive, etc.). They import the zip into
        their own browser.
      </P>

      <SubHeading>Exporting a model</SubHeading>
      <P>
        Open the model dropdown and click <strong>Export</strong>. The app
        generates a zip file containing your model data and all versions
        marked as "Include in export". Local-only versions are excluded so
        your private work-in-progress snapshots stay private.
      </P>
      <Tip>
        Before exporting, review your versions and make sure the ones you
        want to share have the share icon enabled.
      </Tip>

      <SubHeading>Importing a model</SubHeading>
      <P>
        Click <strong>Import</strong> and select a zip file. If the model is
        new (not already in your browser), it is added directly.
      </P>

      <SubHeading>Handling conflicts</SubHeading>
      <P>
        If the imported model already exists locally (same model ID), the app
        shows a conflict dialog with three options:
      </P>
      <Ul>
        <li>
          <strong>Merge Versions</strong> &mdash; keep your current working
          data and local versions, and add any new versions from the imported
          file. This is the safest option when multiple people are working on
          the same model.
        </li>
        <li>
          <strong>Replace Local</strong> &mdash; overwrite your local copy
          entirely with the imported file. Use this when you know the
          imported version is authoritative and you want to discard your
          local changes.
        </li>
        <li>
          <strong>Import as Copy</strong> &mdash; create a brand-new model
          from the imported data with "(imported)" appended to the name.
          Your existing local model is untouched. Useful when you want to
          compare two people's work side by side.
        </li>
      </Ul>

      <SubHeading>Recommended team workflow</SubHeading>
      <P>
        Here's a suggested workflow for teams collaborating on a budget:
      </P>
      <Ul>
        <li>
          <strong>One owner</strong> creates the model and adds the initial
          service catalogue and baseline numbers.
        </li>
        <li>
          They save a shared version (e.g. "Baseline v1"), export the
          zip, and distribute it to the team.
        </li>
        <li>
          Each team member imports the zip, makes their changes, saves a
          shared version with a clear label, and exports back.
        </li>
        <li>
          The owner imports each file and chooses <strong>Merge
          Versions</strong> to collect everyone's snapshots into one place.
        </li>
        <li>
          Use <strong>Compare</strong> to review what each person changed
          relative to the baseline.
        </li>
      </Ul>
      <Tip>
        Include dates or initials in version names (e.g. "Feb 15 &mdash;
        Sarah's update") to make it easy to track who changed what.
      </Tip>
    </div>
  );
}
