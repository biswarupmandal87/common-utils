const fs = require('fs');
const axios = require('axios');
const path = require('path');
const moment = require('moment');
const pdf = require('pdf-parse');
const { fileTypeFromBuffer } = require('file-type');
const { ensureDirectoryExistence, getS3ImageObject, getS3FileObject } = require('./utils');
/**
 * Recursively deletes all objects under a given prefix (S3 "directory").
 * @param {AWS.S3} s3Client - An instance of AWS.S3 with custom config.
 * @param {string} bucketName - The name of the S3 bucket.
 * @param {string} prefix - The prefix (folder path) to delete objects from.
 * @returns {Promise<void>}
 */
const emptyS3Directory = async function (s3Client, bucketName, prefix) {
    if (!prefix || !bucketName || !s3Client) {
        throw new Error('s3Client, bucketName, and prefix are required.');
    }

    const listParams = {
        Bucket: bucketName,
        Prefix: prefix,
    };

    const listedObjects = await s3Client.listObjectsV2(listParams).promise();

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

    const deleteParams = {
        Bucket: bucketName,
        Delete: {
            Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
        },
    };

    await s3Client.deleteObjects(deleteParams).promise();

    if (listedObjects.IsTruncated) {
        // Handle paginated result
        await emptyS3Directory(s3Client, bucketName, prefix);
    }
};
/**
 * Copies all files from one prefix to another within the same S3 bucket.
 * @param {Object} options
 * @param {AWS.S3} options.s3Client - AWS S3 client instance
 * @param {string} options.bucketName - S3 bucket name
 * @param {string} options.from_prefix - Source folder prefix
 * @param {string} options.to_prefix - Destination folder prefix
 * @param {boolean} [options.only_direct=false] - Copy only direct children, not recursive
 * @returns {Promise<void>}
 */
const copyS3Directory = async function (options = {}) {
    const {
        s3Client,
        bucketName,
        from_prefix,
        to_prefix,
        only_direct = false,
    } = options;

    if (!s3Client || !bucketName || !from_prefix || !to_prefix) {
        throw new Error('s3Client, bucketName, from_prefix, and to_prefix are required.');
    }

    if (from_prefix === to_prefix) return;

    let continuationToken = null;
    let isTruncated = true;

    while (isTruncated) {
        const listParams = {
            Bucket: bucketName,
            Prefix: from_prefix,
            ContinuationToken: continuationToken,
        };

        const listedObjects = await s3Client.listObjectsV2(listParams).promise();
        if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

        for (const file of listedObjects.Contents) {
            try {
                const relativePath = file.Key.substring(from_prefix.length);
                const isDirectChild = !relativePath.includes("/");

                if (!only_direct || isDirectChild) {
                    const targetKey = file.Key.replace(from_prefix, to_prefix);
                    const copyParams = {
                        Bucket: bucketName,
                        CopySource: `/${bucketName}/${file.Key}`,
                        Key: targetKey,
                    };
                    await s3Client.copyObject(copyParams).promise();
                }
            } catch (err) {
                console.error(`Error copying ${file.Key}:`, err.message);
            }
        }

        isTruncated = listedObjects.IsTruncated;
        continuationToken = listedObjects.NextContinuationToken;
    }
};
/**
 * Deletes specific S3 files with optional prefix validation.
 */
const deleteS3Files = async (keys, keyPrefix, options = {}) => {
  const {
    s3Client,
    bucketName,
    privateBucket = false,
    validatePrefix = true,
  } = options;

  if (!s3Client || !bucketName || !keys || !keyPrefix) {
    throw new Error('s3Client, bucketName, keys, and keyPrefix are required.');
  }

  const keyList = Array.isArray(keys) ? keys : [keys];
  const keysToDelete = validatePrefix
    ? keyList.filter((k) => k.includes(keyPrefix))
    : keyList;

  if (keysToDelete.length === 0) {
    throw new Error('No valid keys found for deletion.');
  }

  const params = {
    Bucket: bucketName,
    Delete: {
      Objects: keysToDelete.map((Key) => ({ Key })),
    },
  };

  await s3Client.deleteObjects(params).promise();
};
/**
 * Uploads files from req.files or req.file_urls to S3.
 */
const uploadS3Files = async (req, options = {}) => {
  const {
    s3Client,
    bucketName,
    key = 'file',
    s3KeyPrefix = '',
    file_types = [],
    extract_pdf_text = false,
    extract_text = false,
    uploadDir = './uploads/',
  } = options;

  if (!s3Client || !bucketName) {
    throw new Error('s3Client and bucketName are required.');
  }

  const filesArray = [];

  const uploadLocalFile = async (file) => {
    let isValidType = true;

    if (file_types.length > 0) {
      const majorType = file.mimetype.split('/')[0];
      if (!file_types.includes(file.mimetype) && !file_types.includes(majorType)) {
        isValidType = false;
      }
    }

    try {
      await fileTypeFromBuffer(file.data); // Just to validate
    } catch (e) {
      console.error('Unable to detect file type', e);
    }

    if (isValidType) {
      const fileName = `${moment().utc().valueOf()}-${file.name}`;
      const keyPath = `${s3KeyPrefix}${fileName}`;
      const uploadPath = path.join(uploadDir, keyPath);
      ensureDirectoryExistence(uploadPath);

      const fileObject =
        file.mimetype.startsWith('image')
          ? getS3ImageObject(file, fileName, keyPath)
          : getS3FileObject(file, fileName, keyPath);

      await file.mv(uploadPath);

      if (file.mimetype === 'application/pdf' && extract_pdf_text) {
        const buffer = fs.readFileSync(uploadPath);
        const pdfData = await pdf(buffer);
        fileObject.pdf_data = pdfData;
      }

      if (['text/plain', 'text/csv'].includes(file.mimetype) && extract_text) {
        fileObject.text_data = fs.readFileSync(uploadPath, 'utf-8');
      }

      const stream = fs.createReadStream(uploadPath);
      await s3Client
        .upload({ Bucket: bucketName, Key: keyPath, Body: stream, ContentType: file.mimetype })
        .promise();

      fs.unlinkSync(uploadPath);
      filesArray.push(fileObject);
    }
  };

  if (req.files && req.files[key]) {
    const inputFiles = Array.isArray(req.files[key]) ? req.files[key] : [req.files[key]];
    for (const file of inputFiles) {
      await uploadLocalFile(file);
    }
  } else if (req.file_urls) {
    for (const url of req.file_urls) {
      const response = await axios.get(url, { responseType: 'stream' });
      const namePart = path.basename(url).split('.')[0];
      const fileName = `${moment().utc().valueOf()}-${namePart}.jpeg`;
      const keyPath = `${s3KeyPrefix}${fileName}`;
      const uploadPath = path.join(uploadDir, keyPath);

      ensureDirectoryExistence(uploadPath);

      const writer = fs.createWriteStream(uploadPath);
      response.data.pipe(writer);
      await new Promise((res, rej) => {
        writer.on('finish', res);
        writer.on('error', rej);
      });

      const file = {
        name: fileName,
        mimetype: 'image/jpeg',
      };
      const fileObject = getS3FileObject(file, fileName, keyPath);

      const stream = fs.createReadStream(uploadPath);
      await s3Client.upload({ Bucket: bucketName, Key: keyPath, Body: stream }).promise();

      fs.unlinkSync(uploadPath);
      filesArray.push(fileObject);
    }
  } else {
    throw new Error('No files or file_urls provided.');
  }

  return filesArray;
};
module.exports = {
    emptyS3Directory,
    copyS3Directory,
    deleteS3Files,
    uploadS3Files
};
