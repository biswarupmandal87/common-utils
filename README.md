# common-utils

A comprehensive utility library for NodeJS applications providing geolocation, currency conversion, and AWS S3 file management functions.

This library simplifies common tasks such as retrieving location information from IP addresses, converting prices between currencies, ensuring directory existence for file operations, and managing files in AWS S3.   It is designed to be easy to use and integrate into your NodeJS projects, making it a valuable tool for developers working with geolocation, currency data, and cloud storage.

## Installation

```bash
npm install nodejs-common-utils
```

## Features

- **Geolocation**: Get location information from IP addresses
- **Currency Conversion**: Convert prices between different currencies
- **File System Utilities**: Ensure directory existence for safe file operations
- **AWS S3 Operations**:
  - Upload files to S3
  - Copy S3 directories
  - Delete S3 files and directories
  - Get file and image object information

## Usage

### Geolocation and Currency Functions

```javascript
const { getLocationInfo, getCurrencyByIP, getExchangeRate, convertPrice } = require('nodejs-common-utils');

// Get location info for an IP address
const locationInfo = await getLocationInfo('8.8.8.8');

// Get currency code for an IP address
const currency = await getCurrencyByIP('8.8.8.8');

// Get exchange rate from USD to EUR
const rate = await getExchangeRate('USD', 'EUR');

// Convert price using exchange rate
const priceInEUR = convertPrice(100, 0.85); // 85.00
```

### File System Utilities

```javascript
const { ensureDirectoryExistence } = require('nodejs-common-utils');

// Make sure directory exists before writing a file
const filePath = '/path/to/your/file.txt';
ensureDirectoryExistence(filePath);
fs.writeFileSync(filePath, 'Your content here');
```

### S3 Utilities

```javascript
const AWS = require('aws-sdk');
const { 
  uploadS3Files, 
  emptyS3Directory, 
  copyS3Directory, 
  deleteS3Files,
  getS3ImageObject,
  getS3FileObject
} = require('nodejs-common-utils');

// Configure AWS S3 client
const s3Client = new AWS.S3({
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY',
  region: 'YOUR_REGION'
});

// Example: Upload files to S3
const files = await uploadS3Files(req, {
  s3Client,
  bucketName: 'your-bucket-name',
  key: 'file', // Form field name
  s3KeyPrefix: 'uploads/',
  file_types: ['image/jpeg', 'image/png', 'application/pdf'],
  extract_pdf_text: true
});

// Example: Copy S3 directory
await copyS3Directory({
  s3Client,
  bucketName: 'your-bucket-name',
  from_prefix: 'source-folder/',
  to_prefix: 'destination-folder/',
  only_direct: false // Whether to copy only direct children
});

// Example: Empty S3 directory
await emptyS3Directory(s3Client, 'your-bucket-name', 'folder-to-empty/');

// Example: Delete specific S3 files
await deleteS3Files(
  ['path/to/file1.jpg', 'path/to/file2.pdf'], 
  'path/to/', 
  { s3Client, bucketName: 'your-bucket-name' }
);
```

## Dependencies

- axios - For HTTP requests
- moment - For date handling
- short-unique-id - For generating unique identifiers
- image-size - For getting image dimensions
- pdf-parse - For extracting text from PDF files
- file-type - For detecting file types from buffers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Biswarup Mandal

## Repository

[GitHub](https://github.com/biswarupmandal87/common-utils)

## Issues

[Report issues](https://github.com/biswarupmandal87/common-utils/issues)
