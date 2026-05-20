const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;
const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("zen-study");
    const roomsCollection = db.collection("rooms");

    app.get("/rooms/:id", async (req, res) => {
      const { id } = req.params;

      const room = await roomsCollection.findOne({ _id: new ObjectId(id) });
      res.send(room);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/rooms", async (req, res) => {
  try {
    const rooms = await client
      .db("zen-study")
      .collection("rooms")
      .find()
      .toArray();
    res.send(rooms);
  } catch (error) {
    res.status(500).send({ message: "Rooms fetch failed" });
  }
});

app.get("/latest-rooms", async (req, res) => {
  try {
    const rooms = await client
      .db("zen-study")
      .collection("rooms")
      .find()
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();
    res.send(rooms);
  } catch (error) {
    res.status(500).send({ message: "Rooms fetch failed" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
