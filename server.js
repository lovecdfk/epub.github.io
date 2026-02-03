const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure directories exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const booksFile = 'books.json';

// Initialize books.json if it doesn't exist
if (!fs.existsSync(booksFile)) {
    fs.writeFileSync(booksFile, JSON.stringify([]));
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `${uniqueId}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/epub+zip' || 
            file.originalname.endsWith('.epub')) {
            cb(null, true);
        } else {
            cb(new Error('Only EPUB files are allowed'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Routes
app.get('/api/books', (req, res) => {
    try {
        const books = JSON.parse(fs.readFileSync(booksFile));
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load books' });
    }
});

app.post('/api/upload', upload.single('epubFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const bookInfo = {
            id: uuidv4(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            title: req.body.title || req.file.originalname.replace('.epub', ''),
            author: req.body.author || 'Unknown',
            uploadedAt: new Date().toISOString(),
            size: req.file.size
        };

        // Add to books.json
        const books = JSON.parse(fs.readFileSync(booksFile));
        books.push(bookInfo);
        fs.writeFileSync(booksFile, JSON.stringify(books, null, 2));

        res.json({ 
            success: true, 
            message: 'Book uploaded successfully',
            book: bookInfo
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/book/:id', (req, res) => {
    try {
        const books = JSON.parse(fs.readFileSync(booksFile));
        const book = books.find(b => b.id === req.params.id);
        
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        res.json(book);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch book' });
    }
});

// Delete book endpoint (optional)
app.delete('/api/book/:id', (req, res) => {
    try {
        const books = JSON.parse(fs.readFileSync(booksFile));
        const bookIndex = books.findIndex(b => b.id === req.params.id);
        
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        const book = books[bookIndex];
        
        // Remove file
        const filePath = path.join('uploads', book.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Remove from books.json
        books.splice(bookIndex, 1);
        fs.writeFileSync(booksFile, JSON.stringify(books, null, 2));
        
        res.json({ success: true, message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
