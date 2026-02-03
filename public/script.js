// DOM Elements
let currentBooks = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on
    const path = window.location.pathname;
    const page = path.split('/').pop();
    
    if (page === 'index.html' || page === '') {
        loadRecentBooks();
    } else if (page === 'library.html') {
        loadLibraryBooks();
        setupSearchAndFilter();
    } else if (page === 'upload.html') {
        setupUploadPage();
        loadUploadedBooks();
    }
});

// Load recent books for homepage
async function loadRecentBooks() {
    try {
        const response = await fetch('/api/books');
        const books = await response.json();
        
        const recentBooks = books.slice(-4).reverse(); // Get 4 most recent
        const container = document.getElementById('recentBooks');
        
        if (recentBooks.length === 0) {
            container.innerHTML = '<p class="empty-state">No books uploaded yet. <a href="upload.html">Upload your first book!</a></p>';
            return;
        }
        
        container.innerHTML = recentBooks.map(book => createBookCard(book)).join('');
        addBookCardListeners();
    } catch (error) {
        console.error('Error loading recent books:', error);
    }
}

// Load all books for library
async function loadLibraryBooks() {
    try {
        const response = await fetch('/api/books');
        currentBooks = await response.json();
        
        const container = document.getElementById('libraryBooks');
        const noBooks = document.getElementById('noBooks');
        
        if (currentBooks.length === 0) {
            container.style.display = 'none';
            noBooks.style.display = 'block';
            return;
        }
        
        container.innerHTML = currentBooks.reverse().map(book => createBookCard(book)).join('');
        addBookCardListeners();
    } catch (error) {
        console.error('Error loading library books:', error);
        document.getElementById('libraryBooks').innerHTML = 
            '<p class="error">Error loading books. Please try again.</p>';
    }
}

// Create book card HTML
function createBookCard(book) {
    const sizeInMB = (book.size / (1024 * 1024)).toFixed(2);
    const date = new Date(book.uploadedAt).toLocaleDateString();
    
    return `
        <div class="book-card" data-id="${book.id}">
            <div class="book-cover">
                <i class="fas fa-book"></i>
            </div>
            <div class="book-info">
                <h3 title="${book.title}">${book.title}</h3>
                <p><i class="fas fa-user"></i> ${book.author}</p>
                <p><i class="fas fa-calendar"></i> ${date}</p>
                <p><i class="fas fa-file"></i> ${sizeInMB} MB</p>
                <div class="book-meta">
                    <span class="book-format">EPUB</span>
                    <div class="book-actions">
                        <button class="action-btn read-btn" onclick="readBook('${book.id}')">
                            <i class="fas fa-play"></i> Read
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteBook('${book.id}', this)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Add click listeners to book cards
function addBookCardListeners() {
    document.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.book-actions')) {
                const bookId = this.getAttribute('data-id');
                readBook(bookId);
            }
        });
    });
}

// Setup search and filter for library
function setupSearchAndFilter() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const books = document.querySelectorAll('.book-card');
            
            books.forEach(book => {
                const title = book.querySelector('h3').textContent.toLowerCase();
                const author = book.querySelector('p:nth-child(2)').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || author.includes(searchTerm)) {
                    book.style.display = 'block';
                } else {
                    book.style.display = 'none';
                }
            });
        });
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            filterBooks(filter);
        });
    });
}

// Filter books based on criteria
function filterBooks(filter) {
    let filteredBooks = [...currentBooks];
    
    switch(filter) {
        case 'recent':
            filteredBooks = filteredBooks.reverse(); // Already sorted by upload date
            break;
        case 'largest':
            filteredBooks.sort((a, b) => b.size - a.size);
            break;
        case 'smallest':
            filteredBooks.sort((a, b) => a.size - b.size);
            break;
        case 'all':
        default:
            filteredBooks = filteredBooks.reverse();
    }
    
    const container = document.getElementById('libraryBooks');
    container.innerHTML = filteredBooks.map(book => createBookCard(book)).join('');
    addBookCardListeners();
}

// Setup upload page functionality
function setupUploadPage() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const bookTitle = document.getElementById('bookTitle');
    const bookAuthor = document.getElementById('bookAuthor');
    let selectedFile = null;
    
    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('dragover');
    }
    
    function unhighlight() {
        dropArea.classList.remove('dragover');
    }
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0 && files[0].name.endsWith('.epub')) {
            handleFileSelect(files[0]);
        } else {
            showMessage('Please drop only EPUB files', 'error');
        }
    }
    
    // File input change
    fileInput.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            handleFileSelect(this.files[0]);
        }
    });
    
    // Handle file selection
    function handleFileSelect(file) {
        if (!file.name.endsWith('.epub')) {
            showMessage('Please select only EPUB files', 'error');
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) {
            showMessage('File size must be less than 50MB', 'error');
            return;
        }
        
        selectedFile = file;
        
        // Auto-fill title from filename
        const title = file.name.replace('.epub', '').replace(/_/g, ' ');
        bookTitle.value = title;
        
        // Enable upload button
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `<i class="fas fa-upload"></i> Upload "${title}"`;
        
        showMessage(`Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`, 'success');
    }
    
    // Upload button click
    uploadBtn.addEventListener('click', async function() {
        if (!selectedFile) {
            showMessage('Please select a file first', 'error');
            return;
        }
        
        if (!bookTitle.value.trim()) {
            showMessage('Please enter a book title', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('epubFile', selectedFile);
        formData.append('title', bookTitle.value.trim());
        formData.append('author', bookAuthor.value.trim() || 'Unknown');
        
        // Show progress bar
        const progressContainer = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressContainer.style.display = 'block';
        uploadBtn.disabled = true;
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                progressFill.style.width = '100%';
                progressText.textContent = 'Upload complete!';
                
                showMessage('Book uploaded successfully!', 'success');
                
                // Reset form
                selectedFile = null;
                fileInput.value = '';
                bookTitle.value = '';
                bookAuthor.value = '';
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = `<i class="fas fa-upload"></i> Upload Book`;
                
                // Reload uploaded books list
                setTimeout(() => {
                    loadUploadedBooks();
                    progressContainer.style.display = 'none';
                    progressFill.style.width = '0%';
                    progressText.textContent = 'Uploading...';
                }, 1500);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showMessage(`Upload failed: ${error.message}`, 'error');
            progressContainer.style.display = 'none';
            uploadBtn.disabled = false;
        }
    });
    
    // Click drop area to trigger file input
    dropArea.addEventListener('click', function() {
        fileInput.click();
    });
}

// Load uploaded books for upload page
async function loadUploadedBooks() {
    try {
        const response = await fetch('/api/books');
        const books = await response.json();
        
        const container = document.getElementById('uploadedBooks');
        const recentBooks = books.slice(-5).reverse(); // Get 5 most recent
        
        if (recentBooks.length === 0) {
            container.innerHTML = '<p class="empty-state">No books uploaded yet.</p>';
            return;
        }
        
        container.innerHTML = recentBooks.map(book => `
            <div class="book-list-item">
                <i class="fas fa-book"></i>
                <div class="book-list-info">
                    <strong>${book.title}</strong>
                    <small>${book.author} • ${new Date(book.uploadedAt).toLocaleDateString()}</small>
                </div>
                <button class="btn btn-small" onclick="readBook('${book.id}')">
                    <i class="fas fa-play"></i> Read
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading uploaded books:', error);
    }
}

// Show message
function showMessage(text, type) {
    const messageDiv = document.getElementById('uploadMessage');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Read book
function readBook(bookId) {
    window.location.href = `reader.html?book=${bookId}`;
}

// Delete book
async function deleteBook(bookId, button) {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/book/${bookId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Remove book card with animation
            const card = button.closest('.book-card');
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                card.remove();
                
                // Reload books if on library page
                if (window.location.pathname.includes('library.html')) {
                    loadLibraryBooks();
                }
                
                // Reload recent books if on home page
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    loadRecentBooks();
                }
            }, 300);
        } else {
            alert('Failed to delete book: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting book:', error);
        alert('Error deleting book. Please try again.');
    }
}

// Make functions globally available
window.readBook = readBook;
window.deleteBook = deleteBook;
