import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();

/* ===========================
        MIDDLEWARE
=========================== */
app.use(cors());
app.use(express.json());

/* ===========================
        DB CONFIG
=========================== */
const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("MONGO_URI is missing");
}

let client;
let db, Users, Products, Stores, Ratings, Categories, Carts;

async function connectDB() {
  if (client) return client; // 🔁 reuse connection (serverless safe)

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  db = client.db("Producthub");

  Users = db.collection("users");
  Products = db.collection("products");
  Stores = db.collection("stores");
  Ratings = db.collection("ratings");
  Categories = db.collection("categories");
  Carts = db.collection("carts");

  console.log("✅ MongoDB Connected");
  return client;
}

/* ===========================
            ROOT
=========================== */
app.get("/", async (_, res) => {
  try {
    await connectDB();
    res.send({ status: "ok", message: "ProductHub Server is Running" });
  } catch {
    res.status(500).send({ status: "error" });
  }
});

/* ===========================
           PRODUCTS
=========================== */

app.get("/products", async (_, res) => {
  try {
    await connectDB();
    const products = await Products.find().toArray();
    res.send(Array.isArray(products) ? products : []);
  } catch {
    res.send([]);
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    await connectDB();
    const product = await Products.findOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(product || {});
  } catch {
    res.send({});
  }
});

app.post("/products", async (req, res) => {
  try {
    await connectDB();
    const product = {
      ...req.body,
      inStock: true,
      createdAt: new Date(),
    };
    const result = await Products.insertOne(product);
    res.send({ success: true, insertedId: result.insertedId });
  } catch {
    res.status(500).send({ success: false });
  }
});

app.put("/products/:id", async (req, res) => {
  try {
    await connectDB();
    const result = await Products.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.send({ success: result.modifiedCount > 0 });
  } catch {
    res.status(500).send({ success: false });
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    await connectDB();
    const result = await Products.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send({ success: result.deletedCount > 0 });
  } catch {
    res.status(500).send({ success: false });
  }
});

app.get("/products/user/:uid", async (req, res) => {
  try {
    await connectDB();
    const products = await Products.find({
      userId: req.params.uid,
    }).toArray();
    res.send(Array.isArray(products) ? products : []);
  } catch {
    res.send([]);
  }
});

app.patch("/products/toggle/:id", async (req, res) => {
  try {
    await connectDB();
    const product = await Products.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!product) return res.send({ success: false });

    await Products.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { inStock: !product.inStock } }
    );

    res.send({ success: true });
  } catch {
    res.status(500).send({ success: false });
  }
});

/* ===========================
             USERS
=========================== */

app.post("/users", async (req, res) => {
  try {
    await connectDB();
    const result = await Users.insertOne(req.body);
    res.send({ success: true, insertedId: result.insertedId });
  } catch {
    res.status(500).send({ success: false });
  }
});

app.get("/users", async (_, res) => {
  try {
    await connectDB();
    const users = await Users.find().toArray();
    res.send(Array.isArray(users) ? users : []);
  } catch {
    res.send([]);
  }
});

/* ===========================
            RATINGS
=========================== */

app.get("/ratings/product/:id", async (req, res) => {
  try {
    await connectDB();
    const ratings = await Ratings.find({
      productId: req.params.id,
    }).toArray();
    res.send(Array.isArray(ratings) ? ratings : []);
  } catch {
    res.send([]);
  }
});

app.post("/ratings", async (req, res) => {
  try {
    await connectDB();
    await Ratings.insertOne(req.body);
    res.send({ success: true });
  } catch {
    res.status(500).send({ success: false });
  }
});

/* ===========================
          CATEGORIES
=========================== */

app.get("/categories", async (_, res) => {
  try {
    await connectDB();
    const categories = await Categories.find().toArray();
    res.send(Array.isArray(categories) ? categories : []);
  } catch {
    res.send([]);
  }
});

app.post("/categories", async (req, res) => {
  try {
    await connectDB();
    await Categories.insertOne(req.body);
    res.send({ success: true });
  } catch {
    res.status(500).send({ success: false });
  }
});

app.put("/categories/:id", async (req, res) => {
  try {
    await connectDB();
    await Categories.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.send({ success: true });
  } catch {
    res.status(500).send({ success: false });
  }
});

app.delete("/categories/:id", async (req, res) => {
  try {
    await connectDB();
    await Categories.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send({ success: true });
  } catch {
    res.status(500).send({ success: false });
  }
});

/* ===========================
               CART
=========================== */

app.get("/cart/:uid", async (req, res) => {
  try {
    await connectDB();
    const cart = await Carts.findOne({ userId: req.params.uid });
    res.send(cart?.items || []);
  } catch {
    res.send([]);
  }
});

app.post("/cart/add", async (req, res) => {
  try {
    await connectDB();
    const { userId, productId } = req.body;
    if (!userId || !productId)
      return res.status(400).send({ success: false });

    const cart = await Carts.findOne({ userId });

    if (!cart) {
      await Carts.insertOne({
        userId,
        items: [{ productId, qty: 1 }],
      });
    } else {
      const items = [...cart.items];
      const item = items.find((i) => i.productId === productId);
      if (item) item.qty++;
      else items.push({ productId, qty: 1 });

      await Carts.updateOne({ userId }, { $set: { items } });
    }

    res.send({ success: true });
  } catch {
    res.status(500).send({ success: false });
  }
});

/* ===========================
        SELLER DASHBOARD
=========================== */

app.get("/store-dashboard/:uid", async (req, res) => {
  try {
    await connectDB();
    const uid = req.params.uid;

    const totalProducts = await Products.countDocuments({ userId: uid });
    const ratings = await Ratings.find({ sellerId: uid }).toArray();

    res.send({
      totalProducts,
      totalOrders: 0,
      totalEarnings: 0,
      ratings: Array.isArray(ratings) ? ratings : [],
    });
  } catch {
    res.status(500).send({
      totalProducts: 0,
      totalOrders: 0,
      totalEarnings: 0,
      ratings: [],
    });
  }
});

/* ===========================
          EXPORT (IMPORTANT)
=========================== */
export default app;
