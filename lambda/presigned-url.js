import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKETNAME = "presignedurl-demo07";
const REGION = "us-east-1";

const s3 = new S3Client({ region: REGION });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

export const handler = async (event) => {
  try {
    let command;
    let objectKey;

    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ""
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      objectKey = body.fileName;

      command = new PutObjectCommand({
        Bucket: BUCKETNAME,
        Key: objectKey
      });
    }

    else if (event.httpMethod === "GET") {
      objectKey = event.queryStringParameters?.key;

      command = new GetObjectCommand({
        Bucket: BUCKETNAME,
        Key: objectKey
      });
    }

    else {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Method not allowed" })
      };
    }

    const url = await getSignedUrl(s3, command, { expiresIn: 600 });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ url, key: objectKey })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Internal error" })
    };
  }
};
