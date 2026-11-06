import { AwsClient } from "aws4fetch";

const storage = new AwsClient({
  accessKeyId: "e2e-access-key",
  secretAccessKey: "e2e-secret-key-not-real",
  service: "s3",
  region: "auto",
});

for (let attempt = 1; attempt <= 30; attempt++) {
  const res = await storage
    .fetch("http://localhost:9000/sharencare-e2e", { method: "PUT" })
    .catch(() => null);

  if (res?.ok || res?.status === 409) {
    console.log("Storage is ready");
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

throw new Error("The storage server never became ready");
