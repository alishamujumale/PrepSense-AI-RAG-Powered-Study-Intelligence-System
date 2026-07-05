const fs = require('fs');
const { MongoClient } = require('mongodb');

const envContent = fs.readFileSync('.env.local', 'utf8');
const uriLine = envContent.split('\n').find(l => l.startsWith('MONGODB_URI='));
const uri = uriLine.split('=').slice(1).join('=').trim();

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const docs = await db.collection('documents')
    .find({}, { projection: { originalName: 1, subject: 1, examId: 1, type: 1, userId: 1 } })
    .toArray();
  console.log(JSON.stringify(docs, null, 2));
  await client.close();
})();