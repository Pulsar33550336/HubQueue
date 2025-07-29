import "dotenv/config";

export const webdavConfig = {
    url: process.env.WEBDAV_URL!,
    username: process.env.WEBDAV_USERNAME!,
    password: process.env.WEBDAV_PASSWORD!,
};

if (!webdavConfig.url || !webdavConfig.username) {
    console.warn("WebDAV configuration is missing. Please check your .env.local file.");
}
