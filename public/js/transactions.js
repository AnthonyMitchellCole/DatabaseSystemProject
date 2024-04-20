function confirmDelete(element) {
    const transactionId = element.getAttribute('data-id');
    const productName = decodeURIComponent(element.getAttribute('data-product-name').replace(/\\'/g, "'"));

    if (confirm(`Are you sure you want to delete ${productName}?`)) {
        fetch('/transactions/' + transactionId, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
                window.location.href = window.location.pathname + '?error=' + encodeURIComponent(data.error);
            } else {
                window.location.href = '/transactions?success=' + encodeURIComponent(`Transaction deleted successfully`);
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Network or parsing error occurred.');
        });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const sortLinks = document.querySelectorAll('.sort-link');

    sortLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            disposeTooltips();

            const sortParam = this.dataset.sort;
            const sortOrder = this.dataset.order;
            const url = `/transactions?sort_by=${sortParam}&order=${sortOrder}`;

            fetch(url, { headers: { 'Accept': 'application/json' } })
                .then(response => response.json())
                .then(data => {
                    updateTable(data.transactions);
                    this.dataset.order = this.dataset.order === 'asc' ? 'desc' : 'asc';
                    initializeTooltips();
                })
                .catch(error => console.error('Error:', error));
        });
    });

    function updateTable(transactions) {
        const tableBody = document.getElementById('transactionsTableBody');
        tableBody.innerHTML = '';

        transactions.forEach(transaction => {
            // Using encodeURIComponent to safely encode product names
            const productName = transaction.product ? encodeURIComponent(transaction.product.name) : 'Product Deleted';
            const detailsRow = transaction.product && transaction.product.category ? `
                <div class="card card-body">
                    <div style="display: flex; align-items: center; justify-content: left;">
                        <div class="mx-5"><strong>Product Category:</strong> <span class="badge bg-info">${transaction.product.category.name}</span></div>
                        <div class="mx-5"><strong>Transaction Value:</strong> <span class="badge bg-warning">$${(transaction.product.price * transaction.quantity).toFixed(2)}</span></div>
                    </div>
                </div>
            ` : `<div class="card card-body">No detailed transaction information available.</div>`;

            const row = `
                <tr>
                    <td>
                        <button class="btn btn-outline-secondary btn-smaller" type="button" data-bs-toggle="collapse" data-bs-target="#transactionDetails${transaction._id}" aria-expanded="false" aria-controls="transactionDetails${transaction._id}">
                            <i class="fas fa-chevron-down" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Show/hide details"></i>
                        </button>
                        <span class="transaction-name">${decodeURIComponent(productName)}</span>  <!-- Decoding the encoded name for display -->
                    </td>
                    <td>
                        <span class="badge ${transaction.type === 'in' ? 'bg-success' : 'bg-danger'}">
                            ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                    </td>
                    <td>${transaction.quantity}</td>
                    <td>${moment(transaction.date).format('L LTS')}</td>
                    <td>
                        <a href="/transactions/edit/${transaction._id}" class="btn btn-info btn-smaller" data-bs-toggle="tooltip" data-bs-placement="left" title="Edit this transaction record"><i class="fas fa-edit"></i> Edit</a>
                        <a href="#" class="btn btn-danger btn-smaller" onclick="confirmDelete(this)" data-id="${transaction._id}" data-product-name="${productName}" data-bs-toggle="tooltip" data-bs-placement="right" title="Delete this transaction record"><i class="fas fa-trash-alt"></i> Delete</a>
                    </td>
                </tr>
                <tr class="collapse" id="transactionDetails${transaction._id}">
                    <td colspan="5">${detailsRow}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
        initializeTooltips(); // Reinitialize tooltips after updating the table
    }

    function initializeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function(tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    function disposeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function(tooltipTriggerEl) {
            const tooltipInstance = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
            if (tooltipInstance) {
                tooltipInstance.dispose();
            }
        });
    }
});