const fs = require('fs');
const path = require('path');
const ShortUniqueId = require('short-unique-id');
const uid = new ShortUniqueId({ length: 16 });
const sizeOf = require("image-size");
function ensureDirectoryExistence(filePath) {
    const dir = path.dirname(filePath);
    if (fs.existsSync(dir)) return;
    fs.mkdirSync(dir, { recursive: true });
}

function getS3ImageObject(file, fileName, keyPath) {
    const dimensions = sizeOf(file.data);
    return {
        _id: uid.rnd(),
        type: 'image',
        name: fileName,
        key: keyPath,
        mime: file.mimetype,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
    };
}

function getS3FileObject(file, fileName, keyPath) {
    return {
        _id: uid.rnd(),
        type: 'file',
        name: fileName,
        key: keyPath,
        mime: file.mimetype,
        size: file.size
    };
}

module.exports = {
    ensureDirectoryExistence,
    getS3ImageObject,
    getS3FileObject,
};
