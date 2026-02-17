-- ============================================================================
-- Migration 015: Seed Chart of Accounts Templates
-- ATLAS Platform - Red Cedar Homes
-- Seeds default organization, example SPE entity, and standard COA template
-- ============================================================================

DO $$
DECLARE
    org_id UUID;
    entity_id UUID;
    -- Parent account IDs for sub-accounts
    acct_1000_id UUID; acct_2000_id UUID; acct_3000_id UUID;
    acct_4000_id UUID; acct_5000_id UUID; acct_6000_id UUID;
BEGIN
    -- ========================================================================
    -- ENSURE DEFAULT ORGANIZATION EXISTS
    -- ========================================================================
    SELECT id INTO org_id FROM organizations WHERE name = 'Red Cedar Homes' LIMIT 1;
    IF org_id IS NULL THEN
        INSERT INTO organizations (
            name,
            timezone,
            fiscal_year_start_month,
            currency,
            default_contingency_pct,
            default_retainage_pct,
            margin_strong_threshold,
            margin_good_threshold,
            margin_marginal_threshold,
            default_ltc_ratio,
            default_interest_rate,
            default_construction_period_days,
            default_selling_cost_pct,
            default_cost_of_capital_rate
        ) VALUES (
            'Red Cedar Homes',
            'America/New_York',
            1,
            'USD',
            5.00,
            10.00,
            10.00,
            7.00,
            5.00,
            85.00,
            9.50,
            120,
            8.50,
            16.00
        ) RETURNING id INTO org_id;
    END IF;

    -- ========================================================================
    -- CREATE EXAMPLE SPE ENTITY
    -- ========================================================================
    INSERT INTO entities (
        organization_id,
        name,
        use_type,
        legal_type,
        state_of_formation,
        formation_date,
        is_active
    ) VALUES (
        org_id,
        'Red Cedar Homes SPE Template LLC',
        'spe',
        'llc',
        'SC',
        '2024-01-15',
        true
    ) RETURNING id INTO entity_id;

    -- ========================================================================
    -- ASSETS (1000-1699)
    -- ========================================================================

    -- 1000 Cash - Operating
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '1000', 'Cash - Operating', 'asset', 'debit', 'Primary operating bank account for day-to-day transactions.', true)
    RETURNING id INTO acct_1000_id;

    -- 1010 Cash - Escrow
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active, parent_account_id)
    VALUES (entity_id, '1010', 'Cash - Escrow', 'asset', 'debit', 'Escrow account for earnest money deposits and closing funds.', true, acct_1000_id);

    -- 1100 Accounts Receivable
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '1100', 'Accounts Receivable', 'asset', 'debit', 'Amounts due from buyers, draw requests pending, and other receivables.', true);

    -- 1200 Prepaid Expenses
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '1200', 'Prepaid Expenses', 'asset', 'debit', 'Prepaid insurance, prepaid taxes, and other prepaid expenses.', true);

    -- 1300 Land
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '1300', 'Land', 'asset', 'debit', 'Cost of land acquired including closing costs. Non-depreciable asset.', true);

    -- 1400 Construction in Progress
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '1400', 'Construction in Progress', 'asset', 'debit', 'Accumulated hard costs, soft costs, and allocated overhead for units under construction. Transferred to Completed Homes at CO.', true);

    -- 1500 Finished Lots
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '1500', 'Finished Lots', 'asset', 'debit', 'Cost of developed lots ready for vertical construction. Includes land, infrastructure, and allocated development costs.', true);

    -- 1600 Completed Homes
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '1600', 'Completed Homes', 'asset', 'debit', 'Fully constructed homes with CO that are available for sale. Includes land, hard costs, and soft costs.', true);

    -- ========================================================================
    -- LIABILITIES (2000-2599)
    -- ========================================================================

    -- 2000 Accounts Payable
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '2000', 'Accounts Payable', 'liability', 'credit', 'Amounts owed to trade vendors, suppliers, and service providers.', true)
    RETURNING id INTO acct_2000_id;

    -- 2100 Accrued Expenses
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '2100', 'Accrued Expenses', 'liability', 'credit', 'Accrued but unpaid expenses including utilities, taxes, and other obligations.', true);

    -- 2200 Construction Loan
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '2200', 'Construction Loan', 'liability', 'credit', 'Outstanding balance on construction financing. Drawn against as construction progresses.', true);

    -- 2300 Development Loan
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '2300', 'Development Loan', 'liability', 'credit', 'Outstanding balance on land development financing for infrastructure and horizontal improvements.', true);

    -- 2400 Seller Financing
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '2400', 'Seller Financing', 'liability', 'credit', 'Notes payable to land sellers for purchase money financing.', true);

    -- 2500 Accrued Interest
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '2500', 'Accrued Interest', 'liability', 'credit', 'Interest accrued but not yet paid on construction loans, development loans, and seller financing.', true);

    -- ========================================================================
    -- EQUITY (3000-3399)
    -- ========================================================================

    -- 3000 Member Capital - Managing Member
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '3000', 'Member Capital - Managing Member', 'equity', 'credit', 'Capital contributed by the managing member (Red Cedar Homes or affiliate).', true)
    RETURNING id INTO acct_3000_id;

    -- 3100 Member Capital - Investors
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '3100', 'Member Capital - Investors', 'equity', 'credit', 'Capital contributed by passive investor members per subscription agreements.', true);

    -- 3200 Retained Earnings
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '3200', 'Retained Earnings', 'equity', 'credit', 'Cumulative net income retained in the entity (not distributed).', true);

    -- 3300 Distributions
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '3300', 'Distributions', 'equity', 'debit', 'Amounts distributed to members (reduces equity). Contra-equity account.', true);

    -- ========================================================================
    -- REVENUE (4000-4599)
    -- ========================================================================

    -- 4000 Home Sales Revenue
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '4000', 'Home Sales Revenue', 'revenue', 'credit', 'Gross revenue from sale of completed homes. Recognized at closing.', true)
    RETURNING id INTO acct_4000_id;

    -- 4100 Lot Sales Revenue
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '4100', 'Lot Sales Revenue', 'revenue', 'credit', 'Revenue from sale of finished lots to third-party builders.', true);

    -- 4200 Rental Income
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '4200', 'Rental Income', 'revenue', 'credit', 'Income from temporary rental of completed but unsold properties.', true);

    -- 4300 Assignment/Wholesale Fee
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '4300', 'Assignment/Wholesale Fee', 'revenue', 'credit', 'Fee income from assigning or wholesaling purchase contracts.', true);

    -- 4400 Interest Income
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '4400', 'Interest Income', 'revenue', 'credit', 'Interest earned on bank accounts, escrow, or seller-financed notes receivable.', true);

    -- 4500 Other Revenue
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '4500', 'Other Revenue', 'revenue', 'credit', 'Miscellaneous revenue not categorized elsewhere. Builder credits, rebates, etc.', true);

    -- ========================================================================
    -- COST OF SALES (5000-5799)
    -- ========================================================================

    -- 5000 Land Cost
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '5000', 'Land Cost', 'expense', 'debit', 'Cost of land allocated to sold units. Includes purchase price and acquisition closing costs.', true)
    RETURNING id INTO acct_5000_id;

    -- 5100 Hard Costs
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '5100', 'Hard Costs', 'expense', 'debit', 'Direct construction costs including all trade categories. Sticks and bricks, site work, and site-specific adjustments.', true);

    -- 5200 Soft Costs
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '5200', 'Soft Costs', 'expense', 'debit', 'Permit fees, impact fees, tap fees, architectural/engineering, survey, insurance, and legal costs.', true);

    -- 5300 Financing Costs
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '5300', 'Financing Costs', 'expense', 'debit', 'Interest expense, loan origination fees, appraisal fees, and other financing costs allocated to sold units.', true);

    -- 5400 Selling Costs
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '5400', 'Selling Costs', 'expense', 'debit', 'Real estate commissions, closing cost concessions, marketing expenses, and staging costs.', true);

    -- 5500 Contingency Used
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '5500', 'Contingency Used', 'expense', 'debit', 'Contingency budget amounts actually spent. Tracked separately for analysis.', true);

    -- 5600 Property Taxes
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '5600', 'Property Taxes', 'expense', 'debit', 'Property taxes prorated or paid during construction and holding period.', true);

    -- 5700 Insurance
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '5700', 'Insurance', 'expense', 'debit', 'Builders risk insurance, general liability, and other project-related insurance costs.', true);

    -- ========================================================================
    -- OPERATING EXPENSES (6000-6599)
    -- ========================================================================

    -- 6000 Property Management
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '6000', 'Property Management', 'expense', 'debit', 'Property management fees for rental or vacant holding period management.', true)
    RETURNING id INTO acct_6000_id;

    -- 6100 Maintenance & Repairs
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '6100', 'Maintenance & Repairs', 'expense', 'debit', 'Ongoing maintenance, warranty repairs, and upkeep costs not covered by trade warranties.', true);

    -- 6200 Utilities
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '6200', 'Utilities', 'expense', 'debit', 'Water, electric, gas, and sewer charges during construction and holding period.', true);

    -- 6300 HOA Dues
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '6300', 'HOA Dues', 'expense', 'debit', 'Homeowners association dues and assessments during ownership period.', true);

    -- 6400 Marketing
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '6400', 'Marketing', 'expense', 'debit', 'Marketing, advertising, signage, and promotional expenses for home sales.', true);

    -- 6500 Miscellaneous
    INSERT INTO chart_of_accounts (entity_id, account_number, account_name, account_type, normal_balance, description, is_active)
    VALUES (entity_id, '6500', 'Miscellaneous', 'expense', 'debit', 'Miscellaneous operating expenses not categorized elsewhere.', true);

    RAISE NOTICE 'Successfully seeded organization (%), example SPE entity (%), and 31 chart of accounts entries', org_id, entity_id;
END $$;
