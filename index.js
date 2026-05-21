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
    await client.connect();
    const db = client.db("zen-study");
    const roomsCollection = db.collection("rooms");
    const bookingsCollection = db.collection("bookings");

    app.post("/rooms", async (req, res) => {
      try {
        const room = req.body;
        const result = await roomsCollection.insertOne(room);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Room create failed" });
      }
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

    app.get("/rooms/:id", async (req, res) => {
      const { id } = req.params;

      const room = await roomsCollection.findOne({ _id: new ObjectId(id) });
      res.send(room);
    });

    app.patch("/rooms/:id", async (req, res) => {
      const { id } = req.params;
      const room = req.body;
      const result = await roomsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: room },
      );
      res.send(result);
    });

    app.delete("/rooms/:id", async (req, res) => {
      const { id } = req.params;
      const result = await roomsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      try {
        const booking = req.body;
        const result = await bookingsCollection.insertOne(booking);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Booking create failed" });
      }
    });

    app.get("/bookings/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await bookingsCollection.find({ userId }).toArray();
      res.send(result);
    });

    app.patch("/bookings/:id/cancel", async (req, res) => {
      try {
        const { id } = req.params;

        const booking = await bookingsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!booking) {
          return res.status(404).send({ message: "Booking not found" });
        }

        if (booking.status === "cancelled") {
          return res.status(400).send({ message: "Already cancelled" });
        }

        const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "cancelled" } },
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Cancel failed" });
      }
    });

    // Connect the client to the server	(optional starting in v4.7)
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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
