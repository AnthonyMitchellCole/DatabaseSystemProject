function confirmDelete(productId, encodedProductName) {
const productName = decodeURIComponent(encodedProductName).replace(/'/g, "\\'");

if (confirm(`Are you sure you want to delete '${productName}'?`)) {
    fetch('/products/' + productId, {
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
            window.location.href = '/products?success=' + encodeURIComponent(`Product '${productName}' deleted successfully`);
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
            const url = `/products?sort_by=${sortParam}&order=${sortOrder}`;

            fetch(url, { headers: { 'Accept': 'application/json' } })
                .then(response => response.json())
                .then(data => {
                    updateTable(data.products);
                    this.dataset.order = this.dataset.order === 'asc' ? 'desc' : 'asc';
                    initializeTooltips();
                })
                .catch(error => console.error('Error:', error));
        });
});

function updateTable(products) {
    const tableBody = document.getElementById('productsTableBody');
    tableBody.innerHTML = ''; // Clear the table body

    products.forEach(product => {
        let transactionsContent = product.transactions && product.transactions.length > 0 ? product.transactions.map(transaction => `
            <a href="#" class="list-group-item list-group-item-action flex-column align-items-start">
                <div class="d-flex w-100 justify-content-between">
                    <strong class="mb-1">Transaction: ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</strong>
                    <small>Date: ${moment(transaction.date).format('L LTS')}</small>
                </div>
                <p class="mb-1">Product: ${transaction.product ? transaction.product.name : 'Product Deleted'}</p>
                <small>Quantity: ${transaction.quantity}</small>
            </a>
        `).join('') : '<p class="text-muted mb-0">No transactions found.</p>';

        const row = `
            <tr>
                <td>
                    <button class="btn btn-outline-secondary btn-smaller toggle-button" type="button" data-bs-toggle="collapse" data-bs-target="#transactions${product._id}" aria-expanded="false" aria-controls="transactions${product._id}">
                        <i class="fas fa-chevron-down" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Show/hide transactions"></i>
                    </button>
                    <span class="product-name">${product.name}</span>
                </td>
                <td>${product.description}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td><span class="transaction-quantity">${product.quantity}</span></td>
                <td>${product.category ? product.category.name : 'Uncategorized'}</td>
                <td>
                    <a href="/products/edit/${product._id}" class="btn btn-info btn-smaller" data-bs-toggle="tooltip" data-bs-placement="left" title="Edit this product record"><i class="fas fa-edit"></i> Edit</a>
                    <a href="#" class="btn btn-danger btn-smaller" onclick="confirmDelete('${product._id}', '${encodeURIComponent(product.name.replace(/'/g, "\\'"))}')" data-id="${product._id}" data-bs-toggle="tooltip" data-bs-placement="right" title="Delete this product record"><i class="fas fa-trash-alt"></i> Delete</a>
                </td>
            </tr>
            <tr class="collapse" id="transactions${product._id}">
                <td colspan="6">
                    <div class="card card-body">
                        <div class="list-group">
                            ${transactionsContent}
                        </div>
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row; // Append the new row
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