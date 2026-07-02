import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "ru-central1", // Регион по умолчанию для Yandex Cloud
  endpoint: "https://storage.yandexcloud.net", // Точка доступа Яндекс Облака
  credentials: {
    accessKeyId: process.env.YANDEX_CLOUD_ACCESS_KEY_ID,
    secretAccessKey:  process.env.YANDEX_CLOUD_SECRET_ACCESS_KEY,
  },
});

export { s3 };