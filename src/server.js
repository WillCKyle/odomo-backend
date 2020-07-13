import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import path from 'path';

const app = express();

//tells the app where to serve images from
app.use(express.static(path.join(__dirname, '/build')));
// allows push requests to be sent with JSON body
app.use(bodyParser.json());

// reusable db connection
const withDB = async (operations, res) => {
  try {
    const client = await MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true });
    const db = client.db('odomo');

    await operations(db);

    client.close();
  } catch (error) {
    res.status(500).json({ message: 'Error connecting to db', error });
  }
}

// query the database for issue upvotes and comments
app.get('/api/issues/:name', async (req, res) => {
  withDB( async (db) => {
    const issueName = req.params.name;

    const issueInfo = await db.collection('issues').findOne({ name: issueName })
    res.status(200).json(issueInfo);
  }, res);
});

// upvotes
app.post('/api/issues/:name/upvote', async (req, res) => {
  withDB( async (db) => {
      const issueName = req.params.name;

      const issueInfo = await db.collection('issues').findOne({ name: issueName })
      await db.collection('issues').updateOne({ name: issueName },{
        '$set': {
          upvotes: issueInfo.upvotes + 1,
        },
      });
      const updatedIssueInfo = await db.collection('issues').findOne({ name: issueName });

      res.status(200).json(updatedIssueInfo);
  }, res);
});

// comments
app.post('/api/issues/:name/add-comment', async (req, res) => {
  withDB( async (db) => {
      const issueName = req.params.name;
      const { username, text } = req.body;

      const issueInfo = await db.collection('issues').findOne({ name: issueName })
      await db.collection('issues').updateOne({ name: issueName },{
        '$set': {
          comments: issueInfo.comments.concat({ username, text }),
        },
      });
      const updatedIssueInfo = await db.collection('issues').findOne({ name: issueName });

      res.status(200).json(updatedIssueInfo);
  }, res);
});

app.get('*', (req, res) => {
  res.sendfile(path.join(__dirname + '/build/index.html'));
});

app.listen(8000, () => console.log('Listening on port 8000'));
