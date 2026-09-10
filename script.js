(function(){
  const STORAGE_KEY = 'expenseTrackerData';
  const EXPENSE_CATEGORIES = ['Food','Transport','Utilities','Entertainment','Other'];
  const INCOME_CATEGORIES = ['Salary','Freelance','Other'];

  let transactions = [];
  let currentType = 'income';

  function loadData(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      transactions = raw ? JSON.parse(raw) : [];
    }catch(e){ transactions = []; }
  }
  
  function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }

  let editingTxId = null;
  let txToDeleteId = null;
  const deleteModalOverlay = document.getElementById('deleteModalOverlay');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const txToggleGraphBtn = document.getElementById('txToggleGraphBtn');
  const txChartSection = document.getElementById('txChartSection');
  let isGraphVisible = false;
  const btnOverviewMonth = document.getElementById('btnOverviewMonth');
  const overviewCategoryFilter = document.getElementById('overviewCategoryFilter');
  const overviewStats = document.getElementById('overviewStats');
  const overviewLegend = document.getElementById('overviewLegend');
  let overviewChartInstance = null;
  let overviewActiveMode = 'month';
  const statTodayIncome = document.getElementById('statTodayIncome');
  const statTodayExpense = document.getElementById('statTodayExpense');
  const statHighIncome = document.getElementById('statHighIncome');
  const statHighExpense = document.getElementById('statHighExpense');
  const txMonthFilter = document.getElementById('txMonthFilter');
  const currentMonthLabel = document.getElementById('currentMonthLabel');
  const txTypeFilter = document.getElementById('txTypeFilter');
  const categoryFilterModal = document.getElementById('categoryFilterModal');
  const categoryFilterClose = document.getElementById('categoryFilterClose');
  const categoryFilterSelect = document.getElementById('categoryFilterSelect');
  const applyCategoryFilterBtn = document.getElementById('applyCategoryFilterBtn');
  let selectedCategoryFilter = 'all';
  const txTabs = document.querySelectorAll('.tx-tabs button');
  const txChartBalanceContainer = document.getElementById('txChartBalanceContainer');
  const txChartBalance = document.getElementById('txChartBalance'); // <-- Ensure this is here
  let txChartInstance = null;
  const reportMonthLabel = document.getElementById('reportMonthLabel');
  const reportContent = document.getElementById('reportContent');

  const homeIncome = document.getElementById('homeIncome');
  const homeExpense = document.getElementById('homeExpense');
  const homeBalance = document.getElementById('homeBalance');
  const recentList = document.getElementById('recentList');
  const fabAdd = document.getElementById('fabAdd');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const saveBtn = document.getElementById('saveBtn');
  const typeButtons = document.querySelectorAll('.type-toggle button');
  const amountInput = document.getElementById('amount');
  const dateInput = document.getElementById('date');
  const categorySelect = document.getElementById('category');
  const descriptionInput = document.getElementById('description');
  const allTransactionsList = document.getElementById('allTransactionsList');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const pages = {
    home: document.getElementById('page-home'),
    transactions: document.getElementById('page-transactions'),
    report: document.getElementById('page-report')
  };
  const goToTransactionsFromRecent = document.getElementById('goToTransactionsFromRecent');

  
  // Set date to balance card
const dateDisplay = document.getElementById('currentDate');
if (dateDisplay) {
  const today = new Date();
  
  const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  dateDisplay.textContent = today.toLocaleDateString('en-GB', dateOptions);
}
  // Update text  when the dropdown changes
  if (txMonthFilter && currentMonthLabel) {
    txMonthFilter.addEventListener('change', () => {
      const selectedText = txMonthFilter.options[txMonthFilter.selectedIndex].text;
      currentMonthLabel.textContent = txMonthFilter.value === 'all' ? 'All Months' : selectedText;
    });
  }
  if (txTypeFilter) {
    txTypeFilter.addEventListener('change', (e) => {
      if (e.target.value === 'category') {
        const allCats = [...new Set(transactions.map(t => t.category))].sort();
        categoryFilterSelect.innerHTML = allCats.map(c => `<option value="${c}">${c}</option>`).join('');
        categoryFilterModal.classList.add('open');
      } else {
        selectedCategoryFilter = 'all';
        renderTransactionsPage(); 
      }
    });
  }

  // Toggle Graph
  if (txToggleGraphBtn && txChartSection) {
    txToggleGraphBtn.addEventListener('click', () => {
      isGraphVisible = !isGraphVisible;
      
      txToggleGraphBtn.classList.toggle('active', isGraphVisible);
      
      txChartSection.style.display = isGraphVisible ? 'block' : 'none';
      
      // Default to overview
      if (isGraphVisible) {
        if (txTypeFilter) txTypeFilter.value = 'all';
        selectedCategoryFilter = 'all';
        renderTransactionsPage();
      }
    });
  }
  // Handle the 3 chart buttons
  if (txTabs.length > 0) {
    txTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        if (txTypeFilter) txTypeFilter.value = btn.dataset.view;
        if (btn.dataset.view !== 'category') selectedCategoryFilter = 'all';
        
        renderTransactionsPage();
      });
    });
  }

  // Toggle between This Month and Categories
  if (btnOverviewMonth && overviewCategoryFilter) {
    
    // 1. clicj this month
    btnOverviewMonth.addEventListener('click', () => {
      overviewActiveMode = 'month';
      overviewCategoryFilter.value = 'default';
      renderOverview();
    });

    // 2. Change the Dropdown 
    overviewCategoryFilter.addEventListener('change', () => {
      if (overviewCategoryFilter.value !== 'default') {
        overviewActiveMode = 'category';
        renderOverview();
      }
    });
  }
  if (categoryFilterClose) {
    categoryFilterClose.addEventListener('click', () => {
      categoryFilterModal.classList.remove('open');
      if (txTypeFilter.value === 'category' && selectedCategoryFilter === 'all') {
        txTypeFilter.value = 'all';
      }
    });
  }

  if (applyCategoryFilterBtn) {
    applyCategoryFilterBtn.addEventListener('click', () => {
      selectedCategoryFilter = categoryFilterSelect.value;
      categoryFilterModal.classList.remove('open');
      renderTransactionsPage();
    });
  }

  // Handle 3-dots menu
  document.addEventListener('click', (e) => {
    
    if (!e.target.closest('.tx-actions-wrapper')) {
      document.querySelectorAll('.tx-menu').forEach(m => m.classList.remove('open'));
    }

    
    if (e.target.classList.contains('tx-actions')) {
      
      const wrapper = e.target.closest('.tx-actions-wrapper');
      const menu = wrapper.querySelector('.tx-menu');
      document.querySelectorAll('.tx-menu').forEach(m => { 
        if (m !== menu) m.classList.remove('open'); 
      });
      
      menu.classList.toggle('open');
    }

    // Handle Delete
    if (e.target.classList.contains('action-delete')) {
      txToDeleteId = e.target.dataset.id;
      document.getElementById('deleteModalOverlay').classList.add('open');
    }

    // Handle Info
    if (e.target.classList.contains('action-info')) {
      const t = transactions.find(t => t.id === e.target.dataset.id);
      const content = document.getElementById('infoModalContent');
      content.innerHTML = `
        <div><strong>Description:</strong> ${t.description}</div>
        <div><strong>Amount:</strong> ${formatMoney(t.amount)}</div>
        <div><strong>Type:</strong> <span class="pill pill-${t.type === 'income' ? 'green' : 'red'}">${t.type}</span></div>
        <div><strong>Category:</strong> ${t.category}</div>
        <div><strong>Date:</strong> ${formatDate(t.date)}</div>
      `;
      document.getElementById('infoModalOverlay').classList.add('open');
    }

    // Handle Edit
    if (e.target.classList.contains('action-edit')) {
      const t = transactions.find(t => t.id === e.target.dataset.id);
      editingTxId = t.id;
      document.getElementById('formTitle').textContent = 'Edit Transaction';
      document.getElementById('saveBtn').textContent = 'Save Changes';
      

      currentType = t.type;
      typeButtons.forEach(b => b.classList.toggle('active', b.dataset.type === t.type));
      populateCategorySelect();
      
      amountInput.value = t.amount;
      dateInput.value = t.date;
      categorySelect.value = t.category;
      descriptionInput.value = t.description;
      
      openModal();
    }
  });

  // Close Info
  document.getElementById('infoModalClose')?.addEventListener('click', () => {
    document.getElementById('infoModalOverlay').classList.remove('open');
  });

  // Custom Delete Confirm
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      txToDeleteId = null;
      deleteModalOverlay.classList.remove('open');
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      if (txToDeleteId) {
        transactions = transactions.filter(t => t.id !== txToDeleteId);
        saveData(); 
        renderAll(); 
        
        
        const txPage = document.getElementById('page-transactions');
        if (txPage && txPage.classList.contains('active')) {
          renderTransactionsPage();
        }
        
        txToDeleteId = null;
        deleteModalOverlay.classList.remove('open');
      }
    });
  }

  function goToPage(pageId) {
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageId));
    Object.keys(pages).forEach(key => {
      if(pages[key]) pages[key].classList.toggle('active', key === pageId);
    });
    
    if(pageId === 'transactions') {
      populateMonthFilter();
      renderTransactionsPage();
    }
    if (pageId === 'report') {
      renderReportPage();
    }
  }

  function populateMonthFilter() {
    if (!txMonthFilter) return;
    const months = [...new Set(transactions.map(t => t.date.substring(0, 7)))].sort().reverse();
    
    txMonthFilter.innerHTML = '<option value="all">All Months</option>' + 
      months.map(m => {
        const dateObj = new Date(m + '-01');
        const label = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        return `<option value="${m}">${label}</option>`;
      }).join('');
      
    if (currentMonthLabel) {
      currentMonthLabel.textContent = txMonthFilter.options[txMonthFilter.selectedIndex].text;
    }
  }

  function renderTxChart(filteredData, selectedType) {
    const canvas = document.getElementById('txChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (txChartInstance) {
      txChartInstance.destroy();
    }

    if (!filteredData.length) return;

    if (selectedType === 'all' || selectedType === 'category') {

      const chronologicalData = [...filteredData].sort((a, b) => new Date(a.date) - new Date(b.date));

      const dates = [...new Set(chronologicalData.map(t => t.date))];

      let runningBalance = 0;
      const trendData = dates.map(d => {
        const dayTxs = chronologicalData.filter(t => t.date === d);
        const dayNet = dayTxs.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
        runningBalance += dayNet;
        return runningBalance;
      });

      txChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dates.map(d => formatDate(d).substring(0, 6)), 
          datasets: [{ 
            label: 'Balance Trend', 
            data: trendData, 
            borderColor: '#de722f', /* Blue line */
            backgroundColor: 'rgba(96, 165, 250, 0.1)', 
            fill: true, 
            tension: 0.3 
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { display: false } }, 
          scales: { 
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } }, 
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(38, 51, 72, 0.5)' } } 
          } 
        }
      });
    } else {
      // INCOME  or EXPENSE CHART 
      const color = selectedType === 'income' ? '#34d399' : '#fb7185';

      const chronologicalData = [...filteredData].sort((a, b) => new Date(a.date) - new Date(b.date));

      const dates = [...new Set(chronologicalData.map(t => t.date))];

      const dateTotals = dates.map(d => {
        return chronologicalData
          .filter(t => t.date === d)
          .reduce((sum, t) => sum + t.amount, 0);
      });

      txChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dates.map(d => formatDate(d).substring(0, 6)), // e.g. "05 Sep"
          datasets: [{ 
            label: selectedType.charAt(0).toUpperCase() + selectedType.slice(1), 
            data: dateTotals, 
            backgroundColor: color, 
            borderRadius: 6 
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { display: false } }, 
          scales: { 
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } }, 
            y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(38, 51, 72, 0.5)' } } 
          } 
        }
      });
    }
  }


  function renderTransactionsPage() {
    if (!allTransactionsList) return;
    
    let filtered = transactions;
    const selectedMonth = txMonthFilter ? txMonthFilter.value : 'all';
    const selectedType = txTypeFilter ? txTypeFilter.value : 'all';
    
    if (txTabs) {
      txTabs.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === selectedType || (btn.dataset.view === 'all' && selectedType === 'category'));
      });
    }
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(t => t.date.startsWith(selectedMonth));
    }

    if (selectedType === 'income') {
      filtered = filtered.filter(t => t.type === 'income');
    } else if (selectedType === 'expense') {
      filtered = filtered.filter(t => t.type === 'expense');
    } else if (selectedType === 'category' && selectedCategoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategoryFilter);
    }
    
    if (currentMonthLabel && txMonthFilter) {
      const selectedText = txMonthFilter.options[txMonthFilter.selectedIndex].text;
      let labelSuffix = '';
      
      if (selectedType === 'income') labelSuffix = ' (Income)';
      if (selectedType === 'expense') labelSuffix = ' (Expense)';
      if (selectedType === 'category') labelSuffix = ` (${selectedCategoryFilter})`;

      currentMonthLabel.textContent = (selectedMonth === 'all' ? 'All Months' : selectedText) + labelSuffix;
    }
    
    const sorted = [...filtered].sort((a,b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
    allTransactionsList.innerHTML = getGroupedTransactionsHTML(sorted);
    const monthDataOnly = selectedMonth !== 'all' ? transactions.filter(t => t.date.startsWith(selectedMonth)) : transactions;
    const dataForChart = (selectedType === 'all' || selectedType === 'category') ? monthDataOnly : sorted;
    if (txChartBalanceContainer) {
      txChartBalanceContainer.style.display = (selectedType === 'all' || selectedType === 'category') ? 'block' : 'none';
    }

    // 2. Calculate the math
    if (txChartBalance) {
      const currentInc = monthDataOnly.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const currentExp = monthDataOnly.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const currentBal = currentInc - currentExp;
      
      txChartBalance.textContent = formatMoney(currentBal);
      txChartBalance.style.color = currentBal >= 0 ? 'var(--color-green)' : 'var(--color-red)';
    }
    if (isGraphVisible) {
      const dataForChart = (selectedType === 'all' || selectedType === 'category') ? monthDataOnly : sorted;
      renderTxChart(dataForChart, selectedType);
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if(btn.dataset.page) goToPage(btn.dataset.page);
    });
  });

  if (goToTransactionsFromRecent) {
    goToTransactionsFromRecent.addEventListener('click', () => goToPage('transactions'));
  }

  function getGroupedTransactionsHTML(txList) {
    if (!txList.length) return '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No transactions found.</div>';


    const groups = {};
    txList.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

    return sortedDates.map(date => `
      <div class="tx-group">
        <div class="tx-date-header">${formatDate(date)}</div>
        <div class="tx-group-container">
          ${groups[date].map(t => transactionRowHtml(t)).join('')}
        </div>
      </div>
    `).join('');
  }

  function renderReportPage() {
    if (!reportContent) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);

    const dateObj = new Date(thisMonthStr + '-01');
    if (reportMonthLabel) {
      reportMonthLabel.textContent = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }

    const monthData = transactions.filter(t => t.date.startsWith(thisMonthStr));
    const inc = monthData.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = monthData.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const bal = inc - exp;

    // Calculate cat total for breakdown
    const catTotals = {};
    monthData.filter(t => t.type === 'expense').forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });

    const breakdownHtml = Object.keys(catTotals)
      .sort((a, b) => catTotals[b] - catTotals[a])
      .map(cat => `
        <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid rgba(38, 51, 72, 0.5);">
          <span style="font-weight: 500;">${cat}</span>
          <span class="text-red" style="font-weight: 600;">${formatMoney(catTotals[cat])}</span>
        </div>
      `).join('');

  
    reportContent.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px;">
        <div style="background: var(--bg-dark); padding: 24px; border-radius: 16px; border: 1px solid var(--border); text-align: center;">
          <div style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">TOTAL INCOME</div>
          <div style="color: var(--color-green); font-size: 1.8rem; font-weight: 700;">${formatMoney(inc)}</div>
        </div>
        <div style="background: var(--bg-dark); padding: 24px; border-radius: 16px; border: 1px solid var(--border); text-align: center;">
          <div style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">TOTAL EXPENSE</div>
          <div style="color: var(--color-red); font-size: 1.8rem; font-weight: 700;">${formatMoney(exp)}</div>
        </div>
        <div style="background: var(--bg-dark); padding: 24px; border-radius: 16px; border: 1px solid var(--border); text-align: center;">
          <div style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">NET SAVINGS</div>
          <div style="color: ${bal >= 0 ? 'var(--color-green)' : 'var(--color-red)'}; font-size: 1.8rem; font-weight: 700;">${formatMoney(bal)}</div>
        </div>
      </div>
      
      <h3 style="margin-bottom: 20px; font-size: 1.2rem; border-bottom: 1px solid var(--border); padding-bottom: 12px;">Expense Breakdown</h3>
      <div style="background: var(--bg-dark); padding: 0 20px; border-radius: 16px; border: 1px solid var(--border);">
        ${breakdownHtml || '<div style="padding: 24px 0; color: var(--text-muted); text-align: center;">No expenses recorded this month.</div>'}
      </div>
    `;
  }

  function formatMoney(n, prefix = '') {
    return prefix + '₹' + Math.abs(n).toLocaleString('en-IN');
  }

  function formatDate(dstr){
    const d = new Date(dstr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }

  function getCategoriesFor(type){
    return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }

  function populateCategorySelect(){
    const cats = getCategoriesFor(currentType);
    categorySelect.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
      populateCategorySelect();
    });
  });

  function openModal(){ 
    document.body.style.overflow = 'hidden';
    modalOverlay.classList.add('open'); 
  }
  function closeModal(){ 
    document.body.style.overflow = 'auto';
    modalOverlay.classList.remove('open'); 
  }

  fabAdd.addEventListener('click', () => {
    editingTxId = null;
    document.getElementById('formTitle').textContent = 'Add Transaction';
    document.getElementById('saveBtn').textContent = 'Add';
    
    amountInput.value = '';
    dateInput.value = new Date().toISOString().split('T')[0];
    descriptionInput.value = '';
    populateCategorySelect();
    openModal();
  });

  modalCloseBtn.addEventListener('click', closeModal);
  cancelEditBtn.addEventListener('click', closeModal);
  
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  saveBtn.addEventListener('click', (e) => {
    e.preventDefault(); // prevents browser showing msg
    
    if (amountInput.value.trim() === '') {
      showError("Please enter an amount.");
      return; 
    }
    
    const amount = parseFloat(amountInput.value);
    
    if (isNaN(amount) || amount <= 0) {
      showError("Amount must be greater than ₹0.");
      return; 
    }
    
    // saving the transaction
    const txData = {
      id: editingTxId || Date.now().toString(),
      type: currentType,
      amount,
      date: dateInput.value,
      category: categorySelect.value,
      description: descriptionInput.value || categorySelect.value
    };

    if (editingTxId) {
     
      transactions = transactions.map(t => t.id === editingTxId ? txData : t);
    } else {
    
      transactions.unshift(txData);
    }
    
    saveData();
    closeModal();
    renderAll();
    
    if(document.getElementById('page-transactions').classList.contains('active')) {
      renderTransactionsPage();
    }
  });

  function transactionRowHtml(t){
    const isInc = t.type === 'income';
    const sign = isInc ? '+' : '-';
    const iconPath = isInc 
      ? '<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>' 
      : '<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>';
    
    return `
      <div class="transaction">
        <div class="tx-icon ${t.type}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconPath}</svg>
        </div>
        
        <div class="tx-details">
          <div class="tx-main-info">
            <div class="tx-title">${t.description}</div>
            <div class="tx-category-wrapper"><span class="pill pill-blue">${t.category}</span></div>
          </div>
          
          <div class="tx-financials">
            <div class="tx-date-wrapper"><span class="tx-date">${formatDate(t.date)}</span></div>
            <div class="tx-amount ${t.type}">${formatMoney(t.amount, sign)}</div>
            <div class="tx-type-wrapper"><span class="pill pill-${isInc ? 'green' : 'red'}">${isInc ? 'Income' : 'Expense'}</span></div>
          </div>
        </div>
        
        <div class="tx-actions-wrapper">
          <button class="tx-actions" data-id="${t.id}">⋮</button>
          <div class="tx-menu" id="menu-${t.id}">
            <button class="tx-menu-item action-info" data-id="${t.id}">Info</button>
            <button class="tx-menu-item action-edit" data-id="${t.id}">Edit</button>
            <button class="tx-menu-item text-red action-delete" data-id="${t.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderOverview() {
    const canvas = document.getElementById('overviewChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (overviewChartInstance) overviewChartInstance.destroy();

    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);
    const monthData = transactions.filter(t => t.date.startsWith(thisMonthStr));

    if (overviewActiveMode === 'month') {
      btnOverviewMonth.style.background = 'var(--pill-bg-blue)';
      btnOverviewMonth.style.color = 'var(--color-blue)';
      btnOverviewMonth.style.borderColor = 'var(--color-blue)';
      
      overviewCategoryFilter.style.background = 'var(--bg-dark)';
      overviewCategoryFilter.style.color = 'var(--text-main)';
      overviewCategoryFilter.style.borderColor = 'var(--border)';
      
      overviewStats.style.display = 'flex';
      overviewLegend.style.display = 'none';

      // MONTHLY MULTIBAR GRAPH 
      const todayInc = monthData.filter(t => t.date === todayStr && t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const todayExp = monthData.filter(t => t.date === todayStr && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      
      const incArr = monthData.filter(t => t.type === 'income').map(t => t.amount);
      const expArr = monthData.filter(t => t.type === 'expense').map(t => t.amount);
      
      if(statTodayIncome) statTodayIncome.textContent = formatMoney(todayInc);
      if(statTodayExpense) statTodayExpense.textContent = formatMoney(todayExp);
      if(statHighIncome) statHighIncome.textContent = formatMoney(incArr.length ? Math.max(...incArr) : 0);
      if(statHighExpense) statHighExpense.textContent = formatMoney(expArr.length ? Math.max(...expArr) : 0);

      const chronological = [...monthData].sort((a, b) => new Date(a.date) - new Date(b.date));
      const dates = [...new Set(chronological.map(t => t.date))];
      const incData = dates.map(d => chronological.filter(t => t.date === d && t.type === 'income').reduce((s, t) => s + t.amount, 0));
      const expData = dates.map(d => chronological.filter(t => t.date === d && t.type === 'expense').reduce((s, t) => s + t.amount, 0));

      overviewChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dates.map(d => formatDate(d).substring(0, 6)),
          datasets: [
            { label: 'Income', data: incData, backgroundColor: '#34d399', borderRadius: 4 },
            { label: 'Expense', data: expData, backgroundColor: '#fb7185', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(38, 51, 72, 0.5)' } }
          }
        }
      });

    } else {
      //  RENDER CATEGORIES DONUT GRAPH 
      btnOverviewMonth.style.background = 'var(--bg-dark)';
      btnOverviewMonth.style.color = 'var(--text-main)';
      btnOverviewMonth.style.borderColor = 'var(--border)';
      
      overviewCategoryFilter.style.background = 'var(--pill-bg-blue)';
      overviewCategoryFilter.style.color = 'var(--color-blue)';
      overviewCategoryFilter.style.borderColor = 'var(--color-blue)';

      overviewStats.style.display = 'none';
      overviewLegend.style.display = 'flex';

      const selectedType = overviewCategoryFilter.value !== 'default' ? overviewCategoryFilter.value : 'expense';
      const filteredByType = monthData.filter(t => t.type === selectedType);
      
      const catTotals = {};
      filteredByType.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });

      const categories = Object.keys(catTotals);
      const amounts = Object.values(catTotals);
      const colors = ['#e035c4','#60a5fa','#f69595', '#fbbf24', '#a78bfa', '#fb923c', '#2dd4bf'];

      if (categories.length === 0) {
        overviewLegend.innerHTML = '<div style="color: var(--text-muted); text-align: center; font-size: 0.9rem; margin: auto;">No data for this month.</div>';
      } else {
        overviewLegend.innerHTML = categories.map((cat, i) => `
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 14px; height: 14px; border-radius: 4px; background: ${colors[i % colors.length]};"></div>
              <span style="color: var(--text-muted); font-weight: 500;">${cat}</span>
            </div>
            <div style="font-weight: 700; color: var(--text-main);">${formatMoney(catTotals[cat])}</div>
          </div>
        `).join('');
      }

      overviewChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: categories,
          datasets: [{ data: amounts, backgroundColor: colors.slice(0, categories.length), borderWidth: 0, hoverOffset: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '75%',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: function(c) { return ' ₹' + c.raw.toLocaleString('en-IN'); } } }
          }
        }
      });
    }
  }

  // Error handling section ann
function showError(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="#ef4444" fill="none" stroke-width="2" style="margin-right: 8px;">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  requestAnimationFrame(() => toast.classList.add('show'));
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300); 
  }, 3500);
}


  function renderAll(){
    const income = transactions.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
    const balance = income - expense;
    
    homeIncome.textContent = formatMoney(income);
    homeExpense.textContent = formatMoney(expense);
    homeBalance.textContent = formatMoney(balance);
    
    const recent = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date) || b.id - a.id).slice(0, 5);
    recentList.innerHTML = recent.map(transactionRowHtml).join('');

    renderOverview();
    if(pages.report && pages.report.classList.contains('active')) renderReportPage();
  }

  loadData();
  renderAll();
})();