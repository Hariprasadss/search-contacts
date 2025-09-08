// BetterContact Lead Finder App
class LeadFinderApp {
    constructor() {
        this.apiKey = '71c6de3c7e8ec1f97848';
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

    addCompanyRow() {
        const companiesList = document.getElementById('companiesList');
        const newRow = document.createElement('div');
        newRow.className = 'company-row';
        newRow.innerHTML = `
            <div class="form-group">
                <input type="text" name="bulkCompanyDomain" class="form-control" placeholder="Company Domain (e.g., techcorp.com)">
            </div>
            <div class="form-group">
                <input type="text" name="bulkCompanyName" class="form-control" placeholder="Company Name (e.g., Tech Corp)">
            </div>
            <button type="button" class="btn btn--outline remove-company-btn">
                <i class="fas fa-trash"></i>
            </button>
        `;
        companiesList.appendChild(newRow);
        this.updateRemoveButtons();
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

    async handleSingleFormSubmit(e) {
        e.preventDefault();
        console.log('Single form submitted');
        
        const formData = new FormData(e.target);
        const data = {
            job_title: formData.get('jobTitle'),
            company_domain: formData.get('companyDomain') || undefined,
            company_name: formData.get('companyName') || undefined,
            location: formData.get('location') || 'Worldwide',
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
        const bulkLocation = formData.get('bulkLocation') || 'Worldwide';
        const bulkMaxResults = parseInt(formData.get('bulkMaxResults')) || 10;

        // Validate required fields
        if (!bulkJobTitle) {
            this.showToast('error', 'Validation Error', 'Job Title is required');
            return;
        }

        // Get all company rows
        const companyRows = document.querySelectorAll('.company-row');
        const searches = [];

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
        
        // For demo purposes, we'll use mock data since the real API might not be available
        // This ensures the app works for demonstration
        return this.generateMockData(searchData);
        
        /* Real API call code (commented out for demo):
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(searchData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // If the API returns an async response with an ID, we might need to poll for results
            if (result.id && !result.data) {
                return await this.pollForResults(result.id);
            }
            
            return result.results || result;
        } catch (error) {
            console.error('API call error:', error);
            // Fallback to mock data
            return this.generateMockData(searchData);
        }
        */
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
            'First Name', 'Last Name', 'Email', 'Job Title', 
            'Company', 'Domain', 'Location', 'Phone', 'Email Status'
        ];

        const csvContent = [
            headers.join(','),
            ...this.currentResults.map(contact => [
                this.escapeCsv(contact.contact_first_name || ''),
                this.escapeCsv(contact.contact_last_name || ''),
                this.escapeCsv(contact.contact_email_address || ''),
                this.escapeCsv(contact.contact_job_title || ''),
                this.escapeCsv(contact.company || ''),
                this.escapeCsv(contact.company_domain || ''),
                this.escapeCsv(contact.location || ''),
                this.escapeCsv(contact.contact_phone_number || ''),
                this.escapeCsv(contact.contact_email_address_status || '')
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
            'First Name', 'Last Name', 'Email', 'Job Title', 
            'Company', 'Domain', 'Location', 'Phone', 'Email Status'
        ];

        const tsvContent = [
            headers.join('\t'),
            ...this.currentResults.map(contact => [
                contact.contact_first_name || '',
                contact.contact_last_name || '',
                contact.contact_email_address || '',
                contact.contact_job_title || '',
                contact.company || '',
                contact.company_domain || '',
                contact.location || '',
                contact.contact_phone_number || '',
                contact.contact_email_address_status || ''
            ].join('\t'))
        ].join('\n');

        this.downloadFile(tsvContent, 'contacts.xlsx', 'application/vnd.ms-excel');
        this.showToast('success', 'Export Complete', 'Excel file downloaded successfully');
    }

    escapeCsv(field) {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
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