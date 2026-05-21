const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .send({ message: "Unauthorized: Invalid token format" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized: Invalid token" });
  }
};

async function run() {
  try {
    // await client.connect();
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
        const { search, ownerId } = req.query;

        let query = {};

        if (search) {
          query.name = { $regex: search, $options: "i" };
        }

        if (ownerId) {
          query.ownerId = ownerId; // IMPORTANT
        }

        const rooms = await roomsCollection.find(query).toArray();
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

    //middleware
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

    app.delete("/rooms/:id", verifyToken, async (req, res) => {
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

    app.get("/bookings/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingsCollection.find({ userId }).toArray();
      res.send(result);
    });

    app.patch("/bookings/:id/cancel", verifyToken, async (req, res) => {
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

    app.patch("/bookings/:id/confirm", verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "confirmed" } },
      );

      res.send(result);
    });
    // await client.db("admin").command({ ping: 1 });
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
