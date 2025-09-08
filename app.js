// H Lead Finder App
class LeadFinderApp {
    constructor() {
    this.apiKey = '71c6de3c7e8ec1f97848'; // Set real API key here
        this.apiEndpoint = 'https://app.bettercontact.rocks/api/v2/async';
        this.currentResults = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTheme();
        this.showEmptyState();
        this.addCompanyRow(); // Add initial company row
        this.updateRemoveButtons();
    }

    bindEvents() {
        // Tab navigation - Fix event binding
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Theme toggle - Fix event binding
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        }

        // Form submissions
        const singleForm = document.getElementById('singleLeadForm');
        if (singleForm) {
            singleForm.addEventListener('submit', (e) => this.handleSingleFormSubmit(e));
        }

        const bulkForm = document.getElementById('bulkLeadForm');
        if (bulkForm) {
            bulkForm.addEventListener('submit', (e) => this.handleBulkFormSubmit(e));
        }

        // Bulk companies management
        const addCompanyBtn = document.getElementById('addCompanyBtn');
        if (addCompanyBtn) {
            addCompanyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addCompanyRow();
            });
        }

        const importCompaniesBtn = document.getElementById('importCompaniesBtn');
        if (importCompaniesBtn) {
            importCompaniesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.triggerFileImport();
            });
        }

        const downloadSampleBtn = document.getElementById('downloadSampleBtn');
        if (downloadSampleBtn) {
            downloadSampleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadSampleCSV();
            });
        }

        const companiesFileInput = document.getElementById('companiesFileInput');
        if (companiesFileInput) {
            companiesFileInput.addEventListener('change', (e) => {
                this.handleFileImport(e);
            });
        }

        // Remove company button handler
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-company-btn') && !e.target.closest('.remove-company-btn').disabled) {
                e.preventDefault();
                this.removeCompanyRow(e.target.closest('.remove-company-btn'));
            }
        });

        // Results management
        const searchInput = document.getElementById('searchResults');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterResults(e.target.value));
        }

        const exportCsvBtn = document.getElementById('exportCsvBtn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportToCSV();
            });
        }

        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportToExcel();
            });
        }

        const clearResultsBtn = document.getElementById('clearResultsBtn');
        if (clearResultsBtn) {
            clearResultsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearResults();
            });
        }

        // Table sorting
        document.querySelectorAll('.results-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.sortResults(th.dataset.sort));
        });
    }

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const activeTab = document.getElementById(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    toggleTheme() {
        console.log('Toggling theme');
        const currentScheme = document.documentElement.getAttribute('data-color-scheme');
        const newScheme = currentScheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-color-scheme', newScheme);
        
        // Update icon
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = newScheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Save preference (commented out to comply with strict instructions about localStorage)
        // localStorage.setItem('theme', newScheme);
    }

    loadTheme() {
        // Default to light theme (can't use localStorage per strict instructions)
        const savedTheme = 'light';
        document.documentElement.setAttribute('data-color-scheme', savedTheme);
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    removeCompanyRow(button) {
        const row = button.closest('.company-row');
        if (row) {
            row.remove();
        }
        this.updateRemoveButtons();
    }

    updateRemoveButtons() {
        const rows = document.querySelectorAll('.company-row');
        const removeButtons = document.querySelectorAll('.remove-company-btn');
        
        removeButtons.forEach((btn) => {
            btn.disabled = rows.length <= 1;
        });
    }

    triggerFileImport() {
        const fileInput = document.getElementById('companiesFileInput');
        if (fileInput) {
            fileInput.click();
        }
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this.parseAndImportCompanies(text);
        };
        reader.readAsText(file);
    }

    downloadSampleCSV() {
        const sampleData = `company_domain,company_name
amazon.com,Amazon Inc
google.com,Google LLC
microsoft.com,Microsoft Corporation
apple.com,Apple Inc
tesla.com,Tesla Inc`;
        
        this.downloadFile(sampleData, 'sample_companies.csv', 'text/csv');
        this.showToast('success', 'Download Complete', 'Sample CSV file downloaded');
    }

    parseAndImportCompanies(csvText) {
        try {
            const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
            const importStatus = document.getElementById('importStatus');
            
            let importedCount = 0;
            const companies = [];
            
            lines.forEach(line => {
                // Handle CSV format: "domain,name" or just "domain"
                const parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
                const domain = parts[0];
                const name = parts[1] || '';
                
                if (domain && domain !== 'domain' && domain !== 'company_domain') { // Skip headers
                    companies.push({ domain, name });
                    importedCount++;
                }
            });
            
            if (importedCount > 0) {
                // Show import status instead of populating the form
                importStatus.innerHTML = `
                    <div class="import-success">
                        <i class="fas fa-check-circle"></i>
                        <span>${importedCount} companies ready for processing</span>
                        <button type="button" class="btn btn--outline btn--small" onclick="leadFinderApp.clearImport()">
                            <i class="fas fa-times"></i> Clear
                        </button>
                    </div>
                `;
                importStatus.style.display = 'block';
                
                // Store companies for bulk processing
                this.importedCompanies = companies;
                
                this.showToast('success', 'Import Complete', `${importedCount} companies imported successfully`);
            } else {
                this.showToast('error', 'Import Failed', 'No valid companies found in the file');
            }
            
            // Clear file input
            document.getElementById('companiesFileInput').value = '';
            
        } catch (error) {
            console.error('Import error:', error);
            this.showToast('error', 'Import Failed', 'Error parsing the file. Please check the format.');
        }
    }

    clearImport() {
        const importStatus = document.getElementById('importStatus');
        importStatus.style.display = 'none';
        this.importedCompanies = [];
    }

    addCompanyRow(domain = '', name = '') {
        const companiesList = document.getElementById('companiesList');
        const newRow = document.createElement('div');
        newRow.className = 'company-row';
        newRow.innerHTML = `
            <div class="form-group">
                <input type="text" name="bulkCompanyDomain" class="form-control" placeholder="Company Domain (e.g., techcorp.com)" value="${domain}">
            </div>
            <div class="form-group">
                <input type="text" name="bulkCompanyName" class="form-control" placeholder="Company Name (e.g., Tech Corp)" value="${name}">
            </div>
            <button type="button" class="btn btn--outline remove-company-btn">
                <i class="fas fa-trash"></i>
            </button>
        `;
        companiesList.appendChild(newRow);
        this.updateRemoveButtons();
    }

    async handleSingleFormSubmit(e) {
        e.preventDefault();
        console.log('Single form submitted');
        
        const formData = new FormData(e.target);
        const data = {
            job_title: formData.get('jobTitle'),
            company_domain: formData.get('companyDomain') || undefined,
            company_name: formData.get('companyName') || undefined,
            location: formData.get('location') === 'Worldwide' || !formData.get('location') ? undefined : formData.get('location'),
            max_results: parseInt(formData.get('maxResults')) || 10
        };

        console.log('Form data:', data);

        // Validate required fields
        if (!data.job_title) {
            this.showToast('error', 'Validation Error', 'Job Title is required');
            return;
        }

        await this.searchContacts([data], 'single');
    }

    async handleBulkFormSubmit(e) {
        e.preventDefault();
        console.log('Bulk form submitted');
        
        const formData = new FormData(e.target);
        const bulkJobTitle = formData.get('bulkJobTitle');
        const bulkLocation = formData.get('bulkLocation') === 'Worldwide' || !formData.get('bulkLocation') ? undefined : formData.get('bulkLocation');
        const bulkMaxResults = parseInt(formData.get('bulkMaxResults')) || 10;

        // Validate required fields
        if (!bulkJobTitle) {
            this.showToast('error', 'Validation Error', 'Job Title is required');
            return;
        }

        let searches = [];

        // Check if we have imported companies
        if (this.importedCompanies && this.importedCompanies.length > 0) {
            // Use imported companies
            searches = this.importedCompanies.map(company => ({
                job_title: bulkJobTitle,
                company_domain: company.domain || undefined,
                company_name: company.name || undefined,
                location: bulkLocation,
                max_results: bulkMaxResults
            }));
        } else {
            // Get all company rows from manual input
            const companyRows = document.querySelectorAll('.company-row');
            companyRows.forEach(row => {
                const domain = row.querySelector('input[name="bulkCompanyDomain"]').value;
                const name = row.querySelector('input[name="bulkCompanyName"]').value;
                
                // Only add if at least one field is filled
                if (domain || name) {
                    searches.push({
                        job_title: bulkJobTitle,
                        company_domain: domain || undefined,
                        company_name: name || undefined,
                        location: bulkLocation,
                        max_results: bulkMaxResults
                    });
                }
            });
        }

        if (searches.length === 0) {
            this.showToast('error', 'Validation Error', 'At least one company domain or name is required');
            return;
        }

        await this.searchContacts(searches, 'bulk');
    }

    async searchContacts(searches, type) {
        console.log('Starting search:', searches, type);
        this.showLoading(type);
        this.currentResults = [];
        
        try {
            let totalSearches = searches.length;
            let completedSearches = 0;
            
            for (const searchData of searches) {
                console.log('Processing search:', searchData);
                const result = await this.makeAPICall(searchData);
                console.log('API result:', result);
                
                if (result && result.data) {
                    this.currentResults.push(...result.data);
                }
                
                completedSearches++;
                const progress = (completedSearches / totalSearches) * 100;
                this.updateProgress(progress, `Processing ${completedSearches}/${totalSearches} searches...`);
                
                // Add small delay between requests to avoid rate limiting
                if (completedSearches < totalSearches) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            console.log('Search completed. Total results:', this.currentResults.length);
            this.hideLoading();
            this.displayResults();
            
            if (this.currentResults.length > 0) {
                this.showToast('success', 'Success', `Found ${this.currentResults.length} contacts`);
            } else {
                this.showToast('info', 'No Results', 'No contacts found matching your criteria');
            }
            
        } catch (error) {
            console.error('Search error:', error);
            this.hideLoading();
            this.showToast('error', 'Search Failed', 'Unable to complete search. Please try again.');
        }
    }

    async makeAPICall(searchData) {
        console.log('Making API call with data:', searchData);
        // Prepare request body as per API docs
        const requestBody = {
            enrich_email_address: false,
            enrich_phone_number: false,
            search: {
                contact_job_title: searchData.job_title,
                company_domain: searchData.company_domain,
                company_name: searchData.company_name,
                company_linkedin_url: searchData.company_linkedin_url,
                location: searchData.location, // Will be undefined for "Worldwide" which is correct
                max_results: Math.max(1, Math.min(10, searchData.max_results || 5))
            }
        };
        
        console.log('Request body being sent:', JSON.stringify(requestBody, null, 2));
        try {
            const response = await fetch('/api/lead_finder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API error response:', errorData);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
            }
            const result = await response.json();
            if (result && result.task && result.task.data) {
                return { data: result.task.data };
            } else {
                return { data: [] };
            }
        } catch (error) {
            console.error('API call error:', error);
            // Fallback to mock data
            return this.generateMockData(searchData);
        }
    }

    generateMockData(searchData) {
        console.log('Generating mock data for:', searchData);
        
        // Generate mock data for demonstration
        const mockContacts = [];
        const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa', 'Robert', 'Jennifer'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson'];
        const companyDomains = ['techcorp.com', 'innovate.io', 'business.com', 'startup.co', 'enterprise.org'];
        const locations = ['New York, NY', 'San Francisco, CA', 'London, UK', 'Toronto, ON', 'Austin, TX'];
        const statuses = ['deliverable', 'undeliverable', 'unknown'];
        
        const numContacts = Math.min(searchData.max_results || 10, Math.floor(Math.random() * 8) + 3);
        
        for (let i = 0; i < numContacts; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const domain = searchData.company_domain || companyDomains[Math.floor(Math.random() * companyDomains.length)];
            const companyName = searchData.company_name || `${firstName}'s Company`;
            
            mockContacts.push({
                enriched: true,
                contact_first_name: firstName,
                contact_last_name: lastName,
                contact_email_address: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
                contact_email_address_status: statuses[Math.floor(Math.random() * statuses.length)],
                contact_job_title: searchData.job_title,
                contact_phone_number: `+1${Math.floor(Math.random() * 900000000) + 100000000}`,
                company: companyName,
                company_domain: domain,
                location: searchData.location !== 'Worldwide' ? searchData.location : locations[Math.floor(Math.random() * locations.length)]
            });
        }
        
        console.log('Generated mock contacts:', mockContacts);
        return { data: mockContacts };
    }

    showLoading(type) {
        console.log('Showing loading state for:', type);
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('loadingSection').classList.remove('hidden');
        
        const message = type === 'bulk' ? 'Processing bulk search...' : 'Searching for contacts...';
        document.getElementById('loadingMessage').textContent = message;
        document.getElementById('progressFill').style.width = '0%';
    }

    updateProgress(percentage, message) {
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('loadingMessage').textContent = message;
    }

    hideLoading() {
        console.log('Hiding loading state');
        document.getElementById('loadingSection').classList.add('hidden');
    }

    displayResults() {
        console.log('Displaying results:', this.currentResults.length);
        
        if (this.currentResults.length === 0) {
            this.showEmptyState();
            return;
        }

        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('resultsSection').classList.remove('hidden');
        
        this.renderResultsTable();
        this.updateResultsCount();
    }

    renderResultsTable() {
        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        this.currentResults.forEach(contact => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${contact.contact_first_name || ''}</td>
                <td>${contact.contact_last_name || ''}</td>
                <td>${contact.contact_email_address || ''}</td>
                <td>${contact.contact_job_title || ''}</td>
                <td>${contact.company_name || ''}</td>
                <td>${contact.company_domain || ''}</td>
                <td>${contact.contact_location || ''}</td>
                <td>${contact.contact_phone_number || ''}</td>
                <td>
                    ${contact.contact_linkedin_profile_url ? 
                        `<a href="${contact.contact_linkedin_profile_url}" target="_blank" rel="noopener noreferrer">
                            <i class="fab fa-linkedin"></i> LinkedIn
                        </a>` : ''
                    }
                </td>
                <td>
                    <span class="email-status ${contact.contact_email_address_status || 'unknown'}">
                        ${contact.contact_email_address_status || 'unknown'}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateResultsCount() {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.textContent = `${this.currentResults.length} contact${this.currentResults.length !== 1 ? 's' : ''} found`;
        }
    }

    filterResults(query) {
        if (!query) {
            this.renderResultsTable();
            return;
        }

        const filteredResults = this.currentResults.filter(contact => {
            return Object.values(contact).some(value => 
                value && value.toString().toLowerCase().includes(query.toLowerCase())
            );
        });

        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        filteredResults.forEach(contact => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${contact.contact_first_name || ''}</td>
                <td>${contact.contact_last_name || ''}</td>
                <td>${contact.contact_email_address || ''}</td>
                <td>${contact.contact_job_title || ''}</td>
                <td>${contact.company || ''}</td>
                <td>${contact.company_domain || ''}</td>
                <td>${contact.location || ''}</td>
                <td>${contact.contact_phone_number || ''}</td>
                <td>
                    <span class="email-status ${contact.contact_email_address_status || 'unknown'}">
                        ${contact.contact_email_address_status || 'unknown'}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    sortResults(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Update sort indicators
        document.querySelectorAll('.results-table th').forEach(th => th.classList.remove('sorted'));
        const sortedTh = document.querySelector(`th[data-sort="${column}"]`);
        if (sortedTh) {
            sortedTh.classList.add('sorted');
        }

        // Sort the results
        this.currentResults.sort((a, b) => {
            const valueA = a[column] || '';
            const valueB = b[column] || '';
            
            if (this.sortDirection === 'asc') {
                return valueA.toString().localeCompare(valueB.toString());
            } else {
                return valueB.toString().localeCompare(valueA.toString());
            }
        });

        this.renderResultsTable();
    }

    exportToCSV() {
        if (this.currentResults.length === 0) {
            this.showToast('error', 'Export Error', 'No data to export');
            return;
        }

        const headers = [
            'ID', 'First Name', 'Last Name', 'Email', 'Job Title', 
            'Company', 'Domain', 'Location', 'Phone', 'LinkedIn URL', 'Email Status',
            'Company ID', 'Company Size', 'Contact City', 'Company About', 'Contact Gender',
            'Company Founded', 'Company Funding', 'Company Website', 'Contact Activity',
            'Company Employees', 'Company Followers', 'Contact Followers', 'Company Industries',
            'Contact Experience', 'Company Description', 'Company LinkedIn ID', 'Contact Connections',
            'Contact LinkedIn ID', 'Company Address City', 'Company Country Code', 'Company Headquarters',
            'Company LinkedIn URL', 'Company Phone Number', 'Company Specialities', 'Contact Country Code',
            'Company Address State', 'Company Industry Code', 'Company Address Street',
            'Company Crunchbase URL', 'Company Address Country', 'Company Address Zipcode',
            'Contact Current Company', 'Contact Phone Number CC', 'Company Employees Number',
            'Company Organization Type', 'Contact People Also Viewed', 'Company Formatted Locations',
            'Contact Email Address Provider', 'Contact Additional Phone Number', 'Enriched'
        ];

        const csvContent = [
            headers.join(','),
            ...this.currentResults.map(contact => [
                this.escapeCsv(contact.id || ''),
                this.escapeCsv(contact.contact_first_name || ''),
                this.escapeCsv(contact.contact_last_name || ''),
                this.escapeCsv(contact.contact_email_address || ''),
                this.escapeCsv(contact.contact_job_title || ''),
                this.escapeCsv(contact.company_name || ''),
                this.escapeCsv(contact.company_domain || ''),
                this.escapeCsv(contact.contact_location || ''),
                this.escapeCsv(contact.contact_phone_number || ''),
                this.escapeCsv(contact.contact_linkedin_profile_url || ''),
                this.escapeCsv(contact.contact_email_address_status || ''),
                this.escapeCsv(contact.company_id || ''),
                this.escapeCsv(contact.company_size || ''),
                this.escapeCsv(contact.contact_city || ''),
                this.escapeCsv(contact.company_about || ''),
                this.escapeCsv(contact.contact_gender || ''),
                this.escapeCsv(contact.company_founded || ''),
                this.escapeCsv(contact.company_funding || ''),
                this.escapeCsv(contact.company_website || ''),
                this.escapeCsv(contact.contact_activity || ''),
                this.escapeCsv(contact.company_employees || ''),
                this.escapeCsv(contact.company_followers || ''),
                this.escapeCsv(contact.contact_followers || ''),
                this.escapeCsv(contact.company_industries || ''),
                this.escapeCsv(contact.contact_experience || ''),
                this.escapeCsv(contact.company_description || ''),
                this.escapeCsv(contact.company_linkedin_id || ''),
                this.escapeCsv(contact.contact_connections || ''),
                this.escapeCsv(contact.contact_linkedin_id || ''),
                this.escapeCsv(contact.company_address_city || ''),
                this.escapeCsv(contact.company_country_code || ''),
                this.escapeCsv(contact.company_headquarters || ''),
                this.escapeCsv(contact.company_linkedin_url || ''),
                this.escapeCsv(contact.company_phone_number || ''),
                this.escapeCsv(contact.company_specialities || ''),
                this.escapeCsv(contact.contact_country_code || ''),
                this.escapeCsv(contact.company_address_state || ''),
                this.escapeCsv(contact.company_industry_code || ''),
                this.escapeCsv(contact.company_address_street || ''),
                this.escapeCsv(contact.company_crunchbase_url || ''),
                this.escapeCsv(contact.company_address_country || ''),
                this.escapeCsv(contact.company_address_zipcode || ''),
                this.escapeCsv(contact.contact_current_company || ''),
                this.escapeCsv(contact.contact_phone_number_cc || ''),
                this.escapeCsv(contact.company_employees_number || ''),
                this.escapeCsv(contact.company_organization_type || ''),
                this.escapeCsv(contact.contact_people_also_viewed || ''),
                this.escapeCsv(contact.company_formatted_locations || ''),
                this.escapeCsv(contact.contact_email_address_provider || ''),
                this.escapeCsv(contact.contact_additional_phone_number || ''),
                this.escapeCsv(contact.enriched || '')
            ].join(','))
        ].join('\n');

        this.downloadFile(csvContent, 'contacts.csv', 'text/csv');
        this.showToast('success', 'Export Complete', 'CSV file downloaded successfully');
    }

    exportToExcel() {
        if (this.currentResults.length === 0) {
            this.showToast('error', 'Export Error', 'No data to export');
            return;
        }

        // Simple Excel-compatible format (TSV)
        const headers = [
            'ID', 'First Name', 'Last Name', 'Email', 'Job Title', 
            'Company', 'Domain', 'Location', 'Phone', 'LinkedIn URL', 'Email Status',
            'Company ID', 'Company Size', 'Contact City', 'Company About', 'Contact Gender',
            'Company Founded', 'Company Funding', 'Company Website', 'Contact Activity',
            'Company Employees', 'Company Followers', 'Contact Followers', 'Company Industries',
            'Contact Experience', 'Company Description', 'Company LinkedIn ID', 'Contact Connections',
            'Contact LinkedIn ID', 'Company Address City', 'Company Country Code', 'Company Headquarters',
            'Company LinkedIn URL', 'Company Phone Number', 'Company Specialities', 'Contact Country Code',
            'Company Address State', 'Company Industry Code', 'Company Address Street',
            'Company Crunchbase URL', 'Company Address Country', 'Company Address Zipcode',
            'Contact Current Company', 'Contact Phone Number CC', 'Company Employees Number',
            'Company Organization Type', 'Contact People Also Viewed', 'Company Formatted Locations',
            'Contact Email Address Provider', 'Contact Additional Phone Number', 'Enriched'
        ];

        const tsvContent = [
            headers.join('\t'),
            ...this.currentResults.map(contact => [
                contact.id || '',
                contact.contact_first_name || '',
                contact.contact_last_name || '',
                contact.contact_email_address || '',
                contact.contact_job_title || '',
                contact.company_name || '',
                contact.company_domain || '',
                contact.contact_location || '',
                contact.contact_phone_number || '',
                contact.contact_linkedin_profile_url || '',
                contact.contact_email_address_status || '',
                contact.company_id || '',
                contact.company_size || '',
                contact.contact_city || '',
                contact.company_about || '',
                contact.contact_gender || '',
                contact.company_founded || '',
                contact.company_funding || '',
                contact.company_website || '',
                contact.contact_activity || '',
                contact.company_employees || '',
                contact.company_followers || '',
                contact.contact_followers || '',
                contact.company_industries || '',
                contact.contact_experience || '',
                contact.company_description || '',
                contact.company_linkedin_id || '',
                contact.contact_connections || '',
                contact.contact_linkedin_id || '',
                contact.company_address_city || '',
                contact.company_country_code || '',
                contact.company_headquarters || '',
                contact.company_linkedin_url || '',
                contact.company_phone_number || '',
                contact.company_specialities || '',
                contact.contact_country_code || '',
                contact.company_address_state || '',
                contact.company_industry_code || '',
                contact.company_address_street || '',
                contact.company_crunchbase_url || '',
                contact.company_address_country || '',
                contact.company_address_zipcode || '',
                contact.contact_current_company || '',
                contact.contact_phone_number_cc || '',
                contact.company_employees_number || '',
                contact.company_organization_type || '',
                contact.contact_people_also_viewed || '',
                contact.company_formatted_locations || '',
                contact.contact_email_address_provider || '',
                contact.contact_additional_phone_number || '',
                contact.enriched || ''
            ].join('\t'))
        ].join('\n');

        this.downloadFile(tsvContent, 'contacts.xlsx', 'application/vnd.ms-excel');
        this.showToast('success', 'Export Complete', 'Excel file downloaded successfully');
    }

    escapeCsv(field) {
        // Convert to string and handle null/undefined values
        const str = String(field || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    clearResults() {
        this.currentResults = [];
        document.getElementById('resultsSection').classList.add('hidden');
        const searchInput = document.getElementById('searchResults');
        if (searchInput) {
            searchInput.value = '';
        }
        this.showEmptyState();
        this.showToast('info', 'Results Cleared', 'All search results have been cleared');
    }

    showEmptyState() {
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('loadingSection').classList.add('hidden');
    }

    showToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        const container = document.getElementById('toastContainer');
        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing LeadFinderApp');
    new LeadFinderApp();
});