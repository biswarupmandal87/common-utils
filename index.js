const axios = require('axios');
const { ensureDirectoryExistence, getS3ImageObject, getS3FileObject } = require('./utils');
const { copyS3Directory,uploadS3Files,emptyS3Directory,deleteS3Files } = require('./s3-utils');
let getLocationInfo = async (ip_address) => {
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip_address}?fields=status,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,query`);
        return response.data;
    } catch (error) {
        console.log(error.message);
        return {currency: 'USD',timezone: 'UTC'};
    }
};
let getCurrencyByIP = async (ip_address) => {
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip_address}?fields=status,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,query`);
        return response.data.currency || 'USD';
    } catch (error) {
        console.log(error.message);
        return 'USD';
    }
};
let getExchangeRate = async (from, to) => {
    try {
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
        return response.data.rates[to] || 1;
    } catch (error) {
        console.log(error.message);
        return 1;
    }
};
let convertPrice = (price, exchangeRate) => {
    try {
        // need to round off the price to 2 decimal places
        return Math.round(price * exchangeRate * 100) / 100;
    } catch (error) {
        console.log(error.message);
        return price;
    }
};


module.exports = {
    getLocationInfo,
    getCurrencyByIP,
    getExchangeRate,
    convertPrice,
    ensureDirectoryExistence,
    getS3ImageObject,
    getS3FileObject,
    uploadS3Files,
    emptyS3Directory,
    copyS3Directory,
    deleteS3Files
};